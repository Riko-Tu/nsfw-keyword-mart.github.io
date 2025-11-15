// 变量
let keywords = [];
let cart = [];
let rawData = {};
const selectedTags = new Set();

// 侧栏高亮状态
let activeCategory = null;
let activeSub = null;

// 新增：词组页数据与当前 tab
let currentTab = 'prompts';
let groupsRaw = {};
let groups = [];



// 新增：为每个页面记录独立的激活标签状态与初始化标记
const promptsActive = { category: null, sub: null, initialized: false };
const groupsActive  = { category: null, sub: null, initialized: false };

// 新增：记录打开设置前所在的 Tab
let lastTabBeforeOpen = null;

// 新增：工具方法，获取数据中的“第一个一级/第一个二级”
function getFirstCatSub(dataObj) {
  const cats = Object.keys(dataObj || {});
  if (cats.length === 0) return { category: null, sub: null };
  const firstCat = cats[0];
  const subs = Object.keys(dataObj[firstCat] || {});
  return { category: firstCat, sub: subs.length ? subs[0] : null };
}

// 递归遍历 test-data.json，提取所有关键词为统一格式
function flattenKeywords(json) {
  const result = [];
  for (const category in json) {
    for (const sub in json[category]) {
      json[category][sub].forEach(item => {
        result.push({
          word: item["词"],
          meaning: item["词2"],
          note: item["说明"],
          category: category + " / " + sub,
          strength: item["强度"]
        });
      });
    }
  }
  return result;
}

// 渲染侧边栏分类树（去掉 input 勾选框，仅保留点击容器筛选）
function renderCategoryTree(json) {
  const tree = document.getElementById('categoryTree');
  tree.innerHTML = Object.keys(json).map(category => {
    const subList = Object.keys(json[category])
      .map(sub => {
        const isActive = (category === activeCategory && sub === activeSub) ? 'active' : '';
        return `
          <li>
            <div class="sub-item ${isActive}" data-cat="${category}" data-sub="${sub}"
                 onclick="onSubItemClick(event, '${category}', '${sub}')">
              <span class="sub-name">${sub}</span>
            </div>
          </li>
        `;
      }).join('');
    return `
      <li>
        <div class="folder" data-cat="${category}" onclick="toggleSub(this)">
          <i class="fas fa-chevron-right"></i> ${category}
        </div>
        <ul class="sub">${subList}</ul>
      </li>
    `;
  }).join('');

  // 若有当前激活项，则确保对应的一级分类处于展开状态
  if (activeCategory) {
    const folder = document.querySelector(`.folder[data-cat="${activeCategory}"]`);
    if (folder) {
      folder.classList.add('open');
      const ul = folder.nextElementSibling;
      if (ul) ul.classList.add('open');
    }
  }
}

// 分类筛选
function filterByCategory(category, sub) {
  const filtered = keywords.filter(k => k.category === category + " / " + sub);
  renderCards(filtered);
}

// 渲染卡片
function renderCards(data) {
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = data.map(item => `
    <div class="card">
      <div class="card-left">
        <div class="word">${item.word}</div>
        <div class="meaning">${item.meaning}<span class="note">（${item.note}）</span></div>
      </div>
      <div class="card-actions">
        <button class="icon-btn btn-copy" onclick="copyText('${item.word}')">
          <i class="fas fa-copy"></i>
        </button>
        <button class="icon-btn btn-cart" onclick="addToCart(${JSON.stringify(item).replace(/"/g, '&quot;')})">
          <i class="fas fa-cart-plus"></i>
        </button>
      </div>
    </div>
  `).join('');
}

// 搜索过滤
function filterCards() {
  const query = document.querySelector('.search-box').value.toLowerCase();
  const filtered = keywords.filter(k =>
    k.word.toLowerCase().includes(query) ||
    k.meaning.toLowerCase().includes(query) ||
    k.note.toLowerCase().includes(query)
  );
  renderCards(filtered);
}

// 复制文本
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('已复制：' + text);
  });
}

// 加入购物车（标记手动来源）
function addToCart(item) {
  // 新增：购物车仅在提示词页可用
  if (currentTab !== 'prompts') {
    showToast('购物车仅在提示词页可用', true);
    return;
  }

  if (!cart.find(i => i.word === item.word)) {
    cart.push({ ...item, source: 'manual' });
    updateCart();
    showToast('已加入：' + item.word);
  }
}

