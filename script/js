// ====================== 核心模块 ======================
const BIN_ID = '690f2ed2d0ea881f40db9bc3';
const MASTER_KEY = '$2a$10$xnT36sEdgvmYUqMghhjHuuDn.ErHF2gpSRxGohHLUJ5HUg8/Z3XEq';

// ---------- Data ----------
const Data = {
  local: {},
  async load() {
    try {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { 'X-Master-Key': MASTER_KEY } });
      this.local = await res.json();
      UI.refresh();
      Toast.show('云端数据已加载');
    } catch (e) { Toast.error('加载失败: ' + e.message); }
  },
  async sync() {
    try {
      await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
        body: JSON.stringify(this.local)
      });
      Toast.show('已同步到云端');
    } catch (e) { Toast.error('同步失败'); }
  },
  export() {
    const blob = new Blob([JSON.stringify(this.local, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'nsfw-keywords.json'; a.click();
    URL.revokeObjectURL(url);
    Toast.show('已导出');
  },
  import(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try { this.local = JSON.parse(ev.target.result); UI.refresh(); Toast.show('已导入'); }
      catch { Toast.error('JSON 格式错误'); }
    };
    reader.readAsText(file);
  },
  addKeyword() {
    const word = document.getElementById('newWord').value.trim();
    const zh = document.getElementById('newZh').value.trim();
    const strength = parseFloat(document.getElementById('newStrength').value) || 0.8;
    const l1 = document.getElementById('level1').value;
    const l2 = document.getElementById('level2').value;
    if (!word || !l1) return Toast.error('关键词和一级标签必填');

    const path = [l1]; if (l2) path.push(l2);
    let node = this.local;
    for (let i = 0; i < path.length - 1; i++) { const k = path[i]; node[k] = node[k] || {}; node = node[k]; }
    const target = path[path.length - 1];
    node[target] = node[target] || [];
    node[target].push({ "词": word, "词2": zh, "强度": strength, "图": Cart.uploadedUrl || '', "复制": 0 });
    UI.renderCards(); UI.closeModal('addModal'); Toast.show('已添加');
  }
};

// ---------- UI ----------
const UI = {
  currentPath: [], currentItems: [],
  refresh() { DOM.navTree.innerHTML = ''; DOM.buildNav(Data.local, DOM.navTree); this.initCascade(); this.goTo([]); },
  initCascade() {
    const paths = this.collectPaths();
    DOM.level1.innerHTML = '<option value="">一级标签</option>';
    DOM.level2.innerHTML = '<option value="">二级标签</option>';
    paths.l1.forEach(k => DOM.addOption(DOM.level1, k, k));
    DOM.level1.onchange = () => {
      const v1 = DOM.level1.value;
      DOM.level2.innerHTML = '<option value="">二级标签</option>';
      if (v1 && paths.l2[v1]) paths.l2[v1].forEach(k => DOM.addOption(DOM.level2, k, k));
    };
  },
  collectPaths() {
    const l1 = new Set(), l2 = {};
    const walk = (node, path) => {
      if (Array.isArray(node) && path.length >= 2) { l1.add(path[0]); l2[path[0]] = l2[path[0]] || new Set(); l2[path[0]].add(path[1]); }
      else if (typeof node === 'object' && node) for (const k in node) walk(node[k], [...path, k]);
    };
    walk(Data.local); return { l1: [...l1].sort(), l2: Object.fromEntries(Object.entries(l2).map(([k, v]) => [k, [...v].sort()])) };
  },
  goTo(path) {
    this.currentPath = path;
    let node = Data.local;
    path.forEach(p => node = node[p]);
    this.currentItems = Array.isArray(node) ? node.map(w => typeof w === 'string' ? {词: w} : w) : [];
    this.renderCards();
  },
  renderCards() {
    const order = DOM.sortOrder.value;
    const sorted = [...this.currentItems].sort((a, b) => {
      const ca = Storage.copy[a.词] || a.复制 || 0;
      const cb = Storage.copy[b.词] || b.复制 || 0;
      return order === 'desc' ? cb - ca : ca - cb;
    });
    DOM.cardGrid.innerHTML = sorted.length ? sorted.map(item => {
      const word = item.词 || item;
      const count = Storage.copy[word] || item.复制 || 0;
      const img = item.图 ? item.图.replace(/\/[^/]+$/, '/medium/$&') : '';
      return `<div class="card">
        ${img ? `<img src="${img}" loading="lazy" onerror="this.src='https://via.placeholder.com/220x140?text=无图'">` : ''}
        <div class="card-body">
          <div class="card-title">${word} ${count ? `<${count}>` : ''}</div>
          <div class="card-subtitle">${item.词2 || '无翻译'} · 强度: ${item.强度 || '-'}</div>
          <div class="card-actions">
            <button class="btn-copy" onclick="Storage.copyWord('${word}')">Copy</button>
            <button class="btn-cart" onclick="Cart.add('${word}')">Add</button>
          </div>
        </div>
      </div>`;
    }).join('') : '<div class="loading">请选择左侧分类</div>';
  },
  openAddModal() { DOM.addModal.style.display = 'flex'; this.initCascade(); },
  closeModal(id) { document.getElementById(id).style.display = 'none'; }
};

// ---------- Cart ----------
const Cart = {
  uploadedUrl: '',
  add(word) { if (!Storage.cart.includes(word)) { Storage.cart.push(word); Storage.saveCart(); Cart.updateUI(); Toast.show(`已加入: ${word}`); } else Toast.show('已在购物车'); },
  remove(i) { Storage.cart.splice(i, 1); Storage.saveCart(); Cart.renderList(); Cart.updateCount(); },
  clear() { Storage.cart = []; Storage.saveCart(); Cart.renderList(); Cart.updateCount(); Toast.show('购物车已清空'); },
  copyAll() {
    if (!Storage.cart.length) return Toast.show('购物车为空');
    navigator.clipboard.writeText(Storage.cart.join(', ')).then(() => { Cart.recordHistory(); Toast.show(`已复制 ${Storage.cart.length} 个`); });
  },
  recordHistory() {
    Storage.history.unshift({ time: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }), items: [...Storage.cart] });
    if (Storage.history.length > 20) Storage.history.pop();
    Storage.saveHistory(); Cart.renderList();
  },
  saveToHistory() { if (Storage.cart.length) { Cart.recordHistory(); Toast.show('已加入历史'); } },
  clearHistory() { if (confirm('清空历史？')) { Storage.history = []; Storage.saveHistory(); Cart.renderList(); Toast.show('历史已清空'); } },
  toggle() {
    const panel = DOM.cartPanel, body = DOM.cartBody, actions = DOM.cartActions, mid = DOM.midActions, arrow = DOM.cartArrow;
    const expanded = body.style.display === 'block';
    panel.style.height = expanded ? '50px' : '60vh';
    [body, actions, mid].forEach(el => el.style.display = expanded ? 'none' : 'block');
    arrow.className = expanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    if (!expanded) Cart.renderList();
  },
  toggleHistory() { event.stopPropagation(); const s = DOM.historySection; s.style.display = s.style.display === 'none' ? 'block' : 'none'; },
  openDraw() { event.stopPropagation(); DOM.drawModal.style.display = 'flex'; Cart.renderDrawTags(); },
  renderDrawTags() {
    const paths = [];
    for (const cat in Data.local) for (const group in Data.local[cat]) if (Array.isArray(Data.local[cat][group]) && Data.local[cat][group].length) paths.push({cat, group});
    DOM.drawTags.innerHTML = paths.map(p => `
      <div style="display:flex; align-items:center; padding:8px; background:#222; border-radius:6px; margin-bottom:6px;">
        <input type="checkbox" value="${p.cat}>${p.group}">
        <label style="flex:1;">${p.cat} > ${p.group} (${Data.local[p.cat][p.group].length}词)</label>
      </div>
    `).join('');
  },
  drawWord() {
    const checked = Array.from(DOM.drawTags.querySelectorAll('input:checked'));
    if (!checked.length) return Toast.error('请选择标签');
    const candidates = [];
    checked.forEach(cb => { const [cat, group] = cb.value.split('>'); Data.local[cat][group].forEach(w => w.词 && candidates.push(w.词)); });
    if (!candidates.length) return Toast.error('无词可抽');
    const word = candidates[Math.floor(Math.random() * candidates.length)];
    DOM.drawResult.innerHTML = `${word}`;
    DOM.drawResult.style.animation = 'pulse 0.5s';
    setTimeout(() => DOM.drawResult.style.animation = '', 500);
    Cart.add(word);
  },
  updateCount() { DOM.cartCount.textContent = Storage.cart.length; },
  renderList() {
    const list = DOM.cartList, hist = DOM.cartHistoryList, sec = DOM.historySection;
    list.innerHTML = Storage.cart.length ? Storage.cart.map((w, i) => {
      const item = Cart.findItem(w);
      return `<div class="cart-item"><div class="word">${w}</div><div class="zh">${item?.词2 || '无'}</div><span class="remove" onclick="Cart.remove(${i})">×</span></div>`;
    }).join('') : '<div style="text-align:center;color:#666;padding:20px;">购物车为空</div>';
    sec.style.display = Storage.history.length ? 'block' : 'none';
    hist.innerHTML = Storage.history.map(h => `<div class="cart-history-item"><div class="time">${h.time}</div><div style="margin-top:2px;color:#ccc;">${h.items.join(', ')}</div></div>`).join('');
  },
  updateUI() { Cart.updateCount(); if (DOM.cartBody.style.display === 'block') Cart.renderList(); },
  findItem(word) {
    for (const cat in Data.local) for (const group in Data.local[cat]) {
      const arr = Data.local[cat][group];
      if (Array.isArray(arr)) { const found = arr.find(w => (w.词 || w) === word); if (found) return found; }
    }
    return null;
  }
};

