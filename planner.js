(() => {
  'use strict';

  const STORAGE_KEY = 'studyTrackerActivePlanV1';
  const MATERIALS_KEY = 'studyTrackerMaterialsV1';
  const core = window.StudyPlannerCore;
  const main = document.querySelector('main.app');
  if (!core || !main) return;

  let activePlan = readPlan();
  let importedBusyEvents = activePlan?.input?.busyEvents || [];
  let showAllSessions = false;

  const style = document.createElement('style');
  style.textContent = `
    .pl-card{position:relative;overflow:hidden}.pl-card::before{content:"";position:absolute;inset:0 0 auto 0;height:5px;background:linear-gradient(90deg,#4f7cff,#8b5cf6,#2fb171)}
    .pl-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}.pl-head h2{margin:0 0 5px}.pl-sub{font-size:12px;color:var(--muted);line-height:1.6}.pl-head-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.pl-head-actions button{white-space:nowrap}
    .pl-empty{border:1px dashed #cfd8e8;border-radius:17px;padding:26px;text-align:center;background:linear-gradient(135deg,#f7f9ff,#fbfffd)}.pl-empty-icon{font-size:36px}.pl-empty h3{margin:8px 0 6px;font-size:18px}.pl-empty p{margin:0 auto 17px;max-width:620px;color:var(--muted);font-size:13px;line-height:1.7}
    .pl-status-row{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}.pl-plan-title{font-size:20px;font-weight:850}.pl-goal{color:var(--muted);font-size:13px;margin-top:5px;line-height:1.55}.pl-status{font-size:11px;font-weight:800;border-radius:999px;padding:6px 10px;background:#e9f8f0;color:#1c7d4e}.pl-status.warn{background:#fff2dd;color:#9a5c00}.pl-mode{font-size:11px;color:var(--muted);margin-left:6px}
    .pl-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.pl-summary-item{border:1px solid var(--line);border-radius:14px;padding:12px;background:#fafbfe}.pl-summary-value{font-size:18px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pl-summary-label{font-size:11px;color:var(--muted);margin-top:4px}
    .pl-coach{display:flex;gap:11px;align-items:flex-start;background:var(--primary-soft);border-radius:14px;padding:13px 14px;color:#3156b3;font-size:13px;line-height:1.65}.pl-coach-icon{font-size:20px;flex:0 0 auto}.pl-progress{margin:16px 0 12px}.pl-progress-head{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:var(--muted);margin-bottom:7px}.pl-progress-track{height:10px;background:#edf0f5;border-radius:999px;overflow:hidden}.pl-progress-fill{height:100%;background:linear-gradient(90deg,var(--primary),#2fb171);border-radius:inherit;transition:width .25s}
    .pl-session-list{display:flex;flex-direction:column;gap:8px;margin-top:12px}.pl-session{display:grid;grid-template-columns:auto 92px minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid var(--line);border-radius:14px;padding:11px 13px;background:#fff}.pl-session.completed{background:#f7faf8;opacity:.72}.pl-session.completed .pl-session-title{text-decoration:line-through}.pl-check{width:20px;height:20px;accent-color:var(--success);cursor:pointer}.pl-date{font-size:12px;font-weight:800;line-height:1.45}.pl-date span{display:block;font-size:10px;color:var(--muted);font-weight:600}.pl-session-main{min-width:0}.pl-session-title{font-weight:800;font-size:13px}.pl-session-detail{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}.pl-kind{font-size:10px;border-radius:999px;padding:5px 8px;background:#edf2ff;color:#3e63c5;font-weight:800;white-space:nowrap}.pl-kind.review{background:#f5edff;color:#7949af}.pl-kind.assessment{background:#fff2dd;color:#9a5c00}.pl-more{width:100%;margin-top:9px;background:#f1f4f8;color:var(--text)}
    .pl-dialog{width:min(720px,calc(100% - 28px));max-height:min(90vh,820px);border:0;border-radius:22px;padding:0;background:var(--card);color:var(--text);box-shadow:0 24px 70px rgba(22,32,51,.24)}.pl-dialog::backdrop{background:rgba(18,27,44,.52);backdrop-filter:blur(2px)}.pl-dialog-inner{padding:20px}.pl-dialog-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.pl-dialog-head h3{margin:0;font-size:20px}.pl-dialog-body{margin-top:8px}.pl-close{background:#f1f4f8;color:var(--text);width:40px;height:40px;padding:0;border-radius:50%;font-size:18px}.pl-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pl-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}.pl-weekdays{display:grid;grid-template-columns:repeat(7,1fr);gap:7px}.pl-weekday{position:relative}.pl-weekday input{position:absolute;opacity:0;pointer-events:none}.pl-weekday span{display:grid;place-items:center;min-height:42px;border:1px solid var(--line);border-radius:11px;font-size:12px;font-weight:800;cursor:pointer;background:#fff}.pl-weekday input:checked+span{background:var(--primary-soft);border-color:#b9c8ff;color:#315ec9}.pl-weekday input:focus-visible+span{outline:3px solid rgba(79,124,255,.28);outline-offset:2px}.pl-check-row{display:flex;align-items:center;gap:9px;margin-top:14px;color:var(--text);font-size:13px}.pl-check-row input{width:18px;height:18px;accent-color:var(--primary)}
    .pl-material-box{border:1px solid var(--line);border-radius:14px;padding:10px;background:#fafbfe}.pl-material-choices{display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:230px;overflow:auto}.pl-material-group{grid-column:1/-1;font-size:11px;font-weight:850;color:#506078;padding:6px 3px 0;border-top:1px solid var(--line)}.pl-material-group:first-child{border-top:0;padding-top:1px}.pl-material-choice{position:relative;display:block;margin:0}.pl-material-choice input{position:absolute;opacity:0;pointer-events:none}.pl-material-choice-card{display:block;border:1px solid var(--line);border-radius:12px;padding:10px;background:#fff;cursor:pointer}.pl-material-choice input:checked+.pl-material-choice-card{border-color:#aebfff;background:var(--primary-soft);box-shadow:inset 0 0 0 1px #aebfff}.pl-material-name{font-size:13px;font-weight:800}.pl-material-meta{font-size:10px;color:var(--muted);margin-top:4px;line-height:1.5}.pl-material-empty{font-size:12px;color:var(--warn);padding:8px}.pl-calendar-box{border:1px solid var(--line);border-radius:14px;padding:12px;margin-top:14px;background:#fafbfe}.pl-calendar-head{display:flex;justify-content:space-between;align-items:center;gap:12px}.pl-calendar-head strong{font-size:13px}.pl-file-label{display:inline-flex;align-items:center;background:#f0f4ff;color:#3c63c9;border-radius:10px;padding:8px 11px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap}.pl-file-label input{display:none}.pl-calendar-status{font-size:11px;color:var(--muted);margin-top:7px;line-height:1.5}.pl-form-error{display:none;margin-top:12px;background:#fff0f0;color:#b43131;border-radius:11px;padding:10px 12px;font-size:12px}.pl-form-error.show{display:block}.pl-dialog-actions{display:grid;grid-template-columns:1fr 1.4fr;gap:10px;margin-top:17px}.pl-dialog-actions button{min-height:46px}.pl-field-hint{font-size:10px;color:var(--muted);margin-top:5px;line-height:1.45}
    @media(max-width:700px){.pl-head{flex-direction:column}.pl-head-actions{width:100%;justify-content:stretch}.pl-head-actions button{flex:1}.pl-summary{grid-template-columns:repeat(2,1fr)}.pl-session{grid-template-columns:auto 78px minmax(0,1fr)}.pl-kind{grid-column:3;justify-self:start}.pl-grid-3{grid-template-columns:1fr}.pl-weekdays{grid-template-columns:repeat(4,1fr)}}
    @media(max-width:480px){.pl-grid-2{grid-template-columns:1fr}.pl-material-choices{grid-template-columns:1fr}.pl-session{grid-template-columns:auto minmax(0,1fr)}.pl-date{grid-column:2}.pl-session-main{grid-column:2}.pl-kind{grid-column:2}.pl-dialog-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const section = document.createElement('section');
  section.id = 'plannerSection';
  section.className = 'card pl-card';
  section.innerHTML = `
    <div class="pl-head">
      <div><h2>🤖 学習計画エージェント</h2><div class="pl-sub">目標・現在地・勉強できる時間から、実行可能なスケジュールを作ります。</div></div>
      <div class="pl-head-actions" id="plHeadActions"></div>
    </div>
    <div id="plContent"></div>`;

  const analytics = [...main.querySelectorAll('section.card')].find(card => card.querySelector('.analytics-head'));
  if (analytics) main.insertBefore(section, analytics);
  else main.appendChild(section);

  const dialog = document.createElement('dialog');
  dialog.className = 'pl-dialog';
  dialog.innerHTML = `
    <div class="pl-dialog-inner">
      <div class="pl-dialog-head">
        <div><h3 id="plDialogTitle">学習計画を作成</h3><div class="pl-sub">迷う項目は大まかな値で大丈夫です。あとから再計画できます。</div></div>
        <button type="button" class="pl-close" id="plClose" aria-label="閉じる">×</button>
      </div>
      <div class="pl-dialog-body">
        <div class="pl-grid-2">
          <div><label for="plTitle">計画名</label><input id="plTitle" maxlength="80" placeholder="例：基本情報技術者に合格する" /></div>
          <div><label for="plGoalType">目標の種類</label><select id="plGoalType"><option value="outcome">成果を上げる（スコア・級など）</option><option value="completion">教材を完了する</option></select></div>
        </div>
        <label for="plGoal">達成したいゴール</label><textarea id="plGoal" maxlength="500" placeholder="例：全章を理解し、章末問題を自力で8割解ける状態にする"></textarea>
        <div id="plOutcomeFields" class="pl-grid-3">
          <div><label for="plMetricName">成果指標</label><input id="plMetricName" maxlength="40" placeholder="例：TOEICスコア" /></div>
          <div><label for="plCurrent">現在値</label><input id="plCurrent" type="number" step="0.1" value="0" /></div>
          <div><label for="plTarget">目標値・単位</label><div style="display:grid;grid-template-columns:1fr 70px;gap:6px"><input id="plTarget" type="number" step="0.1" value="800" /><input id="plMetricUnit" maxlength="10" value="点" aria-label="成果指標の単位" /></div></div>
        </div>
        <label>この目標に使う教材</label>
        <div class="pl-material-box"><div id="plMaterialChoices" class="pl-material-choices"></div><div class="pl-field-hint">教材の残量・種類・対応分野・ペースを計画配分に利用します。進捗は「登録教材」から編集できます。</div></div>
        <div class="pl-grid-2">
          <div><label for="plDeadline">期限</label><input id="plDeadline" type="date" /></div>
          <div id="plAssessmentWrap"><label for="plAssessmentEvery">成果を測り直す頻度</label><select id="plAssessmentEvery"><option value="6">6セッションごと</option><option value="10" selected>10セッションごと</option><option value="14">14セッションごと</option></select></div>
        </div>
        <label>勉強できる曜日</label>
        <div class="pl-weekdays" id="plWeekdays">
          <label class="pl-weekday"><input type="checkbox" value="0"><span>日</span></label>
          <label class="pl-weekday"><input type="checkbox" value="1" checked><span>月</span></label>
          <label class="pl-weekday"><input type="checkbox" value="2" checked><span>火</span></label>
          <label class="pl-weekday"><input type="checkbox" value="3" checked><span>水</span></label>
          <label class="pl-weekday"><input type="checkbox" value="4" checked><span>木</span></label>
          <label class="pl-weekday"><input type="checkbox" value="5" checked><span>金</span></label>
          <label class="pl-weekday"><input type="checkbox" value="6"><span>土</span></label>
        </div>
        <div class="pl-grid-3">
          <div><label for="plFrom">開始できる時刻</label><input id="plFrom" type="time" value="19:00" /></div>
          <div><label for="plUntil">終了時刻</label><input id="plUntil" type="time" value="22:00" /></div>
          <div><label for="plSessionMinutes">1回の学習時間</label><select id="plSessionMinutes"><option value="25">25分</option><option value="30">30分</option><option value="45" selected>45分</option><option value="60">60分</option><option value="90">90分</option><option value="120">120分</option></select></div>
        </div>
        <label class="pl-check-row"><input id="plReview" type="checkbox" checked />3回学習するごとに復習・遅れ吸収日を入れる</label>
        <div class="pl-calendar-box">
          <div class="pl-calendar-head"><strong>📅 カレンダー予定を考慮</strong><label class="pl-file-label">予定ファイルを選択<input id="plCalendarFile" type="file" accept=".ics,text/calendar" /></label></div>
          <div class="pl-calendar-status" id="plCalendarStatus">Googleカレンダーなどから書き出した .ics ファイルを読み込むと、重なる予定を避けます。ファイル内容は端末内だけで処理します。</div>
        </div>
        <div class="pl-form-error" id="plFormError"></div>
        <div class="pl-dialog-actions"><button type="button" class="secondary" id="plCancel">キャンセル</button><button type="button" class="primary" id="plGenerate">計画を生成</button></div>
      </div>
    </div>`;
  document.body.appendChild(dialog);

  const $ = id => document.getElementById(id);
  const content = $('plContent');
  const headActions = $('plHeadActions');

  function makeId() {
    try { if (crypto?.randomUUID) return crypto.randomUUID(); } catch (error) {}
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function readPlan() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return parsed && Array.isArray(parsed.sessions) ? parsed : null;
    } catch (error) { return null; }
  }

  function savePlan(plan) {
    activePlan = plan;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    window.dispatchEvent(new CustomEvent('study-planner:updated', { detail: plan }));
  }

  function readMaterials() {
    try {
      const parsed = JSON.parse(localStorage.getItem(MATERIALS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(material => material?.id && material?.name).map(material => ({
        ...material,
        category:material.category||'',
        materialType:material.materialType||'',
        currentAmount:Math.max(0,Number(material.currentAmount)||0),
        totalAmount:Math.max(0,Number(material.totalAmount)||0),
        progressUnit:material.progressUnit||'ページ',
        pacePerHour:Math.max(0,Number(material.pacePerHour)||0),
        skills:Array.isArray(material.skills)?material.skills.filter(Boolean):[]
      })) : [];
    } catch (error) { return []; }
  }

  function todayKey() {
    return core.dateKey(new Date());
  }

  function defaultDeadline() {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return core.dateKey(date);
  }

  function formatDate(iso) {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(date);
  }

  function formatTime(iso) {
    return new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  }

  function materialName(id) {
    return readMaterials().find(material => material.id === id)?.name || '';
  }

  function renderMaterialOptions(selected = []) {
    const container = $('plMaterialChoices');
    const selectedIds = new Set(Array.isArray(selected) ? selected : [selected].filter(Boolean));
    container.innerHTML = '';
    const materials = readMaterials().sort((a, b) => `${a.category}${a.name}`.localeCompare(`${b.category}${b.name}`, 'ja'));
    if (!materials.length) {
      container.innerHTML = '<div class="pl-material-empty">先に「登録教材」から教材と進捗を登録してください。</div>';
      return;
    }
    let previousGenre=null;
    materials.forEach(material => {
      const genre=material.category||'ジャンルなし';
      if(genre!==previousGenre){
        const heading=document.createElement('div');heading.className='pl-material-group';heading.textContent=genre;container.appendChild(heading);previousGenre=genre;
      }
      const label = document.createElement('label');
      label.className = 'pl-material-choice';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = material.id;
      checkbox.checked = selectedIds.has(material.id);
      const card = document.createElement('span');
      card.className = 'pl-material-choice-card';
      const name = document.createElement('span');
      name.className = 'pl-material-name';
      name.textContent = material.name;
      const meta = document.createElement('span');
      meta.className = 'pl-material-meta';
      const progress = material.totalAmount > 0 ? `${material.currentAmount}/${material.totalAmount}${material.progressUnit}` : '進捗未設定';
      meta.textContent = [material.category,material.materialType,progress,material.skills.slice(0,3).join('・')].filter(Boolean).join('｜');
      card.append(name,meta);
      label.append(checkbox,card);
      container.appendChild(label);
    });
  }

  function openDialog(useExisting) {
    const input = useExisting && activePlan ? activePlan.input : null;
    $('plDialogTitle').textContent = input ? '学習計画を編集' : '学習計画を作成';
    $('plTitle').value = input?.title || '';
    $('plGoal').value = input?.goal || '';
    $('plGoalType').value = input?.goalType || (input ? 'completion' : 'outcome');
    $('plMetricName').value = input?.metricName || (input?.goalType === 'outcome' ? '' : '') || '';
    $('plCurrent').value = input?.metricCurrent ?? input?.current ?? 0;
    $('plTarget').value = input?.metricTarget ?? input?.target ?? 800;
    $('plMetricUnit').value = input?.metricUnit || (input?.unit ? core.unitLabel(input.unit,input.customUnit) : '点');
    $('plDeadline').value = input?.deadline || defaultDeadline();
    $('plAssessmentEvery').value = String(input?.assessmentEvery || 10);
    $('plFrom').value = input?.availableFrom || '19:00';
    $('plUntil').value = input?.availableUntil || '22:00';
    $('plSessionMinutes').value = String(input?.sessionMinutes || 45);
    $('plReview').checked = input?.reviewEnabled !== false;
    const selectedDays = input?.weekdays || [1, 2, 3, 4, 5];
    $('plWeekdays').querySelectorAll('input').forEach(checkbox => { checkbox.checked = selectedDays.includes(Number(checkbox.value)); });
    importedBusyEvents = input?.busyEvents || importedBusyEvents || [];
    renderCalendarStatus(importedBusyEvents.length ? `${importedBusyEvents.length}件の予定を読み込み済みです。` : '');
    toggleGoalType();
    setFormError('');
    renderMaterialOptions(input?.workloads?.map(workload=>workload.id) || input?.materialId || []);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    setTimeout(() => $('plTitle').focus(), 0);
  }

  function closeDialog() {
    if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
  }

  function setFormError(message) {
    const box = $('plFormError');
    box.textContent = message;
    box.classList.toggle('show', Boolean(message));
  }

  function toggleGoalType() {
    const outcome = $('plGoalType').value === 'outcome';
    $('plOutcomeFields').classList.toggle('hidden', !outcome);
    $('plAssessmentWrap').classList.toggle('hidden', !outcome);
  }

  function renderCalendarStatus(message, warning) {
    const status = $('plCalendarStatus');
    status.textContent = message || 'Googleカレンダーなどから書き出した .ics ファイルを読み込むと、重なる予定を避けます。ファイル内容は端末内だけで処理します。';
    status.style.color = warning ? 'var(--warn)' : '';
  }

  function collectInput() {
    const selectedIds = [...$('plMaterialChoices').querySelectorAll('input:checked')].map(input => input.value);
    const selected = readMaterials().filter(material => selectedIds.includes(material.id));
    return {
      title: $('plTitle').value.trim(),
      goal: $('plGoal').value.trim(),
      goalType: $('plGoalType').value,
      metricName: $('plMetricName').value.trim(),
      metricCurrent: Number($('plCurrent').value),
      metricTarget: Number($('plTarget').value),
      metricUnit: $('plMetricUnit').value.trim(),
      assessmentEvery: Number($('plAssessmentEvery').value),
      workloads:selected.map(material=>({
        id:material.id,name:material.name,genre:material.category,materialType:material.materialType,
        current:material.currentAmount,total:material.totalAmount,unit:material.progressUnit,
        pacePerHour:material.pacePerHour,skills:material.skills,priority:1
      })),
      deadline: $('plDeadline').value,
      startDate: todayKey(),
      weekdays: [...$('plWeekdays').querySelectorAll('input:checked')].map(input => Number(input.value)),
      availableFrom: $('plFrom').value,
      availableUntil: $('plUntil').value,
      sessionMinutes: Number($('plSessionMinutes').value),
      reviewEnabled: $('plReview').checked,
      busyEvents: importedBusyEvents
    };
  }

  async function generate() {
    setFormError('');
    const button = $('plGenerate');
    button.disabled = true;
    button.textContent = '計画を生成中…';
    try {
      const result = core.generatePortfolioPlan(collectInput());
      const plan = {
        ...result,
        id: activePlan?.id || makeId(),
        createdAt: activePlan?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aiStatus: 'local'
      };
      await enrichWithAi(plan);
      savePlan(plan);
      closeDialog();
      showAllSessions = false;
      render();
    } catch (error) {
      setFormError(error?.message || '計画を作成できませんでした。');
    } finally {
      button.disabled = false;
      button.textContent = '計画を生成';
    }
  }

  async function enrichWithAi(plan) {
    const endpoint = String(window.STUDY_AGENT_ENDPOINT || '').trim();
    if (!endpoint) return;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: {
            title: plan.input.title,
            material: (plan.input.workloads || []).map(workload=>workload.name).join('、'),
            description: plan.input.goal,
            current: plan.input.metricCurrent,
            target: plan.input.metricTarget,
            unit: plan.input.metricUnit,
            deadline: plan.input.deadline
          },
          draft: {
            feasible: plan.feasible,
            predictedCompletion: plan.predictedCompletion,
            sessions: plan.sessions.slice(0, 60).map(session => ({ id: session.id, start: session.start, type: session.type, amount: session.amount, material:session.materialName||'' }))
          }
        })
      });
      if (!response.ok) throw new Error(`AI endpoint: ${response.status}`);
      const data = await response.json();
      if (typeof data.coachMessage === 'string' && data.coachMessage.trim()) plan.coachMessage = data.coachMessage.trim().slice(0, 600);
      if (Array.isArray(data.sessions)) {
        const guidance = new Map(data.sessions.map(item => [item?.id, item]));
        plan.sessions.forEach(session => {
          const item = guidance.get(session.id);
          if (typeof item?.title === 'string' && item.title.trim()) session.title = item.title.trim().slice(0, 100);
          if (typeof item?.detail === 'string' && item.detail.trim()) session.detail = item.detail.trim().slice(0, 300);
        });
      }
      plan.aiStatus = 'enriched';
    } catch (error) {
      plan.aiStatus = 'fallback';
      plan.aiError = 'AI補助に接続できなかったため、端末内の計画エンジンで作成しました。';
    }
  }

  function renderEmpty() {
    headActions.innerHTML = '';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary';
    button.textContent = '＋ 最初の計画を作る';
    button.addEventListener('click', () => openDialog(false));
    headActions.appendChild(button);
    content.innerHTML = `<div class="pl-empty"><div class="pl-empty-icon">🧭</div><h3>ゴールから逆算して、次にやることを決めよう</h3><p>勉強できない曜日や既存の予定を避けながら、教材の残りを無理のないセッションへ分割します。</p></div>`;
  }

  function render() {
    activePlan = readPlan();
    if (!activePlan) {
      renderEmpty();
      return;
    }

    headActions.innerHTML = '';
    [
      ['予定を書き出す', exportCalendar, 'secondary'],
      ['再計画', replan, 'secondary'],
      ['条件を編集', () => openDialog(true), 'primary']
    ].forEach(([label, handler, className]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.textContent = label;
      button.addEventListener('click', handler);
      headActions.appendChild(button);
    });

    content.innerHTML = '';
    const wrapper = document.createElement('div');
    const completed = activePlan.sessions.filter(session => session.completed).length;
    const total = activePlan.sessions.length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    const studySessions = activePlan.sessions.filter(session => session.type === 'study').length;
    const next = activePlan.sessions.find(session => !session.completed && new Date(session.end) >= new Date());

    const statusRow = document.createElement('div');
    statusRow.className = 'pl-status-row';
    const titleBox = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'pl-plan-title';
    title.textContent = activePlan.input.title;
    const goal = document.createElement('div');
    goal.className = 'pl-goal';
    const materialNames=(activePlan.input.workloads||[]).map(workload=>workload.name).join('・')||activePlan.input.materialName||'';
    goal.textContent = [materialNames, activePlan.input.goal].filter(Boolean).join('｜');
    titleBox.append(title, goal);
    const statusBox = document.createElement('div');
    const status = document.createElement('span');
    const outcomeGoal=activePlan.input.goalType==='outcome'||activePlan.goalType==='outcome';
    status.className = `pl-status${activePlan.feasible === false ? ' warn' : ''}`;
    status.textContent = outcomeGoal ? '測定しながら改善' : activePlan.feasible === false ? '時間が不足' : activePlan.feasible === null ? '実績から判定' : '期限内に完了可能';
    const mode = document.createElement('span');
    mode.className = 'pl-mode';
    mode.textContent = activePlan.aiStatus === 'enriched' ? 'AI補助済み' : 'ローカル計画';
    statusBox.append(status, mode);
    statusRow.append(titleBox, statusBox);

    const summary = document.createElement('div');
    summary.className = 'pl-summary';
    const metricSummary=outcomeGoal?`${activePlan.input.metricCurrent}${activePlan.input.metricUnit||''} → ${activePlan.input.metricTarget}${activePlan.input.metricUnit||''}`:`${studySessions}回`;
    const summaryValues = [
      [metricSummary, outcomeGoal?'成果指標':'学習セッション'],
      [outcomeGoal?`${(activePlan.input.workloads||[]).length}教材`:activePlan.predictedCompletion ? activePlan.predictedCompletion.replaceAll('-', '/') : '—', outcomeGoal?'使用する教材':'完了予定日'],
      [next ? formatDate(next.start) : '—', '次の学習日'],
      [`${completed}/${total}`, '完了した予定']
    ];
    summaryValues.forEach(([value, label]) => {
      const item = document.createElement('div');
      item.className = 'pl-summary-item';
      const valueEl = document.createElement('div');
      valueEl.className = 'pl-summary-value';
      valueEl.textContent = value;
      const labelEl = document.createElement('div');
      labelEl.className = 'pl-summary-label';
      labelEl.textContent = label;
      item.append(valueEl, labelEl);
      summary.appendChild(item);
    });

    const coach = document.createElement('div');
    coach.className = 'pl-coach';
    const coachIcon = document.createElement('span');
    coachIcon.className = 'pl-coach-icon';
    coachIcon.textContent = '💡';
    const coachText = document.createElement('span');
    coachText.textContent = [activePlan.aiError, activePlan.coachMessage].filter(Boolean).join(' ');
    coach.append(coachIcon, coachText);

    const progress = document.createElement('div');
    progress.className = 'pl-progress';
    progress.innerHTML = `<div class="pl-progress-head"><span>計画の進捗</span><strong>${percent}%</strong></div><div class="pl-progress-track"><div class="pl-progress-fill" style="width:${percent}%"></div></div>`;

    const list = document.createElement('div');
    list.className = 'pl-session-list';
    const visible = showAllSessions ? activePlan.sessions : activePlan.sessions.slice(0, 12);
    visible.forEach(session => list.appendChild(createSessionRow(session)));

    wrapper.append(statusRow, summary, coach, progress, list);
    if (activePlan.sessions.length > 12) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'pl-more';
      more.textContent = showAllSessions ? '折りたたむ' : `残り${activePlan.sessions.length - 12}件を表示`;
      more.addEventListener('click', () => { showAllSessions = !showAllSessions; render(); });
      wrapper.appendChild(more);
    }

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'danger';
    deleteButton.style.marginTop = '14px';
    deleteButton.textContent = 'この計画を削除';
    deleteButton.addEventListener('click', deletePlan);
    wrapper.appendChild(deleteButton);
    content.appendChild(wrapper);
  }

  function createSessionRow(session) {
    const row = document.createElement('div');
    row.className = `pl-session${session.completed ? ' completed' : ''}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'pl-check';
    checkbox.checked = Boolean(session.completed);
    checkbox.setAttribute('aria-label', `${session.title}を完了`);
    checkbox.addEventListener('change', () => {
      const target = activePlan.sessions.find(item => item.id === session.id);
      if (target) {
        applyMaterialProgress(target,checkbox.checked);
        target.completed = checkbox.checked;
      }
      activePlan.updatedAt = new Date().toISOString();
      savePlan(activePlan);
      render();
    });
    const date = document.createElement('div');
    date.className = 'pl-date';
    date.textContent = formatDate(session.start);
    const time = document.createElement('span');
    time.textContent = `${formatTime(session.start)}–${formatTime(session.end)}`;
    date.appendChild(time);
    const sessionMain = document.createElement('div');
    sessionMain.className = 'pl-session-main';
    const sessionTitle = document.createElement('div');
    sessionTitle.className = 'pl-session-title';
    sessionTitle.textContent = session.title;
    const detail = document.createElement('div');
    detail.className = 'pl-session-detail';
    detail.textContent = session.detail;
    sessionMain.append(sessionTitle, detail);
    const kind = document.createElement('span');
    kind.className = `pl-kind${session.type === 'review' ? ' review' : session.type === 'assessment' ? ' assessment' : ''}`;
    kind.textContent = session.type === 'review' ? '復習' : session.type === 'assessment' ? '測定' : '学習';
    row.append(checkbox, date, sessionMain, kind);
    return row;
  }

  function replan() {
    if(activePlan.version>=2||activePlan.input?.workloads){
      const materialMap=new Map(readMaterials().map(material=>[material.id,material]));
      const workloads=(activePlan.input.workloads||[]).map(old=>{
        const material=materialMap.get(old.id);if(!material)return null;
        return {id:material.id,name:material.name,genre:material.category,materialType:material.materialType,current:material.currentAmount,total:material.totalAmount,unit:material.progressUnit,pacePerHour:material.pacePerHour,skills:material.skills,priority:old.priority||1};
      }).filter(Boolean);
      try{
        const result=core.generatePortfolioPlan({...activePlan.input,workloads,startDate:todayKey(),busyEvents:activePlan.input.busyEvents||[]});
        savePlan({...result,id:activePlan.id,createdAt:activePlan.createdAt,updatedAt:new Date().toISOString(),aiStatus:'local'});
        showAllSessions=false;render();
      }catch(error){alert(error?.message||'再計画できませんでした。');}
      return;
    }
    const completedStudy = activePlan.sessions
      .filter(session => session.completed && session.type === 'study')
      .reduce((sum, session) => sum + (Number(session.amount) || 0), 0);
    const input = {
      ...activePlan.input,
      current: Math.min(activePlan.input.target, Number(activePlan.input.current) + completedStudy),
      startDate: todayKey(),
      busyEvents: activePlan.input.busyEvents || []
    };
    if (input.current >= input.target) {
      alert('目標量まで完了しています。おめでとうございます！');
      return;
    }
    try {
      const result = core.generatePlan(input);
      savePlan({
        ...result,
        id: activePlan.id,
        createdAt: activePlan.createdAt,
        updatedAt: new Date().toISOString(),
        aiStatus: 'local'
      });
      showAllSessions = false;
      render();
    } catch (error) {
      alert(error?.message || '再計画できませんでした。');
    }
  }

  function applyMaterialProgress(session,completed){
    if(!session.materialId||!(Number(session.amount)>0))return;
    if(completed&&session.progressApplied)return;
    if(!completed&&!session.progressApplied)return;
    const materials=readMaterials();
    const material=materials.find(item=>item.id===session.materialId);
    if(!material)return;
    const delta=Number(session.amount)*(completed?1:-1);
    material.currentAmount=Math.max(0,material.totalAmount>0?Math.min(material.totalAmount,material.currentAmount+delta):material.currentAmount+delta);
    session.progressApplied=completed;
    localStorage.setItem(MATERIALS_KEY,JSON.stringify(materials));
    window.dispatchEvent(new CustomEvent('study-materials:updated'));
  }

  function deletePlan() {
    if (!confirm(`「${activePlan.input.title}」を削除しますか？`)) return;
    localStorage.removeItem(STORAGE_KEY);
    activePlan = null;
    importedBusyEvents = [];
    render();
  }

  function icsEscape(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function icsDate(value) {
    const date = new Date(value);
    return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}${String(date.getUTCMinutes()).padStart(2, '0')}${String(date.getUTCSeconds()).padStart(2, '0')}Z`;
  }

  function exportCalendar() {
    const stamp = icsDate(new Date());
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Study Tracker//Learning Plan//JA', 'CALSCALE:GREGORIAN'];
    activePlan.sessions.forEach(session => {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${icsEscape(activePlan.id)}-${icsEscape(session.id)}@study-tracker`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${icsDate(session.start)}`,
        `DTEND:${icsDate(session.end)}`,
        `SUMMARY:${icsEscape(`学習：${session.title}`)}`,
        `DESCRIPTION:${icsEscape(session.detail)}`,
        'END:VEVENT'
      );
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([`${lines.join('\r\n')}\r\n`], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activePlan.input.title.replace(/[\\/:*?"<>|]/g, '_') || 'study-plan'}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  $('plCalendarFile').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = core.parseIcs(await file.text());
      const horizonStart = new Date();
      horizonStart.setDate(horizonStart.getDate() - 1);
      const horizonEnd = core.parseDateKey($('plDeadline').value || defaultDeadline()) || new Date();
      horizonEnd.setDate(horizonEnd.getDate() + 1);
      const relevant = parsed.events.filter(item => item.end >= horizonStart && item.start <= horizonEnd);
      importedBusyEvents = relevant.slice(0, 2000).map(item => ({ start: item.start.toISOString(), end: item.end.toISOString(), summary: item.summary }));
      const limitWarning = relevant.length > importedBusyEvents.length ? '対象期間の予定が多いため、先頭2000件を使用します。' : '';
      const warning = [...parsed.warnings, limitWarning].filter(Boolean).join(' ');
      renderCalendarStatus(`${importedBusyEvents.length}件の予定を読み込みました。${warning ? ` ${warning}` : ''}`, Boolean(warning));
    } catch (error) {
      importedBusyEvents = [];
      renderCalendarStatus('予定ファイルを読み込めませんでした。別の .ics ファイルを試してください。', true);
    }
  });

  $('plGoalType').addEventListener('change', toggleGoalType);
  $('plClose').addEventListener('click', closeDialog);
  $('plCancel').addEventListener('click', closeDialog);
  $('plGenerate').addEventListener('click', generate);
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });
  window.addEventListener('storage', event => { if (event.key === STORAGE_KEY || event.key === MATERIALS_KEY) render(); });

  render();
})();
