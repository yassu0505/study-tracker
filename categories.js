(() => {
  'use strict';

  const MATERIALS_KEY = 'studyTrackerMaterialsV1';
  const CATEGORIES_KEY = 'studyTrackerMaterialCategoriesV1';

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

  function saveMaterials(materials){
    localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
  }

  function normalizeCategory(value){
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function uniqueCategories(values){
    const seen = new Set();
    const out = [];
    values.forEach(value => {
      const name = normalizeCategory(value);
      const key = name.toLocaleLowerCase('ja-JP');
      if (!name || seen.has(key)) return;
      seen.add(key);
      out.push(name);
    });
    return out.sort((a, b) => a.localeCompare(b, 'ja'));
  }

  function readCategories(){
    let stored = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '[]');
      if (Array.isArray(parsed)) stored = parsed;
    } catch (e) {}

    // 既存教材で使われているカテゴリは初回から選択肢へ自動移行する。
    const fromMaterials = readMaterials().map(m => m?.category);
    const merged = uniqueCategories([...stored, ...fromMaterials]);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(merged));
    return merged;
  }

  let categories = readCategories();

  const style = document.createElement('style');
  style.textContent = `
    .ct-category-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
    .ct-manage-btn{white-space:nowrap;background:var(--primary-soft);color:var(--primary);min-width:112px}
    .ct-dialog{width:min(470px,calc(100% - 28px));border:0;border-radius:22px;padding:0;background:var(--card);color:var(--text);box-shadow:0 24px 70px rgba(22,32,51,.24)}
    .ct-dialog::backdrop{background:rgba(18,27,44,.48);backdrop-filter:blur(2px)}
    .ct-inner{padding:20px}.ct-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}.ct-head h3{margin:0;font-size:19px}.ct-sub{font-size:12px;color:var(--muted);margin-top:4px}.ct-close{background:#f1f4f8;color:var(--text);width:40px;height:40px;padding:0;border-radius:50%;font-size:18px}
    .ct-add-row{display:grid;grid-template-columns:1fr auto;gap:8px}.ct-add-row button{background:var(--primary);color:#fff;min-width:72px}.ct-list{display:flex;flex-direction:column;gap:8px;margin-top:16px;max-height:280px;overflow:auto}.ct-item{display:flex;justify-content:space-between;align-items:center;gap:10px;border:1px solid var(--line);border-radius:12px;padding:9px 10px}.ct-name{font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ct-count{font-size:11px;color:var(--muted);margin-left:auto;white-space:nowrap}.ct-delete{background:#fff0f0;color:var(--danger);padding:7px 9px;font-size:12px}.ct-empty{color:var(--muted);font-size:13px;padding:12px 0;text-align:center}
    .ct-help{font-size:11px;color:var(--muted);line-height:1.5;margin-top:8px}
    @media(max-width:600px){.ct-category-row,.ct-add-row{grid-template-columns:1fr}.ct-manage-btn,.ct-add-row button{width:100%}}
  `;
  document.head.appendChild(style);

  // materials.js が作った自由入力欄を、同じ id の select に置き換える。
  const categorySelect = document.createElement('select');
  categorySelect.id = 'mtCategory';
  categorySelect.setAttribute('aria-label', '教材カテゴリ');
  const currentCategory = normalizeCategory(categoryField.value);
  categoryField.replaceWith(categorySelect);

  const categoryRow = document.createElement('div');
  categoryRow.className = 'ct-category-row';
  categorySelect.parentNode.insertBefore(categoryRow, categorySelect);
  categoryRow.appendChild(categorySelect);

  const manageButton = document.createElement('button');
  manageButton.type = 'button';
  manageButton.className = 'ct-manage-btn';
  manageButton.textContent = 'カテゴリ管理';
  categoryRow.appendChild(manageButton);

  const help = document.createElement('div');
  help.className = 'ct-help';
  help.textContent = 'カテゴリは自由に追加・削除できます。削除したカテゴリの教材は「カテゴリなし」になります。';
  categoryRow.insertAdjacentElement('afterend', help);

  const dialog = document.createElement('dialog');
  dialog.className = 'ct-dialog';
  dialog.innerHTML = `
    <div class="ct-inner">
      <div class="ct-head">
        <div><h3>教材カテゴリ管理</h3><div class="ct-sub">教材登録で使うカテゴリを編集できます。</div></div>
        <button id="ctClose" class="ct-close" type="button" aria-label="閉じる">×</button>
      </div>
      <label for="ctNewCategory">新しいカテゴリ</label>
      <div class="ct-add-row">
        <input id="ctNewCategory" maxlength="50" placeholder="例：数学 / プログラミング / 資格" />
        <button id="ctAdd" type="button">追加</button>
      </div>
      <div class="ct-help">使用中のカテゴリを削除しても教材や学習記録は削除されません。該当教材だけ「カテゴリなし」に変更されます。</div>
      <div id="ctList" class="ct-list"></div>
    </div>`;
  document.body.appendChild(dialog);

  function renderCategorySelect(selected = categorySelect.value){
    categories = readCategories();
    categorySelect.innerHTML = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'カテゴリなし';
    categorySelect.appendChild(none);
    categories.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      categorySelect.appendChild(option);
    });
    categorySelect.value = categories.includes(selected) ? selected : '';
  }

  function categoryUsage(name){
    return readMaterials().filter(m => normalizeCategory(m?.category) === name).length;
  }

  function renderCategoryList(){
    categories = readCategories();
    const list = $('ctList');
    list.innerHTML = '';
    if (!categories.length) {
      list.innerHTML = '<div class="ct-empty">まだカテゴリがありません。</div>';
      return;
    }
    categories.forEach(name => {
      const item = document.createElement('div');
      item.className = 'ct-item';
      const label = document.createElement('div');
      label.className = 'ct-name';
      label.textContent = name;
      const count = document.createElement('div');
      count.className = 'ct-count';
      const used = categoryUsage(name);
      count.textContent = `${used}教材`;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'ct-delete';
      del.textContent = '削除';
      del.addEventListener('click', () => deleteCategory(name));
      item.append(label, count, del);
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
    if (!name) { alert('カテゴリ名を入力してください'); return; }
    const duplicate = categories.some(c => c.toLocaleLowerCase('ja-JP') === name.toLocaleLowerCase('ja-JP'));
    if (duplicate) { alert('同じカテゴリがすでにあります'); return; }
    categories.push(name);
    saveCategories();
    input.value = '';
    renderCategorySelect(name);
    renderCategoryList();
    input.focus();
  }

  function refreshMaterialCardMeta(){
    const cards = [...document.querySelectorAll('#mtGrid .mt-item')];
    if (!cards.length) return;
    const materials = readMaterials();
    const records = (() => {
      try {
        const v = JSON.parse(localStorage.getItem('studyTrackerRecordsV2') || '[]');
        return Array.isArray(v) ? v : [];
      } catch (e) { return []; }
    })();
    const entries = [{ id:'', category:'未登録・既存記録', system:true }, ...materials];
    cards.forEach((card, index) => {
      const entry = entries[index];
      const meta = card.querySelector('.mt-meta');
      if (!entry || !meta) return;
      const count = entry.system
        ? records.filter(r => !r.materialId || !materials.some(m => m.id === r.materialId)).length
        : records.filter(r => r.materialId === entry.id).length;
      meta.textContent = [entry.category || '', `${count}件`].filter(Boolean).join(' ・ ');
    });
  }

  function deleteCategory(name){
    const used = categoryUsage(name);
    const message = used
      ? `「${name}」を削除しますか？\nこのカテゴリを使っている${used}教材は「カテゴリなし」に変更されます。`
      : `「${name}」を削除しますか？`;
    if (!confirm(message)) return;

    categories = categories.filter(c => c !== name);
    saveCategories();

    if (used) {
      const materials = readMaterials().map(m => normalizeCategory(m?.category) === name
        ? { ...m, category:'', updatedAt:new Date().toISOString() }
        : m);
      saveMaterials(materials);
    }

    const selected = categorySelect.value === name ? '' : categorySelect.value;
    renderCategorySelect(selected);
    renderCategoryList();
    refreshMaterialCardMeta();
  }

  function openDialog(){
    renderCategoryList();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    setTimeout(() => $('ctNewCategory')?.focus(), 0);
  }

  function closeDialog(){
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  // 教材編集ダイアログを開く直前に最新カテゴリを取り込む。
  document.addEventListener('click', event => {
    if (event.target.closest('.mt-add-btn,.mt-edit')) {
      const selected = categorySelect.value;
      renderCategorySelect(selected);
      setTimeout(() => {
        // materials.js の openEditor が設定した値を壊さないよう、存在確認だけ行う。
        const value = normalizeCategory(categorySelect.value);
        if (value && !categories.includes(value)) renderCategorySelect('');
      }, 0);
    }
  }, true);

  manageButton.addEventListener('click', openDialog);
  $('ctClose').addEventListener('click', closeDialog);
  $('ctAdd').addEventListener('click', addCategory);
  $('ctNewCategory').addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); addCategory(); }
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });

  renderCategorySelect(currentCategory);
})();