// ---------- Storage ----------
const Storage = {
  cart: JSON.parse(localStorage.getItem('nsfw-cart') || '[]'),
  history: JSON.parse(localStorage.getItem('nsfw-cart-history') || '[]'),
  copy: JSON.parse(localStorage.getItem('nsfw-copies') || '{}'),
  saveCart() { localStorage.setItem('nsfw-cart', JSON.stringify(this.cart)); },
  saveHistory() { localStorage.setItem('nsfw-cart-history', JSON.stringify(this.history)); },
  copyWord(word) {
    navigator.clipboard.writeText(word);
    this.copy[word] = (this.copy[word] || 0) + 1;
    localStorage.setItem('nsfw-copies', JSON.stringify(this.copy));
    Toast.show(`已复制: ${word}`);
  }
};

// ---------- DOM Cache ----------
const DOM = {
  navTree: document.getElementById('navTree'),
  cardGrid: document.getElementById('cardGrid'),
  sortOrder: document.getElementById('sortOrder'),
  level1: document.getElementById('level1'),
  level2: document.getElementById('level2'),
  addModal: document.getElementById('addModal'),
  drawModal: document.getElementById('drawModal'),
  drawTags: document.getElementById('drawTags'),
  drawResult: document.getElementById('drawResult'),
  cartPanel: document.getElementById('cartPanel'),
  cartBody: document.getElementById('cartBody'),
  cartActions: document.getElementById('cartActions'),
  midActions: document.getElementById('midActions'),
  cartArrow: document.getElementById('cartArrow'),
  cartCount: document.getElementById('cartCount'),
  cartList: document.getElementById('cartList'),
  historySection: document.getElementById('historySection'),
  cartHistoryList: document.getElementById('cartHistoryList'),
  addOption(parent, value, text) { const o = document.createElement('option'); o.value = value; o.textContent = text; parent.appendChild(o); },
  buildNav(node, parent, path = []) {
    Object.keys(node).forEach(key => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'folder';
      span.innerHTML = `<i class="fas fa-folder"></i> ${key}`;
      span.onclick = () => UI.goTo([...path, key]);
      li.appendChild(span);
      if (typeof node[key] === 'object' && !Array.isArray(node[key])) {
        const ul = document.createElement('ul'); ul.className = 'sub'; li.appendChild(ul);
        DOM.buildNav(node[key], ul, [...path, key]);
      }
      parent.appendChild(li);
    });
  }
};

