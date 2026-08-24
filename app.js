(() => {
  'use strict';

  const STORAGE_KEY = 'studyTrackerRecordsV2';
  const LEGACY_KEY = 'studyTrackerRecordsV1';
  const WHEEL_ITEM_HEIGHT = 48;

  let storageAvailable = true;
  let records = readRecords();
  let viewDate = new Date();
  let editingId = null;
  let selectedHours = 0;
  let selectedMinutes = 0;
  let draftHours = 0;
  let draftMinutes = 0;

  const TYPE_META = {
    minutes: {
      label: '時間', unit: '分', short: '分', field: '学習時間',
      placeholder: '', hint: '時間と分をスクロールして1分単位で設定します。', inputType: 'time-picker'
    },
    pages: {
      label: 'ページ', unit: 'ページ', short: 'p', field: 'ページ数・範囲',
      placeholder: '例：25 / 20-45 / p.20〜45', hint: 'ページ数でも範囲でも入力できます。範囲を入れた場合はページ数を自動計算します。', inputType: 'text'
    },
    sections: {
      label: '章・セクション', unit: 'セクション', short: '節', field: '章・セクション',
      placeholder: '例：2-4 / 第3章 / Section 2〜4', hint: '数字だけでなく「第3章」「Section 2〜4」のような文字も入力できます。', inputType: 'text'
    }
  };

  const app = document.getElementById('app');
  if (!app) return;

  document.title = 'Study Tracker';

  const style = document.createElement('style');
  style.textContent = `
    :root{
      --bg:#f4f7fb;--card:#fff;--text:#162033;--muted:#748198;--primary:#4f7cff;--primary-soft:#eaf0ff;
      --line:#e7ebf2;--success:#2fb171;--warn:#b36b00;--danger:#d64a4a;--shadow:0 14px 35px rgba(24,39,75,.08)
    }
    *{box-sizing:border-box}
    body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--text)}
    button,input,textarea,select{font:inherit}
    button{border:0;border-radius:12px;padding:10px 14px;font-weight:700;cursor:pointer}
    button:active{transform:translateY(1px)}
    button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,.wheel-list:focus-visible{outline:3px solid rgba(79,124,255,.28);outline-offset:2px}
    .app{max-width:1180px;margin:0 auto;padding:28px 18px 60px}
    .top h1{margin:0;font-size:30px}.subtitle{margin:6px 0 24px;color:var(--muted)}
    .grid{display:grid;grid-template-columns:360px 1fr;gap:20px}
    .card{background:var(--card);border-radius:20px;padding:20px;box-shadow:var(--shadow);border:1px solid rgba(231,235,242,.7);margin-bottom:20px}
    .card:last-child{margin-bottom:0}.card h2{font-size:18px;margin:0 0 16px}
    .card-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .badge{font-size:11px;background:var(--warn);color:#fff;border-radius:999px;padding:5px 9px}.hidden{display:none!important}
    label{display:block;font-size:13px;color:var(--muted);margin:14px 0 7px}
    input,textarea,select{width:100%;border:1px solid var(--line);background:#fff;border-radius:12px;padding:12px 13px;font-size:15px;outline:none;color:var(--text)}
    input:focus,textarea:focus,select:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-soft)}
    textarea{min-height:80px;resize:vertical}
    .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .hint{font-size:12px;color:var(--muted);margin-top:7px;line-height:1.5}
    .save-status{font-size:12px;margin-top:10px;text-align:center;color:var(--success)}.save-status.warn{color:var(--warn)}
    .form-actions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:16px}
    .primary{background:var(--primary);color:#fff}.secondary{background:#f1f4f8;color:var(--text)}.danger{background:#fff0f0;color:var(--danger)}
    .flash{background:#e9f8f0;color:#1c7d4e;border-radius:10px;padding:9px 11px;font-size:13px;margin-top:10px;display:none}.flash.show{display:block}
    .time-picker-button{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff;border:1px solid var(--line);padding:12px 13px;color:var(--text);font-weight:650;text-align:left}
    .time-picker-button:hover{border-color:#cbd6ff}.time-picker-value{font-size:16px}.time-picker-arrow{color:var(--muted);font-size:18px}
    .history-item{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:12px 0;border-top:1px solid var(--line)}.history-item:first-child{border-top:0}
    .history-main{min-width:0}.history-title{font-weight:700}.history-note{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px;margin-top:3px}
    .history-value{color:var(--primary);font-weight:800;white-space:nowrap}.history-actions{display:flex;gap:6px;align-items:center}.small-btn{padding:6px 9px;font-size:12px}.edit-btn{background:var(--primary-soft);color:var(--primary)}.delete-btn{background:#fff0f0;color:var(--danger)}.empty-state{color:var(--muted);font-size:14px;padding:8px 0}
    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}.stat{background:var(--primary-soft);padding:13px;border-radius:14px;min-width:0}.stat .num{font-size:22px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.stat .lab{font-size:11px;color:var(--muted);margin-top:3px}
    .unit-stats{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}.unit-chip{font-size:13px;background:#f5f7fa;border:1px solid var(--line);border-radius:999px;padding:8px 11px}.unit-chip strong{margin-left:5px}
    .calendar-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:15px;gap:10px}.calendar-head h2{margin:0}.nav{display:flex;gap:8px}.nav button{background:#f3f5f9;color:var(--text);padding:8px 11px}
    .weekdays,.calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}.weekdays div{text-align:center;font-size:12px;color:var(--muted);padding:4px 0}
    .day{min-height:92px;border:1px solid var(--line);border-radius:14px;padding:9px;position:relative;background:#fff;cursor:pointer;transition:.15s;overflow:hidden}.day:hover{transform:translateY(-1px);border-color:#cbd6ff}.day.empty{background:transparent;border-color:transparent;cursor:default}.day.today{border-color:var(--primary);box-shadow:inset 0 0 0 1px var(--primary)}
    .date-num{font-size:13px;font-weight:700}.check{position:absolute;right:8px;top:8px;width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:var(--success);color:#fff;font-weight:900}.day-summary{position:absolute;left:9px;right:6px;bottom:8px;color:var(--muted);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.subject{font-size:11px;color:var(--primary);margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80%}
    .analytics-head{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap}.analytics-head h2{margin-bottom:4px}.analytics-controls{display:flex;gap:8px}.analytics-controls select{width:auto;min-width:130px;padding:9px 11px}
    .overview-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:16px 0}.overview-box{border:1px solid var(--line);border-radius:14px;padding:12px;background:#fafbfe;min-width:0}.overview-box .value{font-size:18px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.overview-box .label{font-size:11px;color:var(--muted);margin-top:3px}
    .analytics-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 16px}.summary-box{border:1px solid var(--line);border-radius:14px;padding:12px;background:#fff}.summary-box .value{font-size:19px;font-weight:800}.summary-box .label{font-size:11px;color:var(--muted);margin-top:3px}
    .chart-grid{display:grid;grid-template-columns:1.55fr 1fr;gap:14px}.chart-card{border:1px solid var(--line);border-radius:16px;padding:14px;min-width:0}.chart-title{font-size:14px;font-weight:800;margin-bottom:10px}.chart-wrap{width:100%;overflow:hidden}.line-chart{width:100%;height:260px;display:block}.axis-label{font-size:10px;fill:var(--muted)}.grid-line{stroke:var(--line);stroke-width:1}.line-path{fill:none;stroke:var(--primary);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.line-dot{fill:var(--primary)}
    .bar-list{display:flex;flex-direction:column;gap:12px;min-height:220px}.bar-row{display:grid;grid-template-columns:minmax(80px,130px) 1fr auto;gap:8px;align-items:center}.bar-name{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bar-track{height:12px;background:#eef1f6;border-radius:999px;overflow:hidden}.bar-fill{height:100%;background:var(--primary);border-radius:999px}.bar-value{font-size:11px;color:var(--muted);min-width:55px;text-align:right}.chart-empty{height:220px;display:grid;place-items:center;color:var(--muted);font-size:13px;text-align:center}.legend-note{font-size:11px;color:var(--muted);margin-top:8px}

    .time-dialog{width:min(430px,calc(100% - 28px));border:0;border-radius:22px;padding:0;background:var(--card);color:var(--text);box-shadow:0 24px 70px rgba(22,32,51,.24)}
    .time-dialog::backdrop{background:rgba(18,27,44,.48);backdrop-filter:blur(2px)}
    .time-dialog-inner{padding:20px}.dialog-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}.dialog-head h3{margin:0;font-size:19px}.dialog-sub{font-size:12px;color:var(--muted);margin-top:4px}.dialog-close{background:#f1f4f8;color:var(--text);width:40px;height:40px;padding:0;border-radius:50%;font-size:18px}
    .wheel-labels{display:grid;grid-template-columns:1fr 1fr;gap:16px;text-align:center;font-size:12px;color:var(--muted);margin-bottom:6px}
    .wheel-area{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:0 auto;max-width:330px}
    .wheel-selection{position:absolute;left:0;right:0;top:96px;height:48px;border-top:1px solid #dbe3ff;border-bottom:1px solid #dbe3ff;background:rgba(79,124,255,.07);border-radius:10px;pointer-events:none;z-index:1}
    .wheel-list{height:240px;overflow-y:auto;scroll-snap-type:y mandatory;overscroll-behavior:contain;padding:96px 0;scrollbar-width:none;position:relative;z-index:2;text-align:center;border-radius:14px}
    .wheel-list::-webkit-scrollbar{display:none}.wheel-item{height:48px;display:grid;place-items:center;scroll-snap-align:center;font-size:19px;color:var(--muted);user-select:none;cursor:pointer;transition:.12s}.wheel-item.selected{font-size:24px;font-weight:800;color:var(--text)}
    .dialog-total{text-align:center;font-size:15px;font-weight:800;margin:14px 0 16px}.dialog-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.dialog-actions button{min-height:44px}

    @media(max-width:900px){.grid{grid-template-columns:1fr}.chart-grid{grid-template-columns:1fr}.overview-grid{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:600px){.app{padding:20px 12px 40px}.top h1{font-size:26px}.stats{grid-template-columns:repeat(3,1fr)}.stat .num{font-size:18px}.day{min-height:76px;padding:7px}.subject{display:none}.day-summary{font-size:9px}.row{grid-template-columns:1fr}.analytics-controls{width:100%}.analytics-controls select{flex:1;min-width:0}.overview-grid{grid-template-columns:repeat(2,1fr)}.analytics-summary{grid-template-columns:1fr}.bar-row{grid-template-columns:90px 1fr auto}.history-item{gap:6px}.history-actions{flex-wrap:wrap;justify-content:flex-end}.history-note{max-width:170px}}
  `;
  document.head.appendChild(style);

  app.innerHTML = `
    <main class="app">
      <header class="top">
        <h1>📚 Study Tracker</h1>
        <p class="subtitle">時間・ページ・章など、勉強した量を記録して、学習の進み具合を可視化。</p>
      </header>

      <div class="grid">
        <section>
          <div class="card form-card">
            <div class="card-head"><h2 id="formTitle">学習を記録</h2><span id="editBadge" class="badge hidden">編集中</span></div>
            <label for="date">日付</label><input id="date" type="date" />
            <label for="subject">科目・教材</label><input id="subject" placeholder="例：Python / 基本情報 / 英単語帳" />
            <div class="row">
              <div>
                <label for="recordType">記録の種類</label>
                <select id="recordType"><option value="minutes">時間</option><option value="pages">ページ数</option><option value="sections">章・セクション</option></select>
              </div>
              <div>
                <label id="amountLabel" for="amount">学習時間</label>
                <input id="amount" class="hidden" type="text" />
                <button id="timePickerButton" class="time-picker-button" type="button" aria-haspopup="dialog">
                  <span id="timePickerValue" class="time-picker-value">時間を設定</span><span class="time-picker-arrow">›</span>
                </button>
              </div>
            </div>
            <div class="hint" id="amountHint">時間と分をスクロールして1分単位で設定します。</div>
            <label for="range">詳細（任意）</label><input id="range" placeholder="例：学習した範囲や補足" />
            <label for="note">メモ</label><textarea id="note" placeholder="理解したこと、次にやることなど"></textarea>
            <div class="form-actions"><button class="primary" id="saveBtn" type="button">記録する</button><button class="secondary hidden" id="cancelEditBtn" type="button">編集をキャンセル</button></div>
            <div class="flash" id="flash"></div><div class="save-status" id="saveStatus"></div>
          </div>

          <div class="card"><h2>最近の記録</h2><div id="historyList"></div></div>
        </section>

        <section class="card">
          <div class="stats">
            <div class="stat"><div class="num" id="studyDays">0</div><div class="lab">今月の学習日数</div></div>
            <div class="stat"><div class="num" id="recordCount">0</div><div class="lab">今月の記録回数</div></div>
            <div class="stat"><div class="num" id="streak">0日</div><div class="lab">現在の連続学習</div></div>
          </div>
          <div class="unit-stats" id="unitStats"></div>
          <div class="calendar-head"><h2 id="monthTitle"></h2><div class="nav"><button id="prevBtn" type="button">←</button><button id="todayBtn" type="button">今日</button><button id="nextBtn" type="button">→</button></div></div>
          <div class="weekdays"><div>日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div>土</div></div>
          <div class="calendar" id="calendar"></div>
        </section>
      </div>

      <section class="card">
        <div class="analytics-head">
          <div><h2>📊 学習統計・可視化</h2><div class="legend-note">単位は混ぜずに別々に集計します。学習日数だけは、記録の種類を問わず「何か勉強した日」で数えます。</div></div>
          <div class="analytics-controls">
            <select id="period" aria-label="統計期間"><option value="7">直近7日</option><option value="30" selected>直近30日</option><option value="90">直近90日</option><option value="all">全期間</option></select>
            <select id="metric" aria-label="グラフ指標"><option value="minutes">学習時間</option><option value="pages">ページ数</option><option value="sections">章・セクション</option><option value="records">記録回数</option></select>
          </div>
        </div>

        <div class="overview-grid">
          <div class="overview-box"><div class="value" id="overviewMinutes">0分</div><div class="label">⏱ 学習時間</div></div>
          <div class="overview-box"><div class="value" id="overviewPages">0ページ</div><div class="label">📖 ページ</div></div>
          <div class="overview-box"><div class="value" id="overviewSections">0節</div><div class="label">📚 セクション</div></div>
          <div class="overview-box"><div class="value" id="overviewRecords">0回</div><div class="label">📝 記録</div></div>
          <div class="overview-box"><div class="value" id="overviewDays">0日</div><div class="label">📅 学習日</div></div>
        </div>

        <div class="analytics-summary">
          <div class="summary-box"><div class="value" id="totalMetric">0</div><div class="label">選択指標の期間合計</div></div>
          <div class="summary-box"><div class="value" id="averageMetric">0</div><div class="label">学習日あたり平均</div></div>
          <div class="summary-box"><div class="value" id="topSubject">—</div><div class="label">選択指標で最多の科目</div></div>
        </div>

        <div class="chart-grid">
          <div class="chart-card"><div class="chart-title" id="trendTitle">日別の学習推移</div><div class="chart-wrap"><svg class="line-chart" id="lineChart" viewBox="0 0 760 260" preserveAspectRatio="none" role="img" aria-label="日別の学習推移"></svg></div></div>
          <div class="chart-card"><div class="chart-title" id="subjectTitle">科目別</div><div id="subjectChart" class="bar-list"></div></div>
        </div>
      </section>
    </main>

    <dialog id="timeDialog" class="time-dialog" aria-labelledby="timeDialogTitle">
      <div class="time-dialog-inner">
        <div class="dialog-head">
          <div><h3 id="timeDialogTitle">学習時間を設定</h3><div class="dialog-sub">上下にスクロールして1分単位で選べます。</div></div>
          <button id="timeDialogClose" class="dialog-close" type="button" aria-label="閉じる">×</button>
        </div>
        <div class="wheel-labels"><div>時間</div><div>分</div></div>
        <div class="wheel-area">
          <div class="wheel-selection" aria-hidden="true"></div>
          <div id="hourWheel" class="wheel-list" tabindex="0" aria-label="時間"></div>
          <div id="minuteWheel" class="wheel-list" tabindex="0" aria-label="分"></div>
        </div>
        <div id="dialogTotal" class="dialog-total">0分</div>
        <div class="dialog-actions"><button id="timeCancel" class="secondary" type="button">キャンセル</button><button id="timeConfirm" class="primary" type="button">決定</button></div>
      </div>
    </dialog>
  `;

  const $ = id => document.getElementById(id);
  const dateInput = $('date');
  const subjectInput = $('subject');
  const recordTypeInput = $('recordType');
  const amountInput = $('amount');
  const amountLabel = $('amountLabel');
  const amountHint = $('amountHint');
  const rangeInput = $('range');
  const noteInput = $('note');
  const calendar = $('calendar');
  const monthTitle = $('monthTitle');
  const studyDays = $('studyDays');
  const recordCount = $('recordCount');
  const streak = $('streak');
  const unitStats = $('unitStats');
  const historyList = $('historyList');
  const saveStatus = $('saveStatus');
  const flash = $('flash');
  const saveBtn = $('saveBtn');
  const cancelEditBtn = $('cancelEditBtn');
  const editBadge = $('editBadge');
  const formTitle = $('formTitle');
  const timePickerButton = $('timePickerButton');
  const timePickerValue = $('timePickerValue');
  const timeDialog = $('timeDialog');
  const hourWheel = $('hourWheel');
  const minuteWheel = $('minuteWheel');
  const dialogTotal = $('dialogTotal');

  buildWheel(hourWheel, 24, '時間');
  buildWheel(minuteWheel, 60, '分');

  function readRecords(){
    try{
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) return normalizeRecords(JSON.parse(current));
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
      return legacy.map(r => ({
        id: r.id || makeId(), date: r.date, subject: r.subject || '', type: 'minutes',
        amount: Number(r.minutes || 0), rawAmount: '', range: '', note: r.note || '',
        createdAt: r.createdAt || new Date().toISOString()
      }));
    } catch (e) {
      storageAvailable = false;
      return [];
    }
  }

  function normalizeRecords(list){
    if (!Array.isArray(list)) return [];
    return list.filter(Boolean).map(r => ({
      ...r,
      id: r.id || makeId(),
      date: r.date || localDateString(),
      type: TYPE_META[r.type] ? r.type : 'minutes',
      amount: Number(r.amount ?? r.minutes ?? 0),
      rawAmount: r.rawAmount || '',
      subject: r.subject || '',
      range: r.range || '',
      note: r.note || '',
      createdAt: r.createdAt || new Date().toISOString()
    }));
  }

  function saveRecords(){
    if (!storageAvailable) return false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch (e) {
      storageAvailable = false;
      return false;
    }
  }

  function localDateString(d = new Date()){
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function makeId(){
    try { if (window.crypto?.randomUUID) return window.crypto.randomUUID(); } catch (e) {}
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function getType(r){ return TYPE_META[r.type] ? r.type : 'minutes'; }
  function getAmount(r){ const n = Number(r.amount ?? r.minutes); return Number.isFinite(n) ? n : 0; }
  function formatNumber(n){ return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''); }

  function formatMinutes(totalMinutes){
    const total = Math.max(0, Math.round(Number(totalMinutes) || 0));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0) return `${m}分`;
    if (m === 0) return `${h}時間`;
    return `${h}時間${m}分`;
  }

  function formatValue(r){
    const t = getType(r);
    if (t === 'minutes') return formatMinutes(getAmount(r));
    return r.rawAmount || `${formatNumber(getAmount(r))}${TYPE_META[t].unit}`;
  }

  function parseStudyAmount(type, raw){
    const text = String(raw || '').trim();
    if (!text) return null;
    const normalized = text.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[〜～–—]/g, '-');
    const range = normalized.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      if (Number.isFinite(a) && Number.isFinite(b) && b >= a) return type === 'pages' ? b - a + 1 : Math.floor(b) - Math.floor(a) + 1;
    }
    const one = normalized.match(/^\s*(?:p\.?\s*)?(\d+(?:\.\d+)?)\s*(?:ページ|頁|章|節|section|sections)?\s*$/i);
    if (one) return Number(one[1]);
    if (type === 'sections' && /(?:第?\s*\d+\s*章|section\s*\d+)/i.test(normalized)) return 1;
    return null;
  }

  function updateAmountUI(){
    const meta = TYPE_META[recordTypeInput.value];
    amountLabel.textContent = meta.field;
    amountHint.textContent = meta.hint;
    const isMinutes = recordTypeInput.value === 'minutes';
    timePickerButton.classList.toggle('hidden', !isMinutes);
    amountInput.classList.toggle('hidden', isMinutes);
    if (!isMinutes) {
      amountInput.type = 'text';
      amountInput.placeholder = meta.placeholder;
    }
    updateTimePickerButton();
  }

  function updateTimePickerButton(){
    const total = selectedHours * 60 + selectedMinutes;
    timePickerValue.textContent = total > 0 ? formatMinutes(total) : '時間を設定';
  }

  function groupedByDate(){
    return records.reduce((acc, r) => {
      (acc[r.date] ??= []).push(r);
      return acc;
    }, {});
  }

  function currentStreak(){
    const set = new Set(records.map(r => r.date));
    let d = new Date();
    if (!set.has(localDateString(d))) d.setDate(d.getDate() - 1);
    let count = 0;
    while (set.has(localDateString(d))) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }

  function showFlash(message){
    flash.textContent = `✓ ${message}`;
    flash.classList.add('show');
    clearTimeout(showFlash.timer);
    showFlash.timer = setTimeout(() => flash.classList.remove('show'), 1800);
  }

  function updateStorageStatus(){
    saveStatus.textContent = storageAvailable
      ? 'この端末のブラウザに自動保存されます'
      : 'この表示環境では端末保存が使えないため、画面を閉じると記録が消える場合があります';
    saveStatus.className = storageAvailable ? 'save-status' : 'save-status warn';
  }

  function renderCalendar(){
    calendar.innerHTML = '';
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    monthTitle.textContent = `${year}年 ${month + 1}月`;
    const first = new Date(year, month, 1).getDay();
    const last = new Date(year, month + 1, 0).getDate();
    const grouped = groupedByDate();

    for (let i = 0; i < first; i++) {
      const e = document.createElement('div');
      e.className = 'day empty';
      calendar.appendChild(e);
    }

    let days = 0;
    let count = 0;
    const totals = { minutes: 0, pages: 0, sections: 0 };

    for (let day = 1; day <= last; day++) {
      const key = localDateString(new Date(year, month, day));
      const dayRecords = grouped[key] || [];
      if (dayRecords.length) {
        days++;
        count += dayRecords.length;
        dayRecords.forEach(r => { totals[getType(r)] += getAmount(r); });
      }

      const cell = document.createElement('div');
      cell.className = 'day';
      if (key === localDateString()) cell.classList.add('today');
      const n = document.createElement('div');
      n.className = 'date-num';
      n.textContent = day;
      cell.appendChild(n);

      if (dayRecords.length) {
        const check = document.createElement('div');
        check.className = 'check';
        check.textContent = '✓';
        const subject = document.createElement('div');
        subject.className = 'subject';
        subject.textContent = dayRecords.map(r => r.subject).filter(Boolean).join('・');
        const summary = document.createElement('div');
        summary.className = 'day-summary';
        summary.textContent = summarize(dayRecords);
        cell.append(check, subject, summary);
      }

      cell.addEventListener('click', () => {
        dateInput.value = key;
        dateInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      calendar.appendChild(cell);
    }

    studyDays.textContent = days;
    recordCount.textContent = count;
    streak.textContent = `${currentStreak()}日`;
    unitStats.innerHTML = '';

    [
      ['minutes', formatMinutes(totals.minutes)],
      ['pages', `${formatNumber(totals.pages)}ページ`],
      ['sections', `${formatNumber(totals.sections)}節`]
    ].forEach(([type, value]) => {
      const chip = document.createElement('div');
      chip.className = 'unit-chip';
      chip.innerHTML = `${TYPE_META[type].label}<strong>${value}</strong>`;
      unitStats.appendChild(chip);
    });
  }

  function summarize(rs){
    const totals = { minutes: 0, pages: 0, sections: 0 };
    rs.forEach(r => { totals[getType(r)] += getAmount(r); });
    const parts = [];
    if (totals.minutes > 0) parts.push(formatMinutes(totals.minutes));
    if (totals.pages > 0) parts.push(`${formatNumber(totals.pages)}p`);
    if (totals.sections > 0) parts.push(`${formatNumber(totals.sections)}節`);
    return parts.join('・');
  }

  function renderHistory(){
    historyList.innerHTML = '';
    const sorted = [...records]
      .sort((a, b) => `${b.date}${b.createdAt || ''}`.localeCompare(`${a.date}${a.createdAt || ''}`))
      .slice(0, 20);

    if (!sorted.length) {
      historyList.innerHTML = '<div class="empty-state">まだ記録がありません。</div>';
      return;
    }

    sorted.forEach(r => {
      const row = document.createElement('div');
      row.className = 'history-item';
      const left = document.createElement('div');
      left.className = 'history-main';
      const title = document.createElement('div');
      title.className = 'history-title';
      title.textContent = r.subject || '学習';
      const note = document.createElement('div');
      note.className = 'history-note';
      const edited = r.updatedAt ? '編集済み' : '';
      note.textContent = [r.date, TYPE_META[getType(r)].label, r.range, r.note, edited].filter(Boolean).join(' ・ ');
      left.append(title, note);

      const right = document.createElement('div');
      right.className = 'history-actions';
      const value = document.createElement('span');
      value.className = 'history-value';
      value.textContent = formatValue(r);
      const edit = document.createElement('button');
      edit.className = 'small-btn edit-btn';
      edit.type = 'button';
      edit.textContent = '編集';
      edit.addEventListener('click', () => startEdit(r.id));
      const del = document.createElement('button');
      del.className = 'small-btn delete-btn';
      del.type = 'button';
      del.textContent = '削除';
      del.addEventListener('click', () => deleteRecord(r.id));
      right.append(value, edit, del);
      row.append(left, right);
      historyList.appendChild(row);
    });
  }

  function resetForm(){
    editingId = null;
    formTitle.textContent = '学習を記録';
    editBadge.classList.add('hidden');
    saveBtn.textContent = '記録する';
    cancelEditBtn.classList.add('hidden');
    dateInput.value = localDateString();
    subjectInput.value = '';
    recordTypeInput.value = 'minutes';
    selectedHours = 0;
    selectedMinutes = 0;
    amountInput.value = '';
    rangeInput.value = '';
    noteInput.value = '';
    updateAmountUI();
  }

  function startEdit(id){
    const r = records.find(x => x.id === id);
    if (!r) return;
    editingId = id;
    formTitle.textContent = '学習記録を編集';
    editBadge.classList.remove('hidden');
    saveBtn.textContent = '変更を保存';
    cancelEditBtn.classList.remove('hidden');
    dateInput.value = r.date;
    subjectInput.value = r.subject || '';
    recordTypeInput.value = getType(r);

    if (getType(r) === 'minutes') {
      const total = Math.max(0, Math.round(getAmount(r)));
      selectedHours = Math.min(23, Math.floor(total / 60));
      selectedMinutes = total % 60;
      amountInput.value = '';
    } else {
      selectedHours = 0;
      selectedMinutes = 0;
      amountInput.value = r.rawAmount || formatNumber(getAmount(r));
    }

    rangeInput.value = r.range || '';
    noteInput.value = r.note || '';
    updateAmountUI();
    document.querySelector('.form-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function deleteRecord(id){
    const r = records.find(x => x.id === id);
    if (!r) return;
    if (!confirm(`「${r.subject || '学習'}」の記録を削除しますか？`)) return;
    records = records.filter(x => x.id !== id);
    saveRecords();
    if (editingId === id) resetForm();
    renderAll();
    showFlash('記録を削除しました');
  }

  function saveEntry(){
    const date = dateInput.value;
    const type = recordTypeInput.value;
    if (!date) { alert('日付を選んでください'); return; }

    let amount;
    let rawAmount = '';
    if (type === 'minutes') {
      amount = selectedHours * 60 + selectedMinutes;
      if (amount <= 0) { alert('学習時間を設定してください'); openTimeDialog(); return; }
    } else {
      rawAmount = amountInput.value.trim();
      if (!rawAmount) { alert('学習量を入力してください'); return; }
      amount = parseStudyAmount(type, rawAmount);
      if (amount === null) { alert('学習量を数値または範囲で入力してください'); return; }
    }

    const data = {
      date,
      subject: subjectInput.value.trim(),
      type,
      amount,
      rawAmount,
      range: rangeInput.value.trim(),
      note: noteInput.value.trim()
    };

    if (editingId) {
      const index = records.findIndex(r => r.id === editingId);
      if (index >= 0) records[index] = { ...records[index], ...data, updatedAt: new Date().toISOString() };
      saveRecords();
      const chosen = new Date(`${date}T00:00:00`);
      viewDate = new Date(chosen.getFullYear(), chosen.getMonth(), 1);
      resetForm();
      renderAll();
      showFlash('記録を更新しました');
    } else {
      records.push({ id: makeId(), ...data, createdAt: new Date().toISOString() });
      saveRecords();
      const chosen = new Date(`${date}T00:00:00`);
      viewDate = new Date(chosen.getFullYear(), chosen.getMonth(), 1);
      subjectInput.value = '';
      amountInput.value = '';
      selectedHours = 0;
      selectedMinutes = 0;
      rangeInput.value = '';
      noteInput.value = '';
      updateAmountUI();
      renderAll();
      showFlash('記録しました');
    }
  }

  function metricMeta(metric){
    if (metric === 'minutes') return { label: '学習時間', unit: '分' };
    if (metric === 'pages') return { label: 'ページ数', unit: 'ページ' };
    if (metric === 'sections') return { label: '章・セクション', unit: '節' };
    return { label: '記録回数', unit: '回' };
  }

  function getMetricValue(r, metric){
    if (metric === 'records') return 1;
    if (getType(r) !== metric) return 0;
    return getAmount(r);
  }

  function formatMetric(v, metric){
    if (metric === 'minutes') return formatMinutes(v);
    if (metric === 'records') return `${formatNumber(v)}回`;
    return `${formatNumber(v)}${metricMeta(metric).unit}`;
  }

  function getAnalyticsRange(){
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const p = $('period').value;
    if (p === 'all') {
      if (!records.length) return { start: today, end: today };
      const dates = records.map(r => new Date(`${r.date}T00:00:00`));
      return { start: new Date(Math.min(...dates.map(d => d.getTime()))), end: today };
    }
    const start = new Date(today);
    start.setDate(start.getDate() - Number(p) + 1);
    return { start, end: today };
  }

  function datesBetween(start, end){
    const out = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(localDateString(d));
    return out;
  }

  function renderAnalytics(){
    const metric = $('metric').value;
    const meta = metricMeta(metric);
    const { start, end } = getAnalyticsRange();
    const keys = datesBetween(start, end);
    const inRange = records.filter(r => {
      const t = new Date(`${r.date}T00:00:00`);
      return t >= start && t <= end;
    });

    const overview = { minutes: 0, pages: 0, sections: 0 };
    inRange.forEach(r => { overview[getType(r)] += getAmount(r); });
    const activeDates = new Set(inRange.map(r => r.date));
    $('overviewMinutes').textContent = formatMinutes(overview.minutes);
    $('overviewPages').textContent = `${formatNumber(overview.pages)}ページ`;
    $('overviewSections').textContent = `${formatNumber(overview.sections)}節`;
    $('overviewRecords').textContent = `${inRange.length}回`;
    $('overviewDays').textContent = `${activeDates.size}日`;

    const daily = keys.map(date => ({
      date,
      value: inRange.filter(r => r.date === date).reduce((sum, r) => sum + getMetricValue(r, metric), 0)
    }));
    const total = daily.reduce((sum, d) => sum + d.value, 0);
    const average = activeDates.size ? total / activeDates.size : 0;

    $('totalMetric').textContent = formatMetric(total, metric);
    $('averageMetric').textContent = formatMetric(average, metric);

    const subjectTotals = {};
    inRange.forEach(r => {
      const value = getMetricValue(r, metric);
      if (value <= 0) return;
      const name = r.subject?.trim() || '未分類';
      subjectTotals[name] = (subjectTotals[name] || 0) + value;
    });
    const subjects = Object.entries(subjectTotals).sort((a, b) => b[1] - a[1]);
    $('topSubject').textContent = subjects[0]?.[0] || '—';
    $('trendTitle').textContent = `日別の${meta.label}`;
    $('subjectTitle').textContent = `科目別の${meta.label}`;

    renderLineChart(daily, metric);
    renderSubjectBars(subjects, metric);
  }

  function renderLineChart(daily, metric){
    const svg = $('lineChart');
    const W = 760, H = 260, L = 42, R = 16, T = 18, B = 34;
    svg.innerHTML = '';

    if (!daily.length || daily.every(d => d.value === 0)) {
      svg.innerHTML = '<text x="380" y="130" text-anchor="middle" class="axis-label">この期間に選択した指標のデータがありません</text>';
      return;
    }

    const max = Math.max(...daily.map(d => d.value), 1);
    const innerW = W - L - R;
    const innerH = H - T - B;
    const pts = daily.map((d, i) => ({
      x: L + (daily.length === 1 ? innerW / 2 : i * innerW / (daily.length - 1)),
      y: T + innerH - (d.value / max) * innerH,
      ...d
    }));

    [0, .5, 1].forEach(f => {
      const y = T + innerH * (1 - f);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', L); line.setAttribute('x2', W - R); line.setAttribute('y1', y); line.setAttribute('y2', y); line.setAttribute('class', 'grid-line');
      svg.appendChild(line);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', L - 7); text.setAttribute('y', y + 4); text.setAttribute('text-anchor', 'end'); text.setAttribute('class', 'axis-label');
      text.textContent = formatNumber(max * f);
      svg.appendChild(text);
    });

    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));
    poly.setAttribute('class', 'line-path');
    svg.appendChild(poly);

    const step = Math.max(1, Math.ceil(daily.length / 7));
    pts.forEach((p, i) => {
      if (i % step !== 0 && i !== pts.length - 1) return;
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', 4); c.setAttribute('class', 'line-dot');
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${p.date}: ${formatMetric(p.value, metric)}`;
      c.appendChild(title);
      svg.appendChild(c);

      const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tx.setAttribute('x', p.x); tx.setAttribute('y', H - 10); tx.setAttribute('text-anchor', 'middle'); tx.setAttribute('class', 'axis-label');
      tx.textContent = p.date.slice(5).replace('-', '/');
      svg.appendChild(tx);
    });
  }

  function renderSubjectBars(subjects, metric){
    const box = $('subjectChart');
    box.innerHTML = '';
    if (!subjects.length) {
      box.innerHTML = '<div class="chart-empty">この期間に選択した指標のデータがありません</div>';
      return;
    }
    const top = subjects.slice(0, 8);
    const max = Math.max(...top.map(([, v]) => v), 1);
    top.forEach(([name, value]) => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      const n = document.createElement('div');
      n.className = 'bar-name'; n.textContent = name; n.title = name;
      const track = document.createElement('div');
      track.className = 'bar-track';
      const fill = document.createElement('div');
      fill.className = 'bar-fill'; fill.style.width = `${Math.max(2, value / max * 100)}%`;
      track.appendChild(fill);
      const v = document.createElement('div');
      v.className = 'bar-value'; v.textContent = formatMetric(value, metric);
      row.append(n, track, v);
      box.appendChild(row);
    });
  }

  function buildWheel(container, count, suffix){
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.className = 'wheel-item';
      item.dataset.value = String(i);
      item.textContent = `${i}${suffix}`;
      item.addEventListener('click', () => scrollWheelTo(container, i, true));
      frag.appendChild(item);
    }
    container.appendChild(frag);
  }

  function scrollWheelTo(container, value, smooth = false){
    const max = container === hourWheel ? 23 : 59;
    const safe = Math.max(0, Math.min(max, Number(value) || 0));
    container.scrollTo({ top: safe * WHEEL_ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'auto' });
    updateWheelSelection(container, safe);
  }

  function updateWheelSelection(container, value){
    [...container.children].forEach((item, i) => item.classList.toggle('selected', i === value));
    if (container === hourWheel) draftHours = value;
    else draftMinutes = value;
    dialogTotal.textContent = formatMinutes(draftHours * 60 + draftMinutes);
  }

  function handleWheelScroll(container){
    cancelAnimationFrame(container._raf);
    container._raf = requestAnimationFrame(() => {
      const max = container === hourWheel ? 23 : 59;
      const value = Math.max(0, Math.min(max, Math.round(container.scrollTop / WHEEL_ITEM_HEIGHT)));
      updateWheelSelection(container, value);
    });
  }

  function handleWheelKeydown(event, container){
    if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const max = container === hourWheel ? 23 : 59;
    let current = Math.max(0, Math.min(max, Math.round(container.scrollTop / WHEEL_ITEM_HEIGHT)));
    if (event.key === 'ArrowUp') current -= 1;
    if (event.key === 'ArrowDown') current += 1;
    if (event.key === 'PageUp') current -= 5;
    if (event.key === 'PageDown') current += 5;
    if (event.key === 'Home') current = 0;
    if (event.key === 'End') current = max;
    scrollWheelTo(container, current, true);
  }

  function openTimeDialog(){
    draftHours = selectedHours;
    draftMinutes = selectedMinutes;
    if (typeof timeDialog.showModal === 'function') timeDialog.showModal();
    else timeDialog.setAttribute('open', '');
    requestAnimationFrame(() => {
      scrollWheelTo(hourWheel, draftHours, false);
      scrollWheelTo(minuteWheel, draftMinutes, false);
      hourWheel.focus({ preventScroll: true });
    });
  }

  function closeTimeDialog(){
    if (typeof timeDialog.close === 'function') timeDialog.close();
    else timeDialog.removeAttribute('open');
  }

  function confirmTime(){
    selectedHours = draftHours;
    selectedMinutes = draftMinutes;
    updateTimePickerButton();
    closeTimeDialog();
  }

  function handleRecordTypeChange(){
    if (recordTypeInput.value === 'minutes') {
      selectedHours = 0;
      selectedMinutes = 0;
    } else {
      amountInput.value = '';
    }
    updateAmountUI();
  }

  function renderAll(){
    renderCalendar();
    renderHistory();
    renderAnalytics();
    updateStorageStatus();
  }

  dateInput.value = localDateString();
  recordTypeInput.addEventListener('change', handleRecordTypeChange);
  saveBtn.addEventListener('click', saveEntry);
  cancelEditBtn.addEventListener('click', resetForm);
  $('prevBtn').addEventListener('click', () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1); renderCalendar(); });
  $('nextBtn').addEventListener('click', () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1); renderCalendar(); });
  $('todayBtn').addEventListener('click', () => { viewDate = new Date(); dateInput.value = localDateString(); renderCalendar(); });
  $('period').addEventListener('change', renderAnalytics);
  $('metric').addEventListener('change', renderAnalytics);

  timePickerButton.addEventListener('click', openTimeDialog);
  $('timeDialogClose').addEventListener('click', closeTimeDialog);
  $('timeCancel').addEventListener('click', closeTimeDialog);
  $('timeConfirm').addEventListener('click', confirmTime);
  timeDialog.addEventListener('click', event => {
    if (event.target === timeDialog) closeTimeDialog();
  });
  hourWheel.addEventListener('scroll', () => handleWheelScroll(hourWheel), { passive: true });
  minuteWheel.addEventListener('scroll', () => handleWheelScroll(minuteWheel), { passive: true });
  hourWheel.addEventListener('keydown', e => handleWheelKeydown(e, hourWheel));
  minuteWheel.addEventListener('keydown', e => handleWheelKeydown(e, minuteWheel));

  updateAmountUI();
  renderAll();
})();