// 渲染购物车（含标签提示和锁定）
function updateCart() {
  const count = cart.length;
  document.getElementById('cartCount').textContent = count;

  const list = document.getElementById('cartList');
  if (count === 0) {
    list.innerHTML = '<div style="text-align:center; color:#666; padding:20px;">空</div>';
    return;
  }

  list.innerHTML = cart.map(item => {
    // 标签：所有项只要有 category 就展示
    const tagHtml = item.category
      ? `<span class="tag-pill">${item.category}</span>`
      : '';

    // 抽词项才有锁定按钮
    const lockBtn = item.source === 'draw'
      ? `<button class="btn-lock" onclick="toggleLock(${JSON.stringify(item.word).replace(/"/g, '&#39;')})"
                    title="${item.locked ? '解锁' : '锁定'}">
           <i class="fas ${item.locked ? 'fa-lock' : 'fa-lock-open'}"></i>
         </button>`
      : '';

    // 与卡片区一致的两行展示：word + meaning（note）
    return `
      <div class="cart-item">
        <div class="cart-item-main">
          <div class="cart-word-line">
            <div class="word">${item.word}</div>
          </div>
          <div class="cart-meaning">
            ${item.meaning || ''}<span class="note">（${item.note || ''}）</span>
          </div>
          <div class="cart-meta-line">
            ${tagHtml}
          </div>
        </div>
        <div class="cart-item-actions">
          ${lockBtn}
          <button class="btn-remove" onclick="removeFromCart(${JSON.stringify(item.word).replace(/"/g, '&#39;')})" title="移除">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 切换抽词项锁定状态（手动项不支持锁定）
function toggleLock(word) {
  const idx = cart.findIndex(i => i.word === word && i.source === 'draw');
  if (idx !== -1) {
    const item = cart[idx];
    item.locked = !item.locked;
    updateCart();
    showToast((item.locked ? '已锁定：' : '已解锁：') + item.word);
  }
}

// 单个移除购物车项
function removeFromCart(word) {
  const idx = cart.findIndex(i => i.word === word);
  if (idx !== -1) {
    const removed = cart.splice(idx, 1)[0];
    updateCart();
    showToast('已移除：' + removed.word);
  }
}

// 复制全部
function copyAll() {
  if (cart.length === 0) return;
  const text = cart.map(i => i.word).join(', ');
  navigator.clipboard.writeText(text);
  showToast('已复制全部关键词');
}

// 清空
function clearCart() {
  cart = [];
  updateCart();
  showToast('购物车已清空');
}

// Toast
function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast' + (isError ? ' error' : '') + ' show';
  setTimeout(() => toast.className = 'toast', 3000);
}

// 折叠侧边栏
function toggleSub(el) {
  el.classList.toggle('open');
  el.nextElementSibling.classList.toggle('open');
}

// 勾选/取消子标签后刷新主列表（并集；若无选择则显示全部）
function toggleTagSelection(el) {
  const key = el.dataset.tag;
  if (el.checked) selectedTags.add(key);
  else selectedTags.delete(key);
  updateMainBySelected();
}

function updateMainBySelected() {
  if (selectedTags.size === 0) {
    renderCards(keywords);
    return;
  }
  const selectedCats = Array.from(selectedTags).map(k => {
    const [c, s] = k.split('|');
    return `${c} / ${s}`;
  });
  const filtered = keywords.filter(k => selectedCats.includes(k.category));
  renderCards(filtered);
}

// 将点击事件绑定在 sub-item 容器，点击复选框不触发筛选
function onSubItemClick(evt, category, sub) {
  if (evt.target && evt.target.tagName.toLowerCase() === 'input') return;
  setActiveSubItem(category, sub);
}

// 新增：Tab 切换（提示词页 / 词组页）
function switchTab(tab) {
  currentTab = tab;

  const btnPrompts = document.querySelector('.tab-btn[data-tab="prompts"]');
  const btnGroups = document.querySelector('.tab-btn[data-tab="groups"]');
  if (btnPrompts && btnGroups) {
    btnPrompts.classList.toggle('active', tab === 'prompts');
    btnGroups.classList.toggle('active', tab === 'groups');
  }

  const cardGrid = document.getElementById('cardGrid');
  const groupGrid = document.getElementById('groupGrid');
  // 新增：购物车面板元素（采用类名选择器，保证兼容）
  const cartSidebarEl = document.querySelector('.cart-sidebar');
  // 新增：确保设置弹窗不被侧栏隐藏
  const settingsModalEl = document.getElementById('settingsModal');
  if (!cardGrid || !groupGrid) return;

  if (tab === 'prompts') {
    // 提示词页：展示提示词网格
    cardGrid.style.display = '';
    groupGrid.style.display = 'none';
    // 新增：显示购物车
    if (cartSidebarEl) cartSidebarEl.style.display = '';

    // 切回提示词页时，恢复提示词页的激活标签（若未初始化则取第一个）
    if (!promptsActive.initialized) {
      const first = getFirstCatSub(rawData);
      promptsActive.category = first.category;
      promptsActive.sub = first.sub;
      promptsActive.initialized = true;
    }
    activeCategory = promptsActive.category;
    activeSub = promptsActive.sub;

    renderCategoryTree(rawData);

    if (selectedTags.size > 0) updateMainBySelected();
    else if (activeCategory && activeSub) filterByCategory(activeCategory, activeSub);
    else renderCards(keywords);
  } else {
    // 词组页：展示词组网格
    cardGrid.style.display = 'none';
    groupGrid.style.display = '';

    // 在隐藏侧栏前，若设置弹窗位于侧栏中，则移动到 body 下，避免被 display:none 影响
    if (settingsModalEl && cartSidebarEl && settingsModalEl.parentElement === cartSidebarEl) {
      document.body.appendChild(settingsModalEl);
    }

    // 新增：隐藏购物车
    if (cartSidebarEl) cartSidebarEl.style.display = 'none';

    // 若未加载则初始化
    if (!groups || groups.length === 0 || !groupsRaw || Object.keys(groupsRaw).length === 0) {
      initGroups();
    }

    // 切到词组页时，恢复词组页的激活标签（若未初始化则取第一个）
    if (!groupsActive.initialized) {
      const first = getFirstCatSub(groupsRaw);
      groupsActive.category = first.category;
      groupsActive.sub = first.sub;
      groupsActive.initialized = true;
    }
    activeCategory = groupsActive.category;
    activeSub = groupsActive.sub;

    renderCategoryTree(groupsRaw);

    if (activeCategory && activeSub) {
      filterGroupsByCategory(activeCategory, activeSub);
    } else {
      renderGroups(groups);
    }
  }
}

// 打开设置弹窗并渲染二级标签
function openSettingsModal() {
  // 记录当前页面，关闭时恢复
  lastTabBeforeOpen = currentTab;

  // 若设置弹窗在被隐藏的侧栏中，迁移到 body 以保证可见
  const modal = document.getElementById('settingsModal');
  const cartSidebarEl = document.querySelector('.cart-sidebar');
  if (modal && cartSidebarEl && modal.parentElement === cartSidebarEl && cartSidebarEl.style.display === 'none') {
    document.body.appendChild(modal);
  }

  renderSettingsModalBody();
  document.getElementById('settingsModal').classList.add('show');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.remove('show');

  // 关闭后恢复到打开前的页面
  if (lastTabBeforeOpen && currentTab !== lastTabBeforeOpen) {
    const restoreTab = lastTabBeforeOpen;
    lastTabBeforeOpen = null;
    switchTab(restoreTab);
  } else {
    lastTabBeforeOpen = null;
  }
}

// 渲染弹窗中的所有二级标签（按一级分类分组）
function renderSettingsModalBody() {
  const body = document.getElementById('settingsBody');
  if (!rawData || Object.keys(rawData).length === 0) {
    body.innerHTML = '<div style="color:#ccc">数据尚未加载</div>';
    return;
  }
  const html = Object.keys(rawData).map(category => {
    const subs = Object.keys(rawData[category]).map(sub => {
      const key = `${category}|${sub}`;
      const checked = selectedTags.has(key) ? 'checked' : '';
      return `<label class="tag-option">
                <input type="checkbox" data-tag="${key}" ${checked} onchange="toggleTagSelection(this)">
                <span>${sub}</span>
              </label>`;
    }).join('');
    return `<div class="category-block">
              <div class="category-name">${category}</div>
              <div class="sub-list">${subs}</div>
            </div>`;
  }).join('');
  body.innerHTML = html;
}

// 保存设置（关闭弹窗并刷新主列表）
function saveSettings() {
  closeSettingsModal();
  updateMainBySelected();
}

// 新增：初始化并扁平化词组数据
function initGroups() {
  fetch('groups.json')
    .then(r => r.json())
    .then(data => {
      groupsRaw = data || {};
      groups = flattenGroups(groupsRaw);

      // 首次进入词组页时设定默认激活为“第一个一级/第一个二级”
      if (!groupsActive.initialized) {
        const first = getFirstCatSub(groupsRaw);
        groupsActive.category = first.category;
        groupsActive.sub = first.sub;
        groupsActive.initialized = true;
      }

      // 若当前处于词组页，则同步全局 active 并渲染侧栏与列表
      if (currentTab === 'groups') {
        activeCategory = groupsActive.category;
        activeSub = groupsActive.sub;
        renderCategoryTree(groupsRaw);

        if (activeCategory && activeSub) {
          filterGroupsByCategory(activeCategory, activeSub);
        } else {
          renderGroups(groups);
        }
      }
    })
    .catch(() => {
      const grid = document.getElementById('groupGrid');
      if (grid) grid.innerHTML = '<div style="color:#ccc; padding:20px;">未找到 groups.json 或解析失败</div>';
    });
}

// 新增：将 groups.json 扁平为卡片展示结构
function flattenGroups(json) {
  const arr = [];
  for (const cat in json) {
    for (const sub in json[cat]) {
      (json[cat][sub] || []).forEach(g => {
        arr.push({
          title: g.title,
          description: g.description || '',
          tags: g.tags || [],
          items: (g.items || []).map(it => ({
            word: it["词"],
            meaning: it["词2"],
            note: it["说明"]
          })),
          category: `${cat} / ${sub}`
        });
      });
    }
  }
  return arr;
}

// 新增：词组页渲染
function renderGroups(data) {
  const grid = document.getElementById('groupGrid');
  if (!grid) return;

  grid.innerHTML = data.map(g => {
    const tagsHtml = [g.category, ...(g.tags || [])]
      .map(t => `<span class="tag-pill">${t}</span>`).join(' ');
    const count = g.items.length;
    const gJson = JSON.stringify(g).replace(/"/g, '&quot;');

    return `
      <div class="card group-card">
        <div class="card-left">
          <div class="word">${g.title}</div>
          <div class="meaning">${g.description || ''}</div>
          <div class="note">包含 ${count} 个词</div>
          <div class="card-tags">${tagsHtml}</div>
        </div>
        <div class="card-actions">
          <button class="icon-btn btn-copy" onclick="copyGroup(${gJson})" title="复制组内词为一行">
            <i class="fas fa-copy"></i>
          </button>
          <!-- 移除“加入购物车”按钮，确保词组页不涉及购物车 -->
        </div>
      </div>
    `;
  }).join('');
}

// 新增：复制词组（将 items 的英文词组成一行）
function copyGroup(group) {
  const text = (group.items || []).map(it => it.word).filter(Boolean).join(', ');
  if (!text) {
    showToast('该词组没有可复制的词', true);
    return;
  }
  navigator.clipboard.writeText(text);
  showToast('词组已复制');
}

// 新增：将词组内所有词加入购物车（保留分类为组的一级/二级）
function addGroupToCart(group) {
  const items = group.items || [];
  let added = 0;
  items.forEach(it => {
    if (!it.word) return;
    if (!cart.find(c => c.word === it.word)) {
      cart.push({
        word: it.word,
        meaning: it.meaning || '',
        note: it.note || '',
        category: group.category,
        source: 'manual'
      });
      added++;
    }
  });
  updateCart();
  showToast(added > 0 ? `已加入 ${added} 个词` : '购物车中已存在这些词');
}

// 设置当前激活的二级标签、高亮并展开对应一级，然后刷新主列表
function setActiveSubItem(category, sub) {
  activeCategory = category;
  activeSub = sub;

  // 同步保存到对应页面的状态，便于下次切换还原
  if (currentTab === 'prompts') {
    promptsActive.category = category;
    promptsActive.sub = sub;
    promptsActive.initialized = true;
  } else {
    groupsActive.category = category;
    groupsActive.sub = sub;
    groupsActive.initialized = true;
  }

  // 更新高亮
  document.querySelectorAll('.sub-item').forEach(el => {
    const match = (el.dataset.cat === category && el.dataset.sub === sub);
    el.classList.toggle('active', match);
  });

  // 展开对应的一级分类
  const folder = document.querySelector(`.folder[data-cat="${category}"]`);
  if (folder) {
    folder.classList.add('open');
    const ul = folder.nextElementSibling;
    if (ul) ul.classList.add('open');
  }

  // 按分类过滤主列表：根据当前 Tab 分支
  if (currentTab === 'prompts') {
    filterByCategory(category, sub);
  } else {
    filterGroupsByCategory(category, sub);
  }
}

// 抽词：仅替换未锁定的抽词项；为每个已选二级标签维护独立卡槽（tagKey）
function drawWords() {
  if (selectedTags.size === 0) {
    showToast('请先在设置中勾选需要的二级标签', true);
    return;
  }

  const selectedKeys = Array.from(selectedTags);

  // 遍历每个选中标签
  selectedKeys.forEach(key => {
    const [category, sub] = key.split('|');
    const arr = (rawData[category] && rawData[category][sub]) ? rawData[category][sub] : [];
    if (!arr || arr.length === 0) return;

    // 寻找已有卡槽
    let idx = cart.findIndex(i =>
      i.source === 'draw' &&
      ((i.tagKey && i.tagKey === key) || (!i.tagKey && i.category === `${category} / ${sub}`))
    );

    // 随机抽取
    const itemRaw = arr[Math.floor(Math.random() * arr.length)];
    const picked = {
      word: itemRaw["词"],
      meaning: itemRaw["词2"],
      note: itemRaw["说明"],
      category: `${category} / ${sub}`,
      strength: itemRaw["强度"],
      source: 'draw',
      tagKey: key,
      locked: false
    };

    if (idx !== -1) {
      // 兼容：给旧项补 tagKey
      if (!cart[idx].tagKey) cart[idx].tagKey = key;

      // 已有卡槽：若锁定则跳过；否则替换
      if (!cart[idx].locked) {
        cart[idx] = picked;
      }
    } else {
      // 不存在卡槽：追加到末尾
      cart.push(picked);
    }
  });

  // 清理：移除“未锁定”的抽词项中，tagKey 不在 selectedTags 的项
  for (let i = cart.length - 1; i >= 0; i--) {
    const it = cart[i];
    if (it.source === 'draw') {
      const key = it.tagKey || (it.category && it.category.includes(' / ')
        ? it.category.split(' / ')[0] + '|' + it.category.split(' / ')[1]
        : null);
      if (key && !selectedTags.has(key) && !it.locked) {
        cart.splice(i, 1);
      }
    }
  }

  updateCart();
  showToast('抽词完成（锁定项未变更）');
}

// 初始化：异步加载 JSON 并渲染（默认激活“第一个一级/第一个二级”）
function initApp() {
  fetch('test-data.json')
    .then(res => res.json())
    .then(data => {
      rawData = data;
      keywords = flattenKeywords(data);

      // 若提示词页尚未初始化，则设定默认激活为数据中的第一个
      if (!promptsActive.initialized) {
        const first = getFirstCatSub(data);
        promptsActive.category = first.category;
        promptsActive.sub = first.sub;
        promptsActive.initialized = true;
      }

      // 覆写全局 active 以驱动侧栏高亮与列表渲染
      activeCategory = promptsActive.category;
      activeSub = promptsActive.sub;

      renderCategoryTree(data);

      if (activeCategory && activeSub) {
        setActiveSubItem(activeCategory, activeSub);
      } else {
        renderCards(keywords);
      }

      updateCart();
    })
    .catch(() => {
      showToast('关键词数据加载失败', true);
    });
}

// 页面就绪后初始化
window.addEventListener('DOMContentLoaded', initApp);
// 新增：页面就绪时初始化词组页数据
window.addEventListener('DOMContentLoaded', initGroups);

// 新增：词组页按分类过滤
function filterGroupsByCategory(category, sub) {
  const filtered = (groups || []).filter(g => g.category === `${category} / ${sub}`);
  renderGroups(filtered);
}

// 搜索过滤：在词组页进行组级搜索（标题/描述/items）
function filterCards() {
  const query = document.querySelector('.search-box').value.toLowerCase();

  if (currentTab === 'prompts') {
    const filtered = keywords.filter(k =>
      k.word.toLowerCase().includes(query) ||
      k.meaning.toLowerCase().includes(query) ||
      k.note.toLowerCase().includes(query)
    );
    renderCards(filtered);
  } else {
    const filtered = (groups || []).filter(g => {
      const inTitle = (g.title || '').toLowerCase().includes(query);
      const inDesc = (g.description || '').toLowerCase().includes(query);
      const inItems = (g.items || []).some(it =>
        (it.word || '').toLowerCase().includes(query) ||
        (it.meaning || '').toLowerCase().includes(query) ||
        (it.note || '').toLowerCase().includes(query)
      );
      return inTitle || inDesc || inItems;
    });
    renderGroups(filtered);
  }
}