(() => {
  'use strict';

  const RECORDS_KEY = 'studyTrackerRecordsV2';
  const MATERIALS_KEY = 'studyTrackerMaterialsV1';
  const originalSetItem = Storage.prototype.setItem;
  let materials = readMaterials();
  let editingRecordId = null;
  let editingMaterialId = null;
  let beforeSave = null;
  let decorating = false;

  const $ = id => document.getElementById(id);
  const subjectInput = $('subject');
  const saveBtn = $('saveBtn');
  const cancelEditBtn = $('cancelEditBtn');
  const historyList = $('historyList');
  if (!subjectInput || !saveBtn || !historyList) return;

  // Keep material links even though the original app does not know about them yet.
  Storage.prototype.setItem = function(key, value) {
    if (this === localStorage && key === RECORDS_KEY) {
      try {
        const incoming = JSON.parse(value);
        const current = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
        const currentLinks = new Map(current.map(r => [r.id, r.materialId || '']));
        const validIds = new Set(readMaterials().map(m => m.id));
        if (Array.isArray(incoming)) {
          incoming.forEach(r => {
            if (!r || !r.id) return;
            if (!Object.prototype.hasOwnProperty.call(r, 'materialId')) r.materialId = currentLinks.get(r.id) || '';
            if (r.materialId && !validIds.has(r.materialId)) r.materialId = '';
          });
          value = JSON.stringify(incoming);
        }
      } catch (e) {}
    }
    return originalSetItem.call(this, key, value);
  };

  const style = document.createElement('style');
  style.textContent = `
    .mt-material-row{display:grid;grid-template-columns:1fr auto;gap:8px}.mt-material-row select{min-width:0}.mt-add-btn{white-space:nowrap;background:var(--primary-soft);color:var(--primary);min-width:98px}.mt-note{font-size:11px;color:var(--muted);margin-top:6px;line-height:1.5}
    .mt-tag{display:inline-flex;align-items:center;background:#f0f4ff;color:#3c63c9;border-radius:999px;padding:3px 8px;font-size:11px;font-weight:700;margin-right:6px;vertical-align:1px}.mt-tag.none{background:#f3f5f8;color:var(--muted)}
    .mt-card{margin-top:20px}.mt-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}.mt-card-head h2{margin:0}.mt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.mt-item{border:1px solid var(--line);border-radius:16px;padding:14px;background:#fff;min-width:0}.mt-title{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mt-meta{font-size:11px;color:var(--muted);margin-top:4px}.mt-totals{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px}.mt-chip{font-size:11px;background:#f5f7fa;border:1px solid var(--line);border-radius:999px;padding:5px 8px}.mt-actions{display:flex;gap:6px;margin-top:11px}.mt-actions button{flex:1;padding:7px 8px;font-size:12px}.mt-edit{background:var(--primary-soft);color:var(--primary)}.mt-delete{background:#fff0f0;color:var(--danger)}
    .mt-dialog{width:min(480px,calc(100% - 28px));border:0;border-radius:22px;padding:0;background:var(--card);color:var(--text);box-shadow:0 24px 70px rgba(22,32,51,.24)}.mt-dialog::backdrop{background:rgba(18,27,44,.48);backdrop-filter:blur(2px)}.mt-dialog-inner{padding:20px}.mt-dialog-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}.mt-dialog-head h3{margin:0;font-size:19px}.mt-dialog-sub{font-size:12px;color:var(--muted);margin-top:4px}.mt-close{background:#f1f4f8;color:var(--text);width:40px;height:40px;padding:0;border-radius:50%;font-size:18px}.mt-dialog-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.mt-dialog-actions button{min-height:44px}
    @media(max-width:900px){.mt-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.mt-material-row{grid-template-columns:1fr}.mt-add-btn{width:100%}.mt-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const label = document.createElement('label');
  label.htmlFor = 'materialSelect';
  label.textContent = '学習教材';
  const row = document.createElement('div');
  row.className = 'mt-material-row';
  const select = document.createElement('select');
  select.id = 'materialSelect';
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'mt-add-btn';
  addBtn.textContent = '＋ 教材登録';
  row.append(select, addBtn);
  const note = document.createElement('div');
  note.className = 'mt-note';
  note.textContent = '教材を選ばない記録・これまでの記録は「教材なし」にまとめられます。';
  subjectInput.insertAdjacentElement('afterend', note);
  subjectInput.insertAdjacentElement('afterend', row);
  subjectInput.insertAdjacentElement('afterend', label);

  const dialog = document.createElement('dialog');
  dialog.className = 'mt-dialog';
  dialog.innerHTML = `
    <div class="mt-dialog-inner">
      <div class="mt-dialog-head"><div><h3 id="mtDialogTitle">教材を登録</h3><div class="mt-dialog-sub">登録した教材を学習記録から選択できます。</div></div><button id="mtClose" class="mt-close" type="button">×</button></div>
      <label for="mtName">教材名</label><input id="mtName" maxlength="80" placeholder="例：基本情報技術者 合格教本" />
      <label for="mtCategory">カテゴリ・科目（任意）</label><input id="mtCategory" maxlength="50" placeholder="例：基本情報 / 数学 / Python" />
      <label for="mtMemo">メモ（任意）</label><textarea id="mtMemo" maxlength="200" placeholder="版、目標、補足など"></textarea>
      <div class="mt-dialog-actions"><button id="mtCancel" class="secondary" type="button">キャンセル</button><button id="mtSave" class="primary" type="button">登録</button></div>
    </div>`;
  document.body.appendChild(dialog);

  const main = document.querySelector('main.app');
  const section = document.createElement('section');
  section.className = 'card mt-card';
  section.innerHTML = `<div class="mt-card-head"><div><h2>📚 登録教材</h2><div class="mt-note">教材ごとの累計。未登録の記録は「教材なし」に入ります。</div></div><button id="mtAdd2" class="mt-add-btn" type="button">＋ 教材登録</button></div><div id="mtGrid" class="mt-grid"></div>`;
  main?.appendChild(section);

  function readMaterials(){
    try {
      const value = JSON.parse(localStorage.getItem(MATERIALS_KEY) || '[]');
      return Array.isArray(value) ? value.filter(m => m && m.id && m.name).map(m => ({...m, category:m.category||'', memo:m.memo||''})) : [];
    } catch (e) { return []; }
  }
  function readRecords(){
    try { const v = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function rawSaveRecords(records){ originalSetItem.call(localStorage, RECORDS_KEY, JSON.stringify(records)); }
  function saveMaterials(){ originalSetItem.call(localStorage, MATERIALS_KEY, JSON.stringify(materials)); }
  function makeId(){ try { if (crypto?.randomUUID) return crypto.randomUUID(); } catch(e){} return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function materialById(id){ return materials.find(m => m.id === id) || null; }
  function materialName(record){ return materialById(record?.materialId)?.name || '教材なし'; }
  function getType(r){ return ['minutes','pages','sections'].includes(r?.type) ? r.type : 'minutes'; }
  function getAmount(r){ const n = Number(r?.amount ?? r?.minutes); return Number.isFinite(n) ? n : 0; }
  function fmt(n){ return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/,''); }
  function fmtMinutes(total){ total=Math.max(0,Math.round(Number(total)||0)); const h=Math.floor(total/60),m=total%60; return h===0?`${m}分`:m===0?`${h}時間`:`${h}時間${m}分`; }

  function renderSelect(selected = select.value){
    materials = readMaterials();
    select.innerHTML = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = '教材なし';
    select.appendChild(none);
    [...materials].sort((a,b)=>a.name.localeCompare(b.name,'ja')).forEach(m => {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.category ? `${m.name}（${m.category}）` : m.name;
      select.appendChild(option);
    });
    select.value = materials.some(m => m.id === selected) ? selected : '';
  }

  function sortedRecentRecords(){
    return readRecords().sort((a,b)=>`${b.date||''}${b.createdAt||''}`.localeCompare(`${a.date||''}${a.createdAt||''}`)).slice(0,20);
  }

  function decorateHistory(){
    if (decorating) return;
    decorating = true;
    const records = sortedRecentRecords();
    [...historyList.querySelectorAll('.history-item')].forEach((row, i) => {
      row.querySelectorAll('.mt-tag').forEach(x => x.remove());
      const title = row.querySelector('.history-title');
      if (!title || !records[i]) return;
      const tag = document.createElement('span');
      tag.className = `mt-tag${records[i].materialId && materialById(records[i].materialId) ? '' : ' none'}`;
      tag.textContent = materialName(records[i]);
      title.prepend(tag);
    });
    decorating = false;
  }

  function renderCards(){
    materials = readMaterials();
    const records = readRecords();
    const grid = $('mtGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const entries = [{id:'',name:'教材なし',category:'未登録・既存記録',system:true}, ...materials];
    entries.forEach(m => {
      const rs = records.filter(r => m.id ? r.materialId === m.id : !r.materialId || !materialById(r.materialId));
      const totals = {minutes:0,pages:0,sections:0};
      rs.forEach(r => totals[getType(r)] += getAmount(r));
      const card = document.createElement('div');
      card.className = 'mt-item';
      card.innerHTML = `<div class="mt-title"></div><div class="mt-meta"></div><div class="mt-totals"></div>`;
      card.querySelector('.mt-title').textContent = m.name;
      card.querySelector('.mt-meta').textContent = [m.category, `${rs.length}件`].filter(Boolean).join(' ・ ');
      const totalsBox = card.querySelector('.mt-totals');
      [`⏱ ${fmtMinutes(totals.minutes)}`, `📖 ${fmt(totals.pages)}p`, `📚 ${fmt(totals.sections)}節`].forEach(text => {
        const chip = document.createElement('span'); chip.className='mt-chip'; chip.textContent=text; totalsBox.appendChild(chip);
      });
      if (!m.system) {
        const actions = document.createElement('div'); actions.className='mt-actions';
        const edit = document.createElement('button'); edit.type='button'; edit.className='mt-edit'; edit.textContent='編集'; edit.addEventListener('click',()=>openEditor(m.id));
        const del = document.createElement('button'); del.type='button'; del.className='mt-delete'; del.textContent='削除'; del.addEventListener('click',()=>deleteMaterial(m.id));
        actions.append(edit,del); card.appendChild(actions);
      }
      grid.appendChild(card);
    });
  }

  function openEditor(id = null){
    editingMaterialId = id;
    const m = materialById(id);
    $('mtDialogTitle').textContent = m ? '教材を編集' : '教材を登録';
    $('mtSave').textContent = m ? '変更を保存' : '登録';
    $('mtName').value = m?.name || '';
    $('mtCategory').value = m?.category || '';
    $('mtMemo').value = m?.memo || '';
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open','');
    setTimeout(()=>$('mtName').focus(),0);
  }
  function closeEditor(){ if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); }
  function saveMaterial(){
    const name = $('mtName').value.trim();
    if (!name) { alert('教材名を入力してください'); return; }
    let selectedId;
    if (editingMaterialId) {
      const i = materials.findIndex(m => m.id === editingMaterialId);
      if (i >= 0) materials[i] = {...materials[i], name, category:$('mtCategory').value.trim(), memo:$('mtMemo').value.trim(), updatedAt:new Date().toISOString()};
      selectedId = editingMaterialId;
    } else {
      const m = {id:makeId(), name, category:$('mtCategory').value.trim(), memo:$('mtMemo').value.trim(), createdAt:new Date().toISOString()};
      materials.push(m); selectedId = m.id;
    }
    saveMaterials(); closeEditor(); renderSelect(selectedId); renderCards(); decorateHistory();
  }
  function deleteMaterial(id){
    const m = materialById(id); if (!m) return;
    const records = readRecords();
    const count = records.filter(r => r.materialId === id).length;
    if (!confirm(`「${m.name}」を削除しますか？\n紐づいている${count}件の記録は「教材なし」に移動します。`)) return;
    materials = materials.filter(x => x.id !== id); saveMaterials();
    records.forEach(r => { if (r.materialId === id) { r.materialId=''; r.updatedAt=new Date().toISOString(); } });
    rawSaveRecords(records);
    renderSelect(select.value === id ? '' : select.value); renderCards(); decorateHistory();
  }

  // Determine which record is being edited from the rendered history order.
  historyList.addEventListener('click', e => {
    const edit = e.target.closest('.edit-btn');
    if (!edit) return;
    const row = edit.closest('.history-item');
    const rows = [...historyList.querySelectorAll('.history-item')];
    const record = sortedRecentRecords()[rows.indexOf(row)];
    editingRecordId = record?.id || null;
    renderSelect(record?.materialId || '');
  });

  // Capture storage before the original app handles the save, then attach the selected material after it succeeds.
  saveBtn.addEventListener('click', () => { beforeSave = localStorage.getItem(RECORDS_KEY) || '[]'; }, true);
  saveBtn.addEventListener('click', () => {
    const after = localStorage.getItem(RECORDS_KEY) || '[]';
    if (after === beforeSave) return;
    const records = readRecords();
    let target = editingRecordId ? records.find(r => r.id === editingRecordId) : null;
    if (!target) target = [...records].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0];
    if (target) {
      target.materialId = materials.some(m => m.id === select.value) ? select.value : '';
      rawSaveRecords(records);
    }
    editingRecordId = null;
    setTimeout(() => { decorateHistory(); renderCards(); }, 0);
  });

  cancelEditBtn?.addEventListener('click', () => { editingRecordId=null; renderSelect(''); });
  const observer = new MutationObserver(() => { if (!decorating) setTimeout(decorateHistory,0); });
  observer.observe(historyList, {childList:true, subtree:true});

  addBtn.addEventListener('click',()=>openEditor());
  $('mtAdd2')?.addEventListener('click',()=>openEditor());
  $('mtClose').addEventListener('click',closeEditor);
  $('mtCancel').addEventListener('click',closeEditor);
  $('mtSave').addEventListener('click',saveMaterial);
  dialog.addEventListener('click', e => { if (e.target === dialog) closeEditor(); });

  renderSelect();
  renderCards();
  decorateHistory();
})();