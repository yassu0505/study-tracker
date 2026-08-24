const MAX_BODY_BYTES = 100_000;

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGIN || '').trim();
  const allowOrigin = allowed && origin === allowed ? origin : allowed || 'null';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function validRequest(body) {
  if (!body || typeof body !== 'object') return false;
  if (!body.goal || typeof body.goal.title !== 'string' || typeof body.goal.description !== 'string') return false;
  if (!body.draft || !Array.isArray(body.draft.sessions) || body.draft.sessions.length > 60) return false;
  return body.draft.sessions.every(session =>
    session && typeof session.id === 'string' && typeof session.start === 'string' &&
    ['study', 'review', 'assessment'].includes(session.type)
  );
}

function responseText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  return '';
}

const outputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['coachMessage', 'sessions'],
  properties: {
    coachMessage: { type: 'string', maxLength: 600 },
    sessions: {
      type: 'array',
      maxItems: 60,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'detail'],
        properties: {
          id: { type: 'string', maxLength: 100 },
          title: { type: 'string', maxLength: 100 },
          detail: { type: 'string', maxLength: 300 }
        }
      }
    }
  }
};

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

    if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL || !env.ALLOWED_ORIGIN) {
      return json({ error: 'Server configuration is incomplete' }, 500, cors);
    }
    if (request.headers.get('Origin') !== env.ALLOWED_ORIGIN) {
      return json({ error: 'Origin is not allowed' }, 403, cors);
    }

    const length = Number(request.headers.get('Content-Length') || 0);
    if (length > MAX_BODY_BYTES) return json({ error: 'Request is too large' }, 413, cors);

    let body;
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: 'Request is too large' }, 413, cors);
      body = JSON.parse(raw);
    }
    catch (error) { return json({ error: 'Invalid JSON' }, 400, cors); }
    if (!validRequest(body)) return json({ error: 'Invalid request shape' }, 400, cors);

    const instructions = [
      'あなたは日本語の学習コーチです。',
      '入力済みの日時、セッションID、学習量は変更せず、学習内容だけを具体化してください。',
      '各studyセッションには、教材を進める行動、演習、短い振り返りを無理のない範囲で提案してください。',
      'reviewセッションには、想起練習、間違い直し、遅れの吸収を提案してください。',
      'assessmentセッションには、模試や確認テストと分野別結果の記録を提案してください。',
      '入力にない教材の章名や問題番号を断定しないでください。',
      'coachMessageは簡潔で、期限内に難しい場合は条件変更案を含めてください。'
    ].join('\n');

    let openaiResponse;
    try {
      openaiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL,
          instructions,
          input: JSON.stringify(body),
          store: false,
          text: {
            verbosity: 'low',
            format: {
              type: 'json_schema',
              name: 'study_plan_guidance',
              strict: true,
              schema: outputSchema
            }
          }
        })
      });
    } catch (error) {
      return json({ error: 'AI service is unavailable' }, 502, cors);
    }

    if (!openaiResponse.ok) {
      const requestId = openaiResponse.headers.get('x-request-id');
      return json({ error: 'AI request failed', requestId }, 502, cors);
    }

    try {
      const response = await openaiResponse.json();
      const result = JSON.parse(responseText(response));
      return json(result, 200, cors);
    } catch (error) {
      return json({ error: 'AI returned an invalid response' }, 502, cors);
    }
  }
};
