(() => {
  'use strict';

  const DAY_MS = 24 * 60 * 60 * 1000;
  const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function parseDateKey(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (
      date.getFullYear() !== Number(match[1]) ||
      date.getMonth() !== Number(match[2]) - 1 ||
      date.getDate() !== Number(match[3])
    ) return null;
    return date;
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function addDays(date, amount) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
  }

  function parseTime(value) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  function atMinutes(day, minutes) {
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60, 0, 0);
  }

  function roundToFiveMinutes(date) {
    const rounded = new Date(date);
    rounded.setSeconds(0, 0);
    const remainder = rounded.getMinutes() % 5;
    if (remainder) rounded.setMinutes(rounded.getMinutes() + (5 - remainder));
    return rounded;
  }

  function overlaps(startA, endA, startB, endB) {
    return startA < endB && startB < endA;
  }

  function normalizeBusyEvents(events) {
    return (Array.isArray(events) ? events : []).map(event => {
      const start = event?.start instanceof Date ? event.start : new Date(event?.start);
      const end = event?.end instanceof Date ? event.end : new Date(event?.end);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
      return { start, end, summary: String(event?.summary || '予定') };
    }).filter(Boolean);
  }

  function findAvailableSlot(day, fromMinutes, untilMinutes, durationMinutes, busyEvents, now) {
    const windowStart = atMinutes(day, fromMinutes);
    const windowEnd = atMinutes(day, untilMinutes);
    let cursor = windowStart;

    if (dateKey(day) === dateKey(now) && now > cursor) cursor = roundToFiveMinutes(now);
    if (cursor >= windowEnd) return null;

    const relevant = busyEvents
      .filter(event => overlaps(windowStart, windowEnd, event.start, event.end))
      .sort((a, b) => a.start - b.start);

    for (const event of relevant) {
      if (cursor.getTime() + durationMinutes * 60000 <= event.start.getTime()) break;
      if (event.end > cursor) cursor = new Date(event.end);
      if (cursor >= windowEnd) return null;
    }

    const end = new Date(cursor.getTime() + durationMinutes * 60000);
    return end <= windowEnd ? { start: cursor, end } : null;
  }

  function distributeAmount(total, count, integerUnit) {
    if (count <= 0) return [];
    if (!integerUnit) {
      let used = 0;
      return Array.from({ length: count }, (_, index) => {
        const amount = index === count - 1 ? total - used : Math.round((total / count) * 10) / 10;
        used += amount;
        return Math.max(0, Math.round(amount * 10) / 10);
      });
    }

    const roundedTotal = Math.max(0, Math.ceil(total));
    const base = Math.floor(roundedTotal / count);
    const remainder = roundedTotal % count;
    return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
  }

  function unitLabel(unit, customUnit) {
    if (unit === 'pages') return 'ページ';
    if (unit === 'sections') return 'セクション';
    if (unit === 'minutes') return '分';
    return String(customUnit || '単位').trim() || '単位';
  }

  function amountText(amount, unit, customUnit) {
    const value = Number.isInteger(amount) ? amount : Number(amount.toFixed(1));
    return `${value}${unitLabel(unit, customUnit)}`;
  }

  function buildCoachMessage(result) {
    const learningCount = result.sessions.filter(session => session.type === 'study').length;
    const reviewCount = result.sessions.length - learningCount;
    const completion = result.predictedCompletion
      ? `${result.predictedCompletion.slice(5).replace('-', '/')}に完了予定です。`
      : '完了予定日を算出できませんでした。';
    const review = reviewCount ? `途中に${reviewCount}回の復習を入れています。` : '';
    const feasibility = result.feasible
      ? '現在の空き時間で期限内に収まります。'
      : `期限までに約${Math.max(0, result.shortageMinutes)}分の学習枠が不足しています。曜日か時間帯を増やしてください。`;
    return `${learningCount}回の学習セッションを作成し、${completion}${review}${feasibility}`;
  }

  function scheduleContext(input) {
    const now = input.now instanceof Date ? new Date(input.now) : new Date(input.now || Date.now());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = parseDateKey(input.startDate) || today;
    const deadline = parseDateKey(input.deadline);
    if (!deadline) throw new Error('期限を入力してください。');
    if (deadline < start) throw new Error('期限は開始日以降にしてください。');
    if ((deadline - start) / DAY_MS > 730) throw new Error('計画期間は2年以内にしてください。');

    const title = String(input.title || '').trim();
    const goal = String(input.goal || '').trim();
    if (!title) throw new Error('計画名を入力してください。');
    if (!goal) throw new Error('達成したいゴールを入力してください。');

    const weekdays = [...new Set((Array.isArray(input.weekdays) ? input.weekdays : []).map(Number))]
      .filter(day => Number.isInteger(day) && day >= 0 && day <= 6);
    if (!weekdays.length) throw new Error('勉強できる曜日を1つ以上選んでください。');
    const availableFrom = parseTime(input.availableFrom);
    const availableUntil = parseTime(input.availableUntil);
    if (availableFrom === null || availableUntil === null || availableUntil <= availableFrom) {
      throw new Error('学習可能な時間帯を正しく入力してください。');
    }
    const sessionMinutes = Math.round(clampNumber(input.sessionMinutes, 10, 480, 45));
    if (availableUntil - availableFrom < sessionMinutes) {
      throw new Error('1回の学習時間が、学習可能な時間帯より長くなっています。');
    }

    const busyEvents = normalizeBusyEvents(input.busyEvents);
    const candidates = [];
    for (let day = new Date(start); day <= deadline; day = addDays(day, 1)) {
      if (!weekdays.includes(day.getDay())) continue;
      const slot = findAvailableSlot(day, availableFrom, availableUntil, sessionMinutes, busyEvents, now);
      if (slot) candidates.push(slot);
    }
    if (!candidates.length) throw new Error('条件に合う学習時間がありません。曜日・時間帯・カレンダー予定を見直してください。');

    return { now, start, deadline, title, goal, weekdays, availableFrom, availableUntil, sessionMinutes, busyEvents, candidates };
  }

  function normalizeWorkloads(values) {
    return (Array.isArray(values) ? values : []).map(value => {
      const total = clampNumber(value?.total, 0, 10000000, 0);
      const current = clampNumber(value?.current, 0, total || 10000000, 0);
      const remaining = total > 0 ? Math.max(0, total - current) : 0;
      return {
        id: String(value?.id || ''),
        name: String(value?.name || '').trim(),
        genre: String(value?.genre || '').trim(),
        materialType: String(value?.materialType || '').trim(),
        unit: String(value?.unit || '単位').trim() || '単位',
        current,
        total,
        remaining,
        pacePerHour: clampNumber(value?.pacePerHour, 0, 1000000, 0),
        skills: Array.isArray(value?.skills) ? value.skills.map(String).filter(Boolean).slice(0, 20) : [],
        priority: clampNumber(value?.priority, 0.2, 5, 1)
      };
    }).filter(value => value.id && value.name && (value.total === 0 || value.remaining > 0));
  }

  function assignWorkloads(studySlots, workloads, sessionMinutes) {
    const assignmentCounts = new Map(workloads.map(workload => [workload.id, 0]));
    const weights = new Map(workloads.map(workload => {
      const estimatedMinutes = workload.remaining > 0 && workload.pacePerHour > 0
        ? workload.remaining / workload.pacePerHour * 60
        : workload.remaining || sessionMinutes;
      return [workload.id, Math.max(1, estimatedMinutes * workload.priority)];
    }));

    const assignments = studySlots.map(() => {
      const selected = workloads.reduce((best, workload) => {
        if (!best) return workload;
        const score = (assignmentCounts.get(workload.id) + 1) / weights.get(workload.id);
        const bestScore = (assignmentCounts.get(best.id) + 1) / weights.get(best.id);
        return score < bestScore ? workload : best;
      }, null);
      assignmentCounts.set(selected.id, assignmentCounts.get(selected.id) + 1);
      return selected;
    });

    const amounts = new Map();
    workloads.forEach(workload => {
      const count = assignmentCounts.get(workload.id);
      if (!count) return;
      const integerUnit = ['ページ', '章', 'セクション', '語', '問', '回', '分'].includes(workload.unit);
      const capacity = workload.pacePerHour > 0 ? workload.pacePerHour * sessionMinutes / 60 * count : workload.remaining;
      const planned = workload.remaining > 0 ? Math.min(workload.remaining, capacity || workload.remaining) : 0;
      amounts.set(workload.id, distributeAmount(planned, count, integerUnit));
    });

    const used = new Map(workloads.map(workload => [workload.id, 0]));
    return assignments.map(workload => {
      const index = used.get(workload.id);
      used.set(workload.id, index + 1);
      return { workload, amount: amounts.get(workload.id)?.[index] || 0 };
    });
  }

  function generatePortfolioPlan(rawInput) {
    const input = rawInput || {};
    const context = scheduleContext(input);
    const goalType = input.goalType === 'completion' ? 'completion' : 'outcome';
    const metricName = String(input.metricName || (goalType === 'outcome' ? '成果指標' : '教材完了')).trim();
    const metricUnit = String(input.metricUnit || '').trim();
    const metricCurrent = clampNumber(input.metricCurrent, -10000000, 10000000, 0);
    const metricTarget = clampNumber(input.metricTarget, -10000000, 10000000, 0);
    if (goalType === 'outcome' && (!metricName || metricTarget <= metricCurrent)) {
      throw new Error('成果指標の現在値と目標値を正しく入力してください。');
    }

    const workloads = normalizeWorkloads(input.workloads);
    if (!workloads.length) throw new Error('進捗を設定した教材を1つ以上選んでください。');

    const reviewEnabled = input.reviewEnabled !== false;
    const assessmentEvery = goalType === 'outcome' ? Math.round(clampNumber(input.assessmentEvery, 4, 30, 10)) : 0;
    const typedCandidates = context.candidates.map((slot, index) => {
      if (assessmentEvery && (index + 1) % assessmentEvery === 0) return { ...slot, type: 'assessment' };
      if (reviewEnabled && (index + 1) % 4 === 0) return { ...slot, type: 'review' };
      return { ...slot, type: 'study' };
    });
    const allStudySlots = typedCandidates.filter(slot => slot.type === 'study');
    if (!allStudySlots.length) throw new Error('教材学習に使える時間がありません。条件を見直してください。');

    const allPaced = workloads.every(workload => workload.total > 0 && workload.pacePerHour > 0);
    const requiredMinutes = allPaced
      ? Math.ceil(workloads.reduce((sum, workload) => sum + workload.remaining / workload.pacePerHour * 60, 0))
      : null;
    const availableLearningMinutes = allStudySlots.length * context.sessionMinutes;
    const feasible = goalType === 'outcome' || requiredMinutes === null ? null : requiredMinutes <= availableLearningMinutes;
    const neededStudyCount = goalType === 'completion' && requiredMinutes !== null
      ? Math.max(1, Math.min(allStudySlots.length, Math.ceil(requiredMinutes / context.sessionMinutes)))
      : allStudySlots.length;

    let seenStudy = 0;
    let lastIndex = typedCandidates.length - 1;
    if (goalType === 'completion' && neededStudyCount < allStudySlots.length) {
      for (let index = 0; index < typedCandidates.length; index += 1) {
        if (typedCandidates[index].type === 'study') seenStudy += 1;
        if (seenStudy === neededStudyCount) { lastIndex = index; break; }
      }
    }
    const usedCandidates = typedCandidates.slice(0, lastIndex + 1);
    const assignments = assignWorkloads(usedCandidates.filter(slot => slot.type === 'study'), workloads, context.sessionMinutes);
    let assignmentIndex = 0;
    const sessions = usedCandidates.map((slot, index) => {
      const base = {
        id: `${dateKey(slot.start)}-${slot.type}-${index}`,
        type: slot.type,
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        amount: 0,
        completed: false
      };
      if (slot.type === 'assessment') return {
        ...base,
        title: `${metricName}を測定する`,
        detail: `模試・確認テストを行い、${metricName}の変化と分野別の弱点を記録する`
      };
      if (slot.type === 'review') return {
        ...base,
        title: '復習・遅れの吸収',
        detail: '直近の教材で間違えた箇所を復習し、未完了があればこの時間で補う'
      };
      const assignment = assignments[assignmentIndex++];
      const amount = assignment.amount;
      const workload = assignment.workload;
      return {
        ...base,
        materialId: workload.id,
        materialName: workload.name,
        materialType: workload.materialType,
        skills: workload.skills,
        amount,
        unit: workload.unit,
        title: amount > 0 ? `${workload.name}を${Number.isInteger(amount) ? amount : Number(amount.toFixed(1))}${workload.unit}進める` : `${workload.name}に取り組む`,
        detail: workload.skills.length ? `重点分野：${workload.skills.join('・')}` : context.goal
      };
    });

    const predictedCompletion = goalType === 'completion' && feasible === true && sessions.length
      ? dateKey(new Date(sessions[sessions.length - 1].start))
      : null;
    const assessmentCount = sessions.filter(session => session.type === 'assessment').length;
    const studyCount = sessions.filter(session => session.type === 'study').length;
    const coachMessage = goalType === 'outcome'
      ? `${metricName}${metricCurrent}${metricUnit}から${metricTarget}${metricUnit}を目指し、${workloads.length}教材へ${studyCount}回の学習枠を配分しました。成果値そのものは日割りせず、${assessmentCount || 1}回の測定結果から教材配分を見直します。`
      : `${workloads.length}教材の残りを${studyCount}回へ配分しました。${requiredMinutes === null ? 'ペース未設定の教材があるため、完了可能性は実績を記録しながら更新します。' : feasible ? `${predictedCompletion}に完了予定です。` : `期限までに約${Math.max(0,requiredMinutes-availableLearningMinutes)}分不足しています。`}`;

    return {
      version: 2,
      goalType,
      input: {
        ...input,
        now: undefined,
        title: context.title,
        goal: context.goal,
        goalType,
        metricName,
        metricUnit,
        metricCurrent,
        metricTarget,
        weekdays: context.weekdays,
        sessionMinutes: context.sessionMinutes,
        workloads,
        busyEvents: context.busyEvents.map(event => ({ start:event.start.toISOString(), end:event.end.toISOString(), summary:event.summary }))
      },
      sessions,
      feasible,
      requiredMinutes,
      availableLearningMinutes,
      shortageMinutes: requiredMinutes === null ? 0 : Math.max(0,requiredMinutes-availableLearningMinutes),
      predictedCompletion,
      coachMessage,
      generatedAt: new Date().toISOString()
    };
  }

  function generatePlan(rawInput) {
    const input = rawInput || {};
    const now = input.now instanceof Date ? new Date(input.now) : new Date(input.now || Date.now());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = parseDateKey(input.startDate) || today;
    const deadline = parseDateKey(input.deadline);
    if (!deadline) throw new Error('期限を入力してください。');
    if (deadline < start) throw new Error('期限は開始日以降にしてください。');
    if ((deadline - start) / DAY_MS > 730) throw new Error('計画期間は2年以内にしてください。');

    const title = String(input.title || '').trim();
    const goal = String(input.goal || '').trim();
    if (!title) throw new Error('計画名を入力してください。');
    if (!goal) throw new Error('達成したいゴールを入力してください。');

    const current = clampNumber(input.current, 0, 10000000, 0);
    const target = clampNumber(input.target, 0, 10000000, 0);
    if (target <= current) throw new Error('目標量は現在地より大きくしてください。');
    const remaining = target - current;

    const weekdays = [...new Set((Array.isArray(input.weekdays) ? input.weekdays : []).map(Number))]
      .filter(day => Number.isInteger(day) && day >= 0 && day <= 6);
    if (!weekdays.length) throw new Error('勉強できる曜日を1つ以上選んでください。');

    const availableFrom = parseTime(input.availableFrom);
    const availableUntil = parseTime(input.availableUntil);
    if (availableFrom === null || availableUntil === null || availableUntil <= availableFrom) {
      throw new Error('学習可能な時間帯を正しく入力してください。');
    }

    const sessionMinutes = Math.round(clampNumber(input.sessionMinutes, 10, 480, 45));
    if (availableUntil - availableFrom < sessionMinutes) {
      throw new Error('1回の学習時間が、学習可能な時間帯より長くなっています。');
    }

    const unit = ['pages', 'sections', 'minutes', 'custom'].includes(input.unit) ? input.unit : 'pages';
    const integerUnit = unit === 'pages' || unit === 'sections' || unit === 'minutes';
    const pacePerHour = clampNumber(input.pacePerHour, 0, 1000000, 0);
    const busyEvents = normalizeBusyEvents(input.busyEvents);
    const candidates = [];

    for (let day = new Date(start); day <= deadline; day = addDays(day, 1)) {
      if (!weekdays.includes(day.getDay())) continue;
      const slot = findAvailableSlot(day, availableFrom, availableUntil, sessionMinutes, busyEvents, now);
      if (slot) candidates.push(slot);
    }

    if (!candidates.length) throw new Error('条件に合う学習時間がありません。曜日・時間帯・カレンダー予定を見直してください。');

    const reviewEnabled = input.reviewEnabled !== false;
    const typedCandidates = candidates.map((slot, index) => ({
      ...slot,
      type: reviewEnabled && (index + 1) % 4 === 0 ? 'review' : 'study'
    }));
    let learningCandidates = typedCandidates.filter(slot => slot.type === 'study');
    if (!learningCandidates.length) learningCandidates = typedCandidates;

    const capacityPerSession = unit === 'minutes'
      ? sessionMinutes
      : pacePerHour > 0 ? pacePerHour * sessionMinutes / 60 : null;
    let requiredLearningSessions = learningCandidates.length;
    if (capacityPerSession) requiredLearningSessions = Math.ceil(remaining / capacityPerSession);
    else if (integerUnit) requiredLearningSessions = Math.min(learningCandidates.length, Math.ceil(remaining));
    requiredLearningSessions = Math.max(1, requiredLearningSessions);

    const usedLearningSessions = Math.min(requiredLearningSessions, learningCandidates.length);
    let seenLearning = 0;
    let lastUsedIndex = typedCandidates.length - 1;
    for (let index = 0; index < typedCandidates.length; index += 1) {
      if (typedCandidates[index].type === 'study') seenLearning += 1;
      if (seenLearning === usedLearningSessions) {
        lastUsedIndex = index;
        break;
      }
    }
    const usedCandidates = typedCandidates.slice(0, lastUsedIndex + 1);
    const studySlots = usedCandidates.filter(slot => slot.type === 'study');
    const requiredMinutes = unit === 'minutes'
      ? remaining
      : pacePerHour > 0 ? Math.ceil((remaining / pacePerHour) * 60) : null;
    const availableLearningMinutes = learningCandidates.length * sessionMinutes;
    const feasible = requiredMinutes === null || requiredMinutes <= availableLearningMinutes;
    const plannedAmount = feasible || !capacityPerSession
      ? remaining
      : Math.min(remaining, capacityPerSession * studySlots.length);
    const amounts = distributeAmount(plannedAmount, studySlots.length, integerUnit);
    let amountIndex = 0;

    const sessions = usedCandidates.map((slot, index) => {
      const startIso = slot.start.toISOString();
      const endIso = slot.end.toISOString();
      if (slot.type === 'review') {
        return {
          id: `${dateKey(slot.start)}-review-${index}`,
          type: 'review',
          start: startIso,
          end: endIso,
          title: '復習・遅れの吸収',
          detail: '直近の学習内容を思い出し、間違えた箇所を中心に復習する',
          amount: 0,
          completed: false
        };
      }

      const amount = amounts[amountIndex++] || 0;
      return {
        id: `${dateKey(slot.start)}-study-${index}`,
        type: 'study',
        start: startIso,
        end: endIso,
        title: `${amountText(amount, unit, input.customUnit)}進める`,
        detail: goal,
        amount,
        completed: false
      };
    });

    const predictedCompletion = sessions.length ? dateKey(new Date(sessions[sessions.length - 1].start)) : null;
    const result = {
      version: 1,
      input: {
        ...input,
        now: undefined,
        current,
        target,
        weekdays,
        availableFrom: input.availableFrom,
        availableUntil: input.availableUntil,
        sessionMinutes,
        unit,
        pacePerHour,
        busyEvents: busyEvents.map(event => ({
          start: event.start.toISOString(),
          end: event.end.toISOString(),
          summary: event.summary
        }))
      },
      sessions,
      feasible,
      requiredMinutes,
      availableLearningMinutes,
      shortageMinutes: requiredMinutes === null ? 0 : Math.max(0, requiredMinutes - availableLearningMinutes),
      predictedCompletion,
      generatedAt: new Date().toISOString()
    };
    result.coachMessage = buildCoachMessage(result);
    return result;
  }

  function decodeIcsText(value) {
    return String(value || '')
      .replace(/\\n/gi, ' ')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  function parseIcsDate(value, dateOnly) {
    const raw = String(value || '').trim();
    if (dateOnly || /^\d{8}$/.test(raw)) {
      const match = /^(\d{4})(\d{2})(\d{2})$/.exec(raw);
      return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
    }
    const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(raw);
    if (!match) return null;
    const parts = match.slice(1, 7).map(Number);
    return match[7]
      ? new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]))
      : new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  }

  function parseIcs(text) {
    const lines = String(text || '').replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
    const events = [];
    const warnings = [];
    let current = null;

    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') {
        current = {};
        continue;
      }
      if (line === 'END:VEVENT') {
        if (current) {
          const startProp = current.DTSTART;
          const endProp = current.DTEND;
          const dateOnly = Boolean(startProp?.params?.includes('VALUE=DATE'));
          const start = parseIcsDate(startProp?.value, dateOnly);
          const end = parseIcsDate(endProp?.value, Boolean(endProp?.params?.includes('VALUE=DATE')))
            || (start ? new Date(start.getTime() + (dateOnly ? DAY_MS : 60 * 60 * 1000)) : null);
          if (start && end && end > start && current.STATUS?.value !== 'CANCELLED') {
            events.push({ start, end, summary: decodeIcsText(current.SUMMARY?.value || '予定') });
            if (current.RRULE) warnings.push('繰り返し予定は先頭の予定のみ読み込みました。');
          }
        }
        current = null;
        continue;
      }
      if (!current) continue;
      const colon = line.indexOf(':');
      if (colon < 0) continue;
      const left = line.slice(0, colon);
      const [name, ...params] = left.split(';');
      if (!current[name]) current[name] = { value: line.slice(colon + 1), params };
    }

    return { events, warnings: [...new Set(warnings)] };
  }

  const api = {
    generatePlan,
    generatePortfolioPlan,
    parseIcs,
    dateKey,
    parseDateKey,
    unitLabel,
    amountText,
    findAvailableSlot
  };

  if (typeof window !== 'undefined') window.StudyPlannerCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