// ---------- Toast ----------
const Toast = {
  show(msg) { this.create(msg, 'success'); },
  error(msg) { this.create(msg, 'error'); },
  create(msg, type) {
    const t = document.createElement('div');
    t.className = `toast ${type === 'error' ? 'error' : ''}`;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = 1; t.style.transform = 'translateX(0)'; });
    setTimeout(() => {
      t.style.opacity = 0; t.style.transform = 'translateX(100%)';
      t.addEventListener('transitionend', () => t.remove());
    }, 3000);
  }
};

// ---------- 初始化 ----------
document.getElementById('btnSelectImg').onclick = () => document.getElementById('imgUpload').click();
document.getElementById('imgUpload').onchange = e => {
  const file = e.target.files[0];
  if (file) document.getElementById('btnUploadImg').disabled = false;
};
document.getElementById('btnUploadImg').onclick = async () => {
  const file = document.getElementById('imgUpload').files[0];
  if (!file) return;
  const btn = document.getElementById('btnUploadImg');
  btn.disabled = true; btn.textContent = '上传中...';
  try {
    let API_KEY = localStorage.getItem('imgbb_api_key');
    if (!API_KEY) { API_KEY = prompt('请输入 ImgBB API Key:'); if (API_KEY) localStorage.setItem('imgbb_api_key', API_KEY); }
    const form = new FormData(); form.append('image', file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, { method: 'POST', body: form });
    const data = await res.json();
    if (data.success) {
      Cart.uploadedUrl = data.data.url;
      const medium = data.data.url.replace(/\/[^/]+$/, '/medium/$&');
      document.getElementById('imgPreview').innerHTML = `<img src="${medium}" style="max-height:140px;">`;
      btn.textContent = '已获取'; Toast.show('上传成功');
    } else throw new Error(data.error?.message || '上传失败');
  } catch (e) { Toast.error(e.message); btn.textContent = '重新上传'; btn.disabled = false; }
};

window.addEventListener('load', () => { Data.load(); Cart.updateUI(); });
