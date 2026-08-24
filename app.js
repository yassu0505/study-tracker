(() => {
  'use strict';

  const STORAGE_KEY = 'studyTrackerRecordsV2';
  const LEGACY_KEY = 'studyTrackerRecordsV1';
  let storageAvailable = true;
  let records = readRecords();
  let viewDate = new Date();
  let editingId = null;

  const TYPE_META = {
    minutes: { label:'時間', unit:'分', short:'分', field:'学習時間（分）', placeholder:'例：60', hint:'勉強した時間を分単位で入力します。', inputType:'number', inputMode:'decimal' },
    pages: { label:'ページ', unit:'ページ', short:'p', field:'ページ数・範囲', placeholder:'例：25 / 20-45 / p.20〜45', hint:'ページ数でも範囲でも入力できます。範囲を入れた場合はページ数を自動計算します。', inputType:'text', inputMode:'text' },
    sections: { label:'章・セクション', unit:'セクション', short:'節', field:'章・セクション', placeholder:'例：2-4 / 第3章 / Section 2〜4', hint:'数字だけでなく「第3章」「Section 2〜4」のような文字も入力できます。', inputType:'text', inputMode:'text' }
  };

  const app = document.getElementById('app');
  if (!app) return;

  document.title = 'Study Tracker';
  const style = document.createElement('style');
  style.textContent = `
    :root{--bg:#f4f7fb;--card:#fff;--text:#162033;--muted:#748198;--primary:#4f7cff;--primary-soft:#eaf0ff;--line:#e7ebf2;--success:#2fb171;--warn:#b36b00;--danger:#d64a4a;--shadow:0 14px 35px rgba(24,39,75,.08)}
    *{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--text)}
    button,input,textarea,select{font:inherit}button{border:0;border-radius:12px;padding:10px 14px;font-weight:700;cursor:pointer}button:active{transform:translateY(1px)}
    .app{max-width:1180px;margin:0 auto;padding:28px 18px 60px}.top h1{margin:0;font-size:30px}.subtitle{margin:6px 0 24px;color:var(--muted)}
    .grid{display:grid;grid-template-columns:360px 1fr;gap:20px}.card{background:var(--card);border-radius:20px;padding:20px;box-shadow:var(--shadow);border:1px solid rgba(231,235,242,.7);margin-bottom:20px}.card:last-child{margin-bottom:0}.card h2{font-size:18px;margin:0 0 16px}
    .card-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.badge{font-size:11px;background:var(--warn);color:#fff;border-radius:999px;padding:5px 9px}.hidden{display:none!important}
    label{display:block;font-size:13px;color:var(--muted);margin:14px 0 7px}input,textarea,select{width:100%;border:1px solid var(--line);background:#fff;border-radius:12px;padding:12px 13px;font-size:15px;outline:none;color:var(--text)}input:focus,textarea:focus,select:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-soft)}textarea{min-height:80px;resize:vertical}
    .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.hint{font-size:12px;color:var(--muted);margin-top:7px;line-height:1.5}.save-status{font-size:12px;margin-top:10px;text-align:center;color:var(--success)}.save-status.warn{color:var(--warn)}
    .form-actions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:16px}.primary{background:var(--primary);color:#fff}.secondary{background:#f1f4f8;color:var(--text)}.danger{background:#fff0f0;color:var(--danger)}
    .flash{background:#e9f8f0;color:#1c7d4e;border-radius:10px;padding:9px 11px;font-size:13px;margin-top:10px;display:none}.flash.show{display:block}
    .history-item{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:12px 0;border-top:1px solid var(--line)}.history-item:first-child{border-top:0}.history-main{min-width:0}.history-title{font-weight:700}.history-note{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px;margin-top:3px}.history-value{color:var(--primary);font-weight:800;white-space:nowrap}.history-actions{display:flex;gap:6px;align-items:center}.small-btn{padding:6px 9px;font-size:12px}.edit-btn{background:var(--primary-soft);color:var(--primary)}.delete-btn{background:#fff0f0;color:var(--danger)}.empty-state{color:var(--muted);font-size:14px;padding:8px 0}
    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}.stat{background:var(--primary-soft);padding:13px;border-radius:14px;min-width:0}.stat .num{font-size:22px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.stat .lab{font-size:11px;color:var(--muted);margin-top:3px}.unit-stats{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}.unit-chip{font-size:13px;background:#f5f7fa;border:1px solid var(--line);border-radius:999px;padding:8px 11px}.unit-chip strong{margin-left:5px}
    .calendar-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:15px;gap:10px}.calendar-head h2{margin:0}.nav{display:flex;gap:8px}.nav button{background:#f3f5f9;color:var(--text);padding:8px 11px}.weekdays,.calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}.weekdays div{text-align:center;font-size:12px;color:var(--muted);padding:4px 0}.day{min-height:92px;border:1px solid var(--line);border-radius:14px;padding:9px;position:relative;background:#fff;cursor:pointer;transition:.15s;overflow:hidden}.day:hover{transform:translateY(-1px);border-color:#cbd6ff}.day.empty{background:transparent;border-color:transparent;cursor:default}.day.today{border-color:var(--primary);box-shadow:inset 0 0 0 1px var(--primary)}.date-num{font-size:13px;font-weight:700}.check{position:absolute;right:8px;top:8px;width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:var(--success);color:#fff;font-weight:900}.day-summary{position:absolute;left:9px;right:6px;bottom:8px;color:var(--muted);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.subject{font-size:11px;color:var(--primary);margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80%}
    .analytics-head{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap}.analytics-head h2{margin-bottom:4px}.analytics-controls{display:flex;gap:8px}.analytics-controls select{width:auto;min-width:130px;padding:9px 11px}.analytics-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.summary-box{border:1px solid var(--line);border-radius:14px;padding:12px;background:#fafbfe}.summary-box .value{font-size:19px;font-weight:800}.summary-box .label{font-size:11px;color:var(--muted);margin-top:3px}.chart-grid{display:grid;grid-template-columns:1.55fr 1fr;gap:14px}.chart-card{border:1px solid var(--line);border-radius:16px;padding:14px;min-width:0}.chart-title{font-size:14px;font-weight:800;margin-bottom:10px}.chart-wrap{width:100%;overflow:hidden}.line-chart{width:100%;height:260px;display:block}.axis-label{font-size:10px;fill:var(--muted)}.grid-line{stroke:var(--line);stroke-width:1}.line-path{fill:none;stroke:var(--primary);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.line-dot{fill:var(--primary)}.bar-list{display:flex;flex-direction:column;gap:12px;min-height:220px}.bar-row{display:grid;grid-template-columns:minmax(80px,130px) 1fr auto;gap:8px;align-items:center}.bar-name{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bar-track{height:12px;background:#eef1f6;border-radius:999px;overflow:hidden}.bar-fill{height:100%;background:var(--primary);border-radius:999px}.bar-value{font-size:11px;color:var(--muted);min-width:55px;text-align:right}.chart-empty{height:220px;display:grid;place-items:center;color:var(--muted);font-size:13px;text-align:center}.legend-note{font-size:11px;color:var(--muted);margin-top:8px}
    @media(max-width:900px){.grid{grid-template-columns:1fr}.chart-grid{grid-template-columns:1fr}.analytics-summary{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:600px){.app{padding:20px 12px 40px}.top h1{font-size:26px}.stats{grid-template-columns:repeat(3,1fr)}.stat .num{font-size:18px}.day{min-height:76px;padding:7px}.subject{display:none}.day-summary{font-size:9px}.row{grid-template-columns:1fr}.analytics-controls{width:100%}.analytics-controls select{flex:1;min-width:0}.analytics-summary{grid-template-columns:repeat(2,1fr)}.bar-row{grid-template-columns:90px 1fr auto}.history-item{gap:6px}.history-actions{flex-wrap:wrap;justify-content:flex-end}.history-note{max-width:170px}}
  `;
  document.head.appendChild(style);

  app.innerHTML = `
    <main class="app">
      <header class="top"><h1>📚 Study Tracker</h1><p class="subtitle">時間・ページ・章など、勉強した量を記録して、学習の進み具合を可視化。</p></header>
      <div class="grid">
        <section>
          <div class="card form-card">
            <div class="card-head"><h2 id="formTitle">学習を記録</h2><span id="editBadge" class="badge hidden">編集中</span></div>
            <label for="date">日付</label><input id="date" type="date" />
            <label for="subject">科目・教材</label><input id="subject" placeholder="例：Python / 基本情報 / 英単語帳" />
            <div class="row"><div><label for="recordType">記録の種類</label><select id="recordType"><option value="minutes">時間</option><option value="pages">ページ数</option><option value="sections">章・セクション</option></select></div><div><label id="amountLabel" for="amount">学習時間（分）</label><input id="amount" type="number" min="0.1" step="1" placeholder="例：60" inputmode="decimal" /></div></div>
            <div class="hint" id="amountHint">勉強した時間を分単位で入力します。</div>
            <label for="range">詳細（任意）</label><input id="range" placeholder="例：学習した範囲や補足" />
            <label for="note">メモ</label><textarea id="note" placeholder="理解したこと、次にやることなど"></textarea>
            <div class="form-actions"><button class="primary" id="saveBtn" type="button">記録する</button><button class="secondary hidden" id="cancelEditBtn" type="button">編集をキャンセル</button></div>
            <div class="flash" id="flash"></div><div class="save-status" id="saveStatus"></div>
          </div>
          <div class="card"><h2>最近の記録</h2><div id="historyList"></div></div>
        </section>
        <section class="card">
          <div class="stats"><div class="stat"><div class="num" id="studyDays">0</div><div class="lab">今月の学習日数</div></div><div class="stat"><div class="num" id="recordCount">0</div><div class="lab">今月の記録回数</div></div><div class="stat"><div class="num" id="streak">0日</div><div class="lab">現在の連続学習</div></div></div>
          <div class="unit-stats" id="unitStats"></div>
          <div class="calendar-head"><h2 id="monthTitle"></h2><div class="nav"><button id="prevBtn" type="button">←</button><button id="todayBtn" type="button">今日</button><button id="nextBtn" type="button">→</button></div></div>
          <div class="weekdays"><div>日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div>土</div></div><div class="calendar" id="calendar"></div>
        </section>
      </div>
      <section class="card">
        <div class="analytics-head"><div><h2>📊 学習統計・可視化</h2><div class="legend-note">期間と指標を切り替えると、学習量の推移と科目別の比率を確認できます。</div></div><div class="analytics-controls"><select id="period"><option value="7">直近7日</option><option value="30" selected>直近30日</option><option value="90">直近90日</option><option value="all">全期間</option></select><select id="metric"><option value="minutes">学習時間</option><option value="pages">ページ数</option><option value="sections">章・セクション</option><option value="records">記録回数</option></select></div></div>
        <div class="analytics-summary"><div class="summary-box"><div class="value" id="totalMetric">0</div><div class="label">期間合計</div></div><div class="summary-box"><div class="value" id="averageMetric">0</div><div class="label">学習日の平均</div></div><div class="summary-box"><div class="value" id="activeMetric">0日</div><div class="label">学習した日数</div></div><div class="summary-box"><div class="value" id="topSubject">—</div><div class="label">最多の科目</div></div></div>
        <div class="chart-grid"><div class="chart-card"><div class="chart-title" id="trendTitle">日別の学習推移</div><div class="chart-wrap"><svg class="line-chart" id="lineChart" viewBox="0 0 760 260" preserveAspectRatio="none"></svg></div></div><div class="chart-card"><div class="chart-title" id="subjectTitle">科目別</div><div id="subjectChart" class="bar-list"></div></div></div>
      </section>
    </main>`;

  const $ = id => document.getElementById(id);
  const dateInput=$('date'), subjectInput=$('subject'), recordTypeInput=$('recordType'), amountInput=$('amount'), amountLabel=$('amountLabel'), amountHint=$('amountHint'), rangeInput=$('range'), noteInput=$('note'), calendar=$('calendar'), monthTitle=$('monthTitle'), studyDays=$('studyDays'), recordCount=$('recordCount'), streak=$('streak'), unitStats=$('unitStats'), historyList=$('historyList'), saveStatus=$('saveStatus'), flash=$('flash'), saveBtn=$('saveBtn'), cancelEditBtn=$('cancelEditBtn'), editBadge=$('editBadge'), formTitle=$('formTitle');

  function readRecords(){
    try{const current=localStorage.getItem(STORAGE_KEY);if(current)return normalizeRecords(JSON.parse(current));const legacy=JSON.parse(localStorage.getItem(LEGACY_KEY)||'[]');return legacy.map(r=>({id:r.id||makeId(),date:r.date,subject:r.subject||'',type:'minutes',amount:Number(r.minutes||0),rawAmount:'',range:'',note:r.note||'',createdAt:r.createdAt||new Date().toISOString()}))}catch(e){storageAvailable=false;return[]}
  }
  function normalizeRecords(list){return Array.isArray(list)?list.filter(Boolean).map(r=>({...r,id:r.id||makeId(),date:r.date||localDateString(),type:r.type||'minutes',amount:Number(r.amount??r.minutes??0),rawAmount:r.rawAmount||'',subject:r.subject||'',range:r.range||'',note:r.note||'',createdAt:r.createdAt||new Date().toISOString()})):[]}
  function saveRecords(){if(!storageAvailable)return false;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(records));return true}catch(e){storageAvailable=false;return false}}
  function localDateString(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
  function makeId(){try{if(window.crypto?.randomUUID)return window.crypto.randomUUID()}catch(e){}return `${Date.now()}-${Math.random().toString(36).slice(2)}`}
  function getType(r){return TYPE_META[r.type]?r.type:'minutes'}
  function getAmount(r){const n=Number(r.amount??r.minutes);return Number.isFinite(n)?n:0}
  function formatNumber(n){return Number.isInteger(n)?String(n):n.toFixed(1).replace(/\.0$/,'')}
  function formatValue(r){const t=getType(r),m=TYPE_META[t];return r.rawAmount||`${formatNumber(getAmount(r))}${m.unit}`}
  function parseStudyAmount(type,raw){
    const text=String(raw||'').trim();if(!text)return null;if(type==='minutes'){const n=Number(text);return Number.isFinite(n)&&n>0?n:null}
    const normalized=text.replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).replace(/[〜～–—]/g,'-');
    const range=normalized.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);if(range){const a=Number(range[1]),b=Number(range[2]);if(b>=a)return type==='pages'?b-a+1:Math.floor(b)-Math.floor(a)+1}
    const one=normalized.match(/^\s*(?:p\.?\s*)?(\d+(?:\.\d+)?)\s*(?:ページ|頁|章|節|section|sections)?\s*$/i);if(one)return Number(one[1]);
    if(type==='sections'&&/(?:第?\s*\d+\s*章|section\s*\d+)/i.test(normalized))return 1;return null
  }
  function updateAmountUI(){const m=TYPE_META[recordTypeInput.value];amountLabel.textContent=m.field;amountInput.placeholder=m.placeholder;amountHint.textContent=m.hint;amountInput.type=m.inputType;amountInput.inputMode=m.inputMode;if(m.inputType==='number'){amountInput.min='0.1';amountInput.step='1'}else{amountInput.removeAttribute('min');amountInput.removeAttribute('step')}}
  function groupedByDate(){return records.reduce((a,r)=>{(a[r.date]??=[]).push(r);return a},{})}
  function currentStreak(){const set=new Set(records.map(r=>r.date));let d=new Date();if(!set.has(localDateString(d)))d.setDate(d.getDate()-1);let c=0;while(set.has(localDateString(d))){c++;d.setDate(d.getDate()-1)}return c}
  function showFlash(message){flash.textContent=`✓ ${message}`;flash.classList.add('show');clearTimeout(showFlash.timer);showFlash.timer=setTimeout(()=>flash.classList.remove('show'),1800)}
  function updateStorageStatus(){saveStatus.textContent=storageAvailable?'この端末のブラウザに自動保存されます':'この表示環境では端末保存が使えないため、画面を閉じると記録が消える場合があります';saveStatus.className=storageAvailable?'save-status':'save-status warn'}

  function renderCalendar(){
    calendar.innerHTML='';const year=viewDate.getFullYear(),month=viewDate.getMonth();monthTitle.textContent=`${year}年 ${month+1}月`;const first=new Date(year,month,1).getDay(),last=new Date(year,month+1,0).getDate(),grouped=groupedByDate();
    for(let i=0;i<first;i++){const e=document.createElement('div');e.className='day empty';calendar.appendChild(e)}
    let days=0,count=0;const totals={minutes:0,pages:0,sections:0};
    for(let day=1;day<=last;day++){const key=localDateString(new Date(year,month,day)),dayRecords=grouped[key]||[];if(dayRecords.length){days++;count+=dayRecords.length;dayRecords.forEach(r=>{const t=getType(r);totals[t]+=getAmount(r)})}const cell=document.createElement('div');cell.className='day';if(key===localDateString())cell.classList.add('today');const n=document.createElement('div');n.className='date-num';n.textContent=day;cell.appendChild(n);if(dayRecords.length){const check=document.createElement('div');check.className='check';check.textContent='✓';const subject=document.createElement('div');subject.className='subject';subject.textContent=dayRecords.map(r=>r.subject).filter(Boolean).join('・');const summary=document.createElement('div');summary.className='day-summary';summary.textContent=summarize(dayRecords);cell.append(check,subject,summary)}cell.addEventListener('click',()=>{dateInput.value=key;dateInput.scrollIntoView({behavior:'smooth',block:'center'})});calendar.appendChild(cell)}
    studyDays.textContent=days;recordCount.textContent=count;streak.textContent=`${currentStreak()}日`;unitStats.innerHTML='';[['minutes',totals.minutes,'分'],['pages',totals.pages,'ページ'],['sections',totals.sections,'章']].forEach(([t,v,u])=>{const chip=document.createElement('div');chip.className='unit-chip';chip.innerHTML=`${TYPE_META[t].label}<strong>${formatNumber(v)}${u}</strong>`;unitStats.appendChild(chip)})
  }
  function summarize(rs){const totals={minutes:0,pages:0,sections:0};rs.forEach(r=>{const t=getType(r);totals[t]+=getAmount(r)});return Object.entries(totals).filter(([,v])=>v>0).map(([t,v])=>`${formatNumber(v)}${TYPE_META[t].short}`).join('・')}

  function renderHistory(){
    historyList.innerHTML='';const sorted=[...records].sort((a,b)=>`${b.date}${b.createdAt||''}`.localeCompare(`${a.date}${a.createdAt||''}`)).slice(0,20);if(!sorted.length){historyList.innerHTML='<div class="empty-state">まだ記録がありません。</div>';return}
    sorted.forEach(r=>{const row=document.createElement('div');row.className='history-item';const left=document.createElement('div');left.className='history-main';const title=document.createElement('div');title.className='history-title';title.textContent=r.subject||'学習';const note=document.createElement('div');note.className='history-note';note.textContent=[r.date,TYPE_META[getType(r)].label,r.range,r.note].filter(Boolean).join(' ・ ');left.append(title,note);const right=document.createElement('div');right.className='history-actions';const value=document.createElement('span');value.className='history-value';value.textContent=formatValue(r);const edit=document.createElement('button');edit.className='small-btn edit-btn';edit.textContent='編集';edit.addEventListener('click',()=>startEdit(r.id));const del=document.createElement('button');del.className='small-btn delete-btn';del.textContent='削除';del.addEventListener('click',()=>deleteRecord(r.id));right.append(value,edit,del);row.append(left,right);historyList.appendChild(row)})
  }

  function resetForm(){editingId=null;formTitle.textContent='学習を記録';editBadge.classList.add('hidden');saveBtn.textContent='記録する';cancelEditBtn.classList.add('hidden');dateInput.value=localDateString();subjectInput.value='';recordTypeInput.value='minutes';amountInput.value='';rangeInput.value='';noteInput.value='';updateAmountUI()}
  function startEdit(id){const r=records.find(x=>x.id===id);if(!r)return;editingId=id;formTitle.textContent='学習記録を編集';editBadge.classList.remove('hidden');saveBtn.textContent='変更を保存';cancelEditBtn.classList.remove('hidden');dateInput.value=r.date;subjectInput.value=r.subject||'';recordTypeInput.value=getType(r);updateAmountUI();amountInput.value=r.rawAmount||formatNumber(getAmount(r));rangeInput.value=r.range||'';noteInput.value=r.note||'';document.querySelector('.form-card')?.scrollIntoView({behavior:'smooth',block:'center'})}
  function deleteRecord(id){const r=records.find(x=>x.id===id);if(!r)return;if(!confirm(`「${r.subject||'学習'}」の記録を削除しますか？`))return;records=records.filter(x=>x.id!==id);saveRecords();if(editingId===id)resetForm();renderAll();showFlash('記録を削除しました')}
  function saveEntry(){
    const date=dateInput.value,raw=amountInput.value.trim(),type=recordTypeInput.value,amount=parseStudyAmount(type,raw);if(!date){alert('日付を選んでください');return}if(!raw){alert('学習量を入力してください');return}if(amount===null){alert(type==='minutes'?'学習時間を数字で入力してください':'学習量を数値または範囲で入力してください');return}
    const data={date,subject:subjectInput.value.trim(),type,amount,rawAmount:type==='minutes'?'':raw,range:rangeInput.value.trim(),note:noteInput.value.trim()};
    if(editingId){const index=records.findIndex(r=>r.id===editingId);if(index>=0)records[index]={...records[index],...data};saveRecords();const chosen=new Date(`${date}T00:00:00`);viewDate=new Date(chosen.getFullYear(),chosen.getMonth(),1);resetForm();renderAll();showFlash('記録を更新しました')}
    else{records.push({id:makeId(),...data,createdAt:new Date().toISOString()});saveRecords();const chosen=new Date(`${date}T00:00:00`);viewDate=new Date(chosen.getFullYear(),chosen.getMonth(),1);subjectInput.value='';amountInput.value='';rangeInput.value='';noteInput.value='';renderAll();showFlash('記録しました')}
  }

  function getMetricValue(r,metric){return metric==='records'?1:getAmount(r)}
  function metricMeta(metric){return metric==='minutes'?{label:'学習時間',unit:'分'}:metric==='pages'?{label:'ページ数',unit:'ページ'}:metric==='sections'?{label:'章・セクション',unit:'節'}:{label:'記録回数',unit:'回'}}
  function formatMetric(v,metric){const n=formatNumber(v);return metric==='minutes'&&v>=60?`${formatNumber(v/60)}時間`:metric==='records'?`${n}回`:`${n}${metricMeta(metric).unit}`}
  function getAnalyticsRange(){const today=new Date();today.setHours(0,0,0,0);const p=$('period').value;if(p==='all'){if(!records.length)return{start:today,end:today};const dates=records.map(r=>new Date(`${r.date}T00:00:00`));return{start:new Date(Math.min(...dates.map(d=>d.getTime()))),end:today}}const start=new Date(today);start.setDate(start.getDate()-Number(p)+1);return{start,end:today}}
  function datesBetween(start,end){const out=[];for(const d=new Date(start);d<=end;d.setDate(d.getDate()+1))out.push(localDateString(d));return out}
  function renderAnalytics(){
    const metric=$('metric').value,meta=metricMeta(metric),{start,end}=getAnalyticsRange(),keys=datesBetween(start,end),inRange=records.filter(r=>{const t=new Date(`${r.date}T00:00:00`);return t>=start&&t<=end});
    const daily=keys.map(date=>({date,value:inRange.filter(r=>r.date===date).reduce((s,r)=>s+getMetricValue(r,metric),0)})),total=daily.reduce((s,d)=>s+d.value,0),active=daily.filter(d=>d.value>0).length,average=active?total/active:0;
    $('totalMetric').textContent=formatMetric(total,metric);$('averageMetric').textContent=formatMetric(average,metric);$('activeMetric').textContent=`${active}日`;
    const subjectTotals={};inRange.forEach(r=>{const name=r.subject?.trim()||'未分類';subjectTotals[name]=(subjectTotals[name]||0)+getMetricValue(r,metric)});const subjects=Object.entries(subjectTotals).sort((a,b)=>b[1]-a[1]);$('topSubject').textContent=subjects[0]?.[0]||'—';$('trendTitle').textContent=`日別の${meta.label}`;$('subjectTitle').textContent=`科目別の${meta.label}`;renderLineChart(daily,metric);renderSubjectBars(subjects,metric)
  }
  function renderLineChart(daily,metric){const svg=$('lineChart'),W=760,H=260,L=42,R=16,T=18,B=34;svg.innerHTML='';if(!daily.length||daily.every(d=>d.value===0)){svg.innerHTML='<text x="380" y="130" text-anchor="middle" class="axis-label">この期間の学習データがありません</text>';return}const max=Math.max(...daily.map(d=>d.value),1),innerW=W-L-R,innerH=H-T-B,pts=daily.map((d,i)=>({x:L+(daily.length===1?innerW/2:i*innerW/(daily.length-1)),y:T+innerH-(d.value/max)*innerH,...d}));[0,.5,1].forEach(f=>{const y=T+innerH*(1-f),line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',L);line.setAttribute('x2',W-R);line.setAttribute('y1',y);line.setAttribute('y2',y);line.setAttribute('class','grid-line');svg.appendChild(line);const text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x',L-7);text.setAttribute('y',y+4);text.setAttribute('text-anchor','end');text.setAttribute('class','axis-label');text.textContent=formatNumber(max*f);svg.appendChild(text)});const poly=document.createElementNS('http://www.w3.org/2000/svg','polyline');poly.setAttribute('points',pts.map(p=>`${p.x},${p.y}`).join(' '));poly.setAttribute('class','line-path');svg.appendChild(poly);const step=Math.max(1,Math.ceil(daily.length/7));pts.forEach((p,i)=>{if(i%step!==0&&i!==pts.length-1)return;const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r',4);c.setAttribute('class','line-dot');c.setAttribute('title',`${p.date}: ${formatMetric(p.value,metric)}`);svg.appendChild(c);const tx=document.createElementNS('http://www.w3.org/2000/svg','text');tx.setAttribute('x',p.x);tx.setAttribute('y',H-10);tx.setAttribute('text-anchor','middle');tx.setAttribute('class','axis-label');tx.textContent=p.date.slice(5).replace('-','/');svg.appendChild(tx)})}
  function renderSubjectBars(subjects,metric){const box=$('subjectChart');box.innerHTML='';if(!subjects.length){box.innerHTML='<div class="chart-empty">この期間の学習データがありません</div>';return}const top=subjects.slice(0,8),max=top[0][1]||1;top.forEach(([name,value])=>{const row=document.createElement('div');row.className='bar-row';const n=document.createElement('div');n.className='bar-name';n.textContent=name;const track=document.createElement('div');track.className='bar-track';const fill=document.createElement('div');fill.className='bar-fill';fill.style.width=`${Math.max(2,value/max*100)}%`;track.appendChild(fill);const v=document.createElement('div');v.className='bar-value';v.textContent=formatMetric(value,metric);row.append(n,track,v);box.appendChild(row)})}
  function renderAll(){renderCalendar();renderHistory();updateStorageStatus();renderAnalytics()}

  dateInput.value=localDateString();updateAmountUI();
  saveBtn.addEventListener('click',saveEntry);cancelEditBtn.addEventListener('click',()=>{resetForm();showFlash('編集をキャンセルしました')});recordTypeInput.addEventListener('change',updateAmountUI);$('prevBtn').addEventListener('click',()=>{viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()-1,1);renderCalendar()});$('nextBtn').addEventListener('click',()=>{viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()+1,1);renderCalendar()});$('todayBtn').addEventListener('click',()=>{viewDate=new Date();dateInput.value=localDateString();renderCalendar()});$('period').addEventListener('change',renderAnalytics);$('metric').addEventListener('change',renderAnalytics);
  renderAll();
})();
