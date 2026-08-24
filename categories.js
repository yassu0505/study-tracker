(() => {
  'use strict';

  const MATERIALS_KEY = 'studyTrackerMaterialsV1';
  const CATEGORIES_KEY = 'studyTrackerMaterialCategoriesV1';
  const RECORDS_KEY = 'studyTrackerRecordsV2';
  const DEFAULT_COLORS = ['#4f7cff','#2f9e73','#8b5cf6','#e67e22','#d94f70','#2684c7','#7b8d42','#b55cc7','#c66a2b','#3f7f89'];

  const $ = id => document.getElementById(id);
  const categoryField = $('mtCategory');
  const materialDialog = document.querySelector('.mt-dialog');
  if (!categoryField || !materialDialog) return;

  function readMaterials(){
    try {
      const value = JSON.parse(localStorage.getItem(MATERIALS_KEY) || '[]');
      return Array.isArray(value) ? value.filter(Boolean) : [];
    } catch (e) { return []; }
  }

  function saveMaterials(materials){ localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials)); }

  function readRecords(){
    try {
      const value = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (e) { return []; }
  }

  function normalizeCategory(value){ return String(value || '').trim().replace(/\s+/g, ' '); }

  function normalizeColor(value, fallback = '#4f7cff'){
    const color = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
  }

  function colorFromName(name){
    let hash = 0;
    for (const ch of normalizeCategory(name)) hash = ((hash << 5) - hash + ch.codePointAt(0)) | 0;
    return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
  }

  function normalizeCategoryEntry(value){
    if (typeof value === 'string') {
      const name = normalizeCategory(value);
      return name ? { name, color: colorFromName(name) } : null;
    }
    if (value && typeof value === 'object') {
      const name = normalizeCategory(value.name);
      return name ? { name, color: normalizeColor(value.color, colorFromName(name)) } : null;
    }
    return null;
  }

  function uniqueCategories(values){
    const map = new Map();
    values.forEach(value => {
      const item = normalizeCategoryEntry(value);
      if (!item) return;
      const key = item.name.toLocaleLowerCase('ja-JP');
      if (!map.has(key)) map.set(key, item);
      else if (value && typeof value === 'object' && value.color) map.get(key).color = normalizeColor(value.color, map.get(key).color);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }

  function readCategories(){
    let stored = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '[]');
      if (Array.isArray(parsed)) stored = parsed;
    } catch (e) {}

    const fromMaterials = readMaterials().map(m => ({ name: m?.category, color: colorFromName(m?.category) }));
    // 教材由来の初期値を先に置き、保存済みカテゴリを後に置くことでユーザーが選んだ色を優先する。
    const merged = uniqueCategories([...fromMaterials, ...stored]);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(merged));
    return merged;
  }

  let categories = readCategories();

  const style = document.createElement('style');
  style.textContent = `
    .ct-category-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
    .ct-manage-btn{white-space:nowrap;background:var(--primary-soft);color:var(--primary);min-width:112px}
    .ct-dialog{width:min(520px,calc(100% - 28px));border:0;border-radius:22px;padding:0;background:var(--card);color:var(--text);box-shadow:0 24px 70px rgba(22,32,51,.24)}
    .ct-dialog::backdrop{background:rgba(18,27,44,.48);backdrop-filter:blur(2px)}
    .ct-inner{padding:20px}.ct-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}.ct-head h3{margin:0;font-size:19px}.ct-sub{font-size:12px;color:var(--muted);margin-top:4px}.ct-close{background:#f1f4f8;color:var(--text);width:40px;height:40px;padding:0;border-radius:50%;font-size:18px}
    .ct-add-row{display:grid;grid-template-columns:1fr 56px auto;gap:8px;align-items:center}.ct-add-row button{background:var(--primary);color:#fff;min-width:72px}.ct-color-input{width:48px;height:44px;padding:3px;border-radius:12px;cursor:pointer}.ct-color-input::-webkit-color-swatch-wrapper{padding:2px}.ct-color-input::-webkit-color-swatch{border:0;border-radius:8px}
    .ct-list{display:flex;flex-direction:column;gap:8px;margin-top:16px;max-height:320px;overflow:auto}.ct-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto auto;align-items:center;gap:10px;border:1px solid var(--line);border-radius:12px;padding:9px 10px}.ct-swatch{width:18px;height:18px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}.ct-name{font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ct-count{font-size:11px;color:var(--muted);white-space:nowrap}.ct-delete{background:#fff0f0;color:var(--danger);padding:7px 9px;font-size:12px}.ct-empty{color:var(--muted);font-size:13px;padding:12px 0;text-align:center}
    .ct-help{font-size:11px;color:var(--muted);line-height:1.5;margin-top:8px}.ct-item .ct-color-input{width:38px;height:36px;border-radius:9px}
    #mtGrid .mt-item.ct-colored{border-top-width:4px}.mt-tag.ct-colored-tag{border:1px solid transparent}
    @media(max-width:600px){.ct-category-row{grid-template-columns:1fr}.ct-manage-btn{width:100%}.ct-add-row{grid-template-columns:1fr 52px}.ct-add-row button{grid-column:1/-1;width:100%}.ct-item{grid-template-columns:auto minmax(0,1fr) auto auto}.ct-count{display:none}.ct-delete{grid-column:4}.ct-item .ct-color-input{grid-column:3}}
  `;
  document.head.appendChild(style);

  const categorySelect = document.createElement('select');
  categorySelect.id = 'mtCategory';
  categorySelect.setAttribute('aria-label', '教材ジャンル');
  const currentCategory = normalizeCategory(categoryField.value);
  categoryField.replaceWith(categorySelect);

  const categoryRow = document.createElement('div');
  categoryRow.className = 'ct-category-row';
  categorySelect.parentNode.insertBefore(categoryRow, categorySelect);
  categoryRow.appendChild(categorySelect);

  const manageButton = document.createElement('button');
  manageButton.type = 'button';
  manageButton.className = 'ct-manage-btn';
  manageButton.textContent = 'ジャンル管理';
  categoryRow.appendChild(manageButton);

  const help = document.createElement('div');
  help.className = 'ct-help';
  help.textContent = 'ジャンルは追加・削除でき、色も自由に変更できます。色は教材カードと学習記録のタグに反映されます。';
  categoryRow.insertAdjacentElement('afterend', help);

  const dialog = document.createElement('dialog');
  dialog.className = 'ct-dialog';
  dialog.innerHTML = `
    <div class="ct-inner">
      <div class="ct-head">
        <div><h3>教材ジャンル管理</h3><div class="ct-sub">ジャンル名と表示色を管理できます。</div></div>
        <button id="ctClose" class="ct-close" type="button" aria-label="閉じる">×</button>
      </div>
      <label for="ctNewCategory">新しいジャンル</label>
      <div class="ct-add-row">
        <input id="ctNewCategory" maxlength="50" placeholder="例：数学 / プログラミング / 資格" />
        <input id="ctNewColor" class="ct-color-input" type="color" value="#4f7cff" aria-label="新しいカテゴリの色" />
        <button id="ctAdd" type="button">追加</button>
      </div>
      <div class="ct-help">色はいつでも変更できます。使用中のジャンルを削除しても教材や学習記録は消えず、該当教材だけ「ジャンルなし」になります。</div>
      <div id="ctList" class="ct-list"></div>
    </div>`;
  document.body.appendChild(dialog);

  function categoryByName(name){
    const key = normalizeCategory(name).toLocaleLowerCase('ja-JP');
    return categories.find(c => c.name.toLocaleLowerCase('ja-JP') === key) || null;
  }

  function hexToRgb(hex){
    const normalized = normalizeColor(hex).slice(1);
    return { r:parseInt(normalized.slice(0,2),16), g:parseInt(normalized.slice(2,4),16), b:parseInt(normalized.slice(4,6),16) };
  }

  function rgba(hex, alpha){ const {r,g,b}=hexToRgb(hex); return `rgba(${r},${g},${b},${alpha})`; }

  function readableAccent(hex){
    const {r,g,b}=hexToRgb(hex);
    const lum=(0.299*r+0.587*g+0.114*b)/255;
    return lum<0.58 ? hex : `rgb(${Math.round(r*.55)},${Math.round(g*.55)},${Math.round(b*.55)})`;
  }

  function renderCategorySelect(selected = categorySelect.value){
    categories = readCategories();
    categorySelect.innerHTML = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'ジャンルなし';
    categorySelect.appendChild(none);
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.name;
      option.textContent = category.name;
      option.style.color = readableAccent(category.color);
      categorySelect.appendChild(option);
    });
    categorySelect.value = categories.some(c => c.name === selected) ? selected : '';
    updateSelectAccent();
  }

  function updateSelectAccent(){
    const category = categoryByName(categorySelect.value);
    categorySelect.style.borderLeft = category ? `6px solid ${category.color}` : '';
    categorySelect.style.paddingLeft = category ? '10px' : '';
  }

  function categoryUsage(name){ return readMaterials().filter(m => normalizeCategory(m?.category) === name).length; }

  function renderCategoryList(){
    categories = readCategories();
    const list = $('ctList');
    list.innerHTML = '';
    if (!categories.length) { list.innerHTML = '<div class="ct-empty">まだジャンルがありません。</div>'; return; }

    categories.forEach(category => {
      const item = document.createElement('div');
      item.className = 'ct-item';
      const swatch = document.createElement('span');
      swatch.className = 'ct-swatch';
      swatch.style.backgroundColor = category.color;
      const label = document.createElement('div');
      label.className = 'ct-name';
      label.textContent = category.name;
      const count = document.createElement('div');
      count.className = 'ct-count';
      count.textContent = `${categoryUsage(category.name)}教材`;
      const color = document.createElement('input');
      color.type = 'color';
      color.className = 'ct-color-input';
      color.value = category.color;
      color.setAttribute('aria-label', `${category.name}の色`);
      color.addEventListener('input', () => {
        swatch.style.backgroundColor = color.value;
        updateCategoryColor(category.name, color.value, false);
      });
      color.addEventListener('change', () => updateCategoryColor(category.name, color.value, true));
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'ct-delete';
      del.textContent = '削除';
      del.addEventListener('click', () => deleteCategory(category.name));
      item.append(swatch,label,count,color,del);
      list.appendChild(item);
    });
  }

  function saveCategories(){
    categories = uniqueCategories(categories);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  }

  function addCategory(){
    const input = $('ctNewCategory');
    const name = normalizeCategory(input.value);
    if (!name) { alert('ジャンル名を入力してください'); return; }
    if (categories.some(c => c.name.toLocaleLowerCase('ja-JP') === name.toLocaleLowerCase('ja-JP'))) { alert('同じジャンルがすでにあります'); return; }
    categories.push({ name, color:normalizeColor($('ctNewColor').value, colorFromName(name)) });
    saveCategories();
    input.value='';
    $('ctNewColor').value=colorFromName(name);
    renderCategorySelect(name);
    renderCategoryList();
    applyCategoryColors();
    input.focus();
  }

  function updateCategoryColor(name,color,persistRender){
    const category=categoryByName(name);
    if(!category)return;
    category.color=normalizeColor(color,category.color);
    saveCategories();
    applyCategoryColors();
    if(persistRender){ renderCategorySelect(categorySelect.value); renderCategoryList(); }
  }

  function refreshMaterialCardMeta(){
    const cards=[...document.querySelectorAll('#mtGrid .mt-item')];
    if(!cards.length)return;
    const materials=readMaterials(),records=readRecords();
    const entries=[{id:'',category:'未登録・既存記録',system:true},...materials];
    cards.forEach((card,index)=>{
      const entry=entries[index],meta=card.querySelector('.mt-meta');
      if(!entry||!meta)return;
      const count=entry.system?records.filter(r=>!r.materialId||!materials.some(m=>m.id===r.materialId)).length:records.filter(r=>r.materialId===entry.id).length;
      const progress=entry.totalAmount>0?`${Number(entry.currentAmount||0).toLocaleString()}/${Number(entry.totalAmount).toLocaleString()}${entry.progressUnit||''}`:'';
      meta.textContent=[entry.category||'',entry.materialType||'',progress,`${count}件`].filter(Boolean).join(' ・ ');
    });
  }

  function applyCategoryColors(){
    categories=readCategories();
    const materials=readMaterials();
    const materialMap=new Map(materials.map(m=>[m.id,m]));
    const cards=[...document.querySelectorAll('#mtGrid .mt-item')];
    const entries=[{id:'',category:'',system:true},...materials];
    cards.forEach((card,index)=>{
      const entry=entries[index];
      const category=entry&&!entry.system?categoryByName(entry.category):null;
      card.classList.toggle('ct-colored',Boolean(category));
      card.style.borderTopColor=category?category.color:'';
      card.style.backgroundImage=category?`linear-gradient(${rgba(category.color,.055)}, ${rgba(category.color,.055)})`:'';
    });

    const records=readRecords().sort((a,b)=>`${b.date||''}${b.createdAt||''}`.localeCompare(`${a.date||''}${a.createdAt||''}`)).slice(0,20);
    const rows=[...document.querySelectorAll('#historyList .history-item')];
    rows.forEach((row,index)=>{
      const tag=row.querySelector('.mt-tag');
      if(!tag)return;
      const material=materialMap.get(records[index]?.materialId);
      const category=material?categoryByName(material.category):null;
      tag.classList.toggle('ct-colored-tag',Boolean(category));
      tag.style.backgroundColor=category?rgba(category.color,.14):'';
      tag.style.color=category?readableAccent(category.color):'';
      tag.style.borderColor=category?rgba(category.color,.32):'';
    });
  }

  function deleteCategory(name){
    const used=categoryUsage(name);
    const message=used?`「${name}」を削除しますか？\nこのジャンルを使っている${used}教材は「ジャンルなし」に変更されます。`:`「${name}」を削除しますか？`;
    if(!confirm(message))return;
    categories=categories.filter(c=>c.name!==name);
    saveCategories();
    if(used){
      const materials=readMaterials().map(m=>normalizeCategory(m?.category)===name?{...m,category:'',updatedAt:new Date().toISOString()}:m);
      saveMaterials(materials);
    }
    const selected=categorySelect.value===name?'':categorySelect.value;
    renderCategorySelect(selected);
    renderCategoryList();
    refreshMaterialCardMeta();
    applyCategoryColors();
  }

  function openDialog(){
    renderCategoryList();
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
    setTimeout(()=>$('ctNewCategory')?.focus(),0);
  }
  function closeDialog(){ if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open'); }

  document.addEventListener('click',event=>{
    if(event.target.closest('.mt-add-btn,.mt-edit')){
      const selected=categorySelect.value;
      renderCategorySelect(selected);
      setTimeout(()=>{
        const value=normalizeCategory(categorySelect.value);
        if(value&&!categories.some(c=>c.name===value))renderCategorySelect('');
      },0);
    }
  },true);

  categorySelect.addEventListener('change',updateSelectAccent);
  manageButton.addEventListener('click',openDialog);
  $('ctClose').addEventListener('click',closeDialog);
  $('ctAdd').addEventListener('click',addCategory);
  $('ctNewCategory').addEventListener('keydown',event=>{ if(event.key==='Enter'){event.preventDefault();addCategory();} });
  dialog.addEventListener('click',event=>{if(event.target===dialog)closeDialog();});

  let colorFrame=0;
  const scheduleApply=()=>{cancelAnimationFrame(colorFrame);colorFrame=requestAnimationFrame(applyCategoryColors);};
  const grid=$('mtGrid'),history=$('historyList');
  const observer=new MutationObserver(scheduleApply);
  if(grid)observer.observe(grid,{childList:true,subtree:true});
  if(history)observer.observe(history,{childList:true,subtree:true});

  renderCategorySelect(currentCategory);
  applyCategoryColors();
})();
