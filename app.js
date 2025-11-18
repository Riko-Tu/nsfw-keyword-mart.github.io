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


function initGroups() {
  // 清理localStorage中可能存在的customGroups数据（废弃功能）
  try {
    localStorage.removeItem('customGroups');
  } catch (e) {
    // 忽略localStorage错误
  }
  
  fetch('groups.json')
    .then(r => r.json())
    .then(data => {
      groupsRaw = data || {};
      
      groups = flattenGroups(groupsRaw);

      // 首次进入词组页时设定默认激活为"第一个一级/第一个二级"
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
  const settingsModal = document.getElementById('settingsModal');
  if (settingsModal) {
    settingsModal.classList.add('show');
  } else {
    console.error('设置弹窗元素未找到');
  }
}

function closeSettingsModal() {
  const settingsModal = document.getElementById('settingsModal');
  if (settingsModal) {
    settingsModal.classList.remove('show');
  } else {
    console.error('设置弹窗元素未找到');
  }

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
  if (!body) {
    console.error('设置弹窗内容容器未找到');
    return;
  }
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
    const tagsHtml = (g.tags || [])
      .map(t => `<span class="tag-pill">${t}</span>`).join(' ');
    const count = g.items.length;
    const gJson = JSON.stringify(g).replace(/"/g, '&quot;');

    // 生成items列表HTML，只显示中文词
    const chineseWords = (g.items || []).map(it => it.meaning || '').filter(Boolean).join(', ');
    const itemsHtml = `
      <div class="group-items-line">
        <div class="group-chinese-words">${chineseWords}</div>
      </div>
    `;

    return `
      <div class="card group-card">
        <div class="card-header">
          <div class="word">${g.title}</div>
          <div class="card-tags">${tagsHtml}</div>
        </div>
        
        <div class="card-content">
          ${itemsHtml}
        </div>
        
        <div class="card-footer">
          <div class="note">共 ${count} 个词</div>
          <div class="card-actions">
            <button class="icon-btn btn-copy" onclick="copyGroup(${gJson})" title="复制组内词为一行">
              <i class="fas fa-copy"></i>
            </button>
          </div>
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

// 添加导出购物车为词组JSON格式的函数
function exportCartAsGroupJSON() {
  if (cart.length === 0) {
    showToast('购物车为空，无法导出', true);
    return;
  }

  // 提取所有标签，只保留二级标签（如"日常"）
  const uniqueTags = [...new Set(cart.flatMap(item => {
    const extractedTags = [];
    
    // 尝试多种可能的标签来源，重点提取二级标签
    const possibleTagProps = [
      item.subCategory, // 直接尝试subCategory属性（通常是二级标签）
      item.sub,         // 尝试sub属性
      item.subItem,     // 尝试subItem属性
      item.subType,     // 尝试subType属性
      item.category2,   // 尝试category2属性
      item.category,    // 尝试category属性，可能包含"动作/日常"格式
      item.meaning      // 尝试meaning属性，可能包含子类别信息
    ].filter(tag => tag && typeof tag === 'string' && tag.trim());
    
    // 处理每个可能的标签
    possibleTagProps.forEach(tag => {
      const trimmedTag = tag.trim();
      
      // 重点处理包含"/"分隔符的情况，例如"动作/日常"或"动作 / 日常"
      if (trimmedTag.includes('/')) {
        // 分割并清理各部分
        const parts = trimmedTag.split('/')
          .map(part => part.trim())
          .filter(Boolean);
        
        // 只添加第二部分作为二级标签（如果存在）
        if (parts.length > 1) {
          const secondaryTag = parts[1];
          if (secondaryTag && !extractedTags.includes(secondaryTag)) {
            extractedTags.push(secondaryTag);
          }
        }
      } else {
        // 对于直接的二级标签属性（如subCategory），直接添加
        // 但需要避免添加一级标签
        const isSecondaryTagOnly = 
          (item.subCategory === trimmedTag || 
           item.sub === trimmedTag || 
           item.subItem === trimmedTag || 
           item.subType === trimmedTag || 
           item.category2 === trimmedTag);
        
        if (isSecondaryTagOnly && trimmedTag && !extractedTags.includes(trimmedTag)) {
          extractedTags.push(trimmedTag);
        }
      }
    });
    
    // 确保只返回有效的标签
    return extractedTags.filter(tag => tag && tag.trim());
  }))].filter(tag => tag && tag.trim());

  // 创建模态框
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'exportModal';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
  modal.style.zIndex = '1000';
  
  // 模态框内容 - 使用与页面一致的暗色主题
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.maxWidth = '600px';
  modalContent.style.width = '90%';
  modalContent.style.maxHeight = '80vh';
  modalContent.style.overflow = 'auto';
  modalContent.style.backgroundColor = '#1e1e1e'; // 与卡片背景色一致
  modalContent.style.borderRadius = '12px'; // 与卡片圆角一致
  modalContent.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)'; // 与卡片阴影一致
  modalContent.style.color = '#eee'; // 与页面文字颜色一致
  
  // 模态框头部 - 与页面主题一致
  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';
  modalHeader.style.padding = '16px';
  modalHeader.style.borderBottom = '1px solid #333'; // 与页面边框色一致
  modalHeader.style.display = 'flex';
  modalHeader.style.justifyContent = 'space-between';
  modalHeader.style.alignItems = 'center';
  
  const modalTitle = document.createElement('h3');
  modalTitle.textContent = '导出词组JSON';
  modalTitle.style.margin = '0';
  modalTitle.style.color = '#eee'; // 与页面文字颜色一致
  
  const closeButton = document.createElement('button');
  closeButton.className = 'modal-close';
  closeButton.textContent = '×';
  closeButton.style.background = 'none';
  closeButton.style.border = 'none';
  closeButton.style.color = '#e0e0e0';
  closeButton.style.fontSize = '24px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.padding = '5px';
  closeButton.style.lineHeight = '1';
  closeButton.onclick = function() {
    document.body.removeChild(modal);
  };
  
  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButton);
  
  // 模态框主体 - 与页面主题一致
  const modalBody = document.createElement('div');
  modalBody.className = 'modal-body';
  modalBody.style.padding = '20px'; // 与卡片网格内边距一致
  
  // 标题输入框 - 与搜索框样式一致
  const titleDiv = document.createElement('div');
  titleDiv.style.marginBottom = '20px';
  
  const titleLabel = document.createElement('label');
  titleLabel.textContent = '标题 (必填)：';
  titleLabel.style.display = 'block';
  titleLabel.style.marginBottom = '8px';
  titleLabel.style.color = '#eee'; // 与页面文字颜色一致
  
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'export-input';
  titleInput.value = `自定义词组 ${new Date().toLocaleString('zh-CN')}`;
  titleInput.style.width = '100%';
  titleInput.style.padding = '10px 16px';
  titleInput.style.boxSizing = 'border-box';
  titleInput.style.backgroundColor = '#333'; // 与搜索框背景色一致
  titleInput.style.border = 'none';
  titleInput.style.borderRadius = '6px'; // 与按钮圆角一致
  titleInput.style.fontSize = '0.95rem';
  titleInput.style.color = '#fff'; // 与搜索框文字颜色一致
  titleInput.style.outline = 'none';
  
  titleDiv.appendChild(titleLabel);
  titleDiv.appendChild(titleInput);
  
  // 描述输入框 - 与页面主题一致
  const descDiv = document.createElement('div');
  descDiv.style.marginBottom = '20px';
  
  const descLabel = document.createElement('label');
  descLabel.textContent = '描述：';
  descLabel.style.display = 'block';
  descLabel.style.marginBottom = '8px';
  descLabel.style.color = '#eee'; // 与页面文字颜色一致
  
  const descInput = document.createElement('textarea');
  descInput.className = 'export-textarea';
  descInput.value = '从购物车导出的自定义词组';
  descInput.style.width = '100%';
  descInput.style.height = '80px';
  descInput.style.padding = '10px 16px';
  descInput.style.boxSizing = 'border-box';
  descInput.style.resize = 'vertical';
  descInput.style.backgroundColor = '#333'; // 与搜索框背景色一致
  descInput.style.border = 'none';
  descInput.style.borderRadius = '6px'; // 与按钮圆角一致
  descInput.style.fontSize = '0.95rem';
  descInput.style.color = '#fff'; // 与搜索框文字颜色一致
  descInput.style.outline = 'none';
  
  descDiv.appendChild(descLabel);
  descDiv.appendChild(descInput);
  
  // 标签显示 - 与页面主题一致，确保正确提取二级标签
  const tagsDiv = document.createElement('div');
  tagsDiv.style.marginBottom = '20px';
  
  const tagsLabel = document.createElement('label');
  tagsLabel.textContent = '标签 (自动提取)：';
  tagsLabel.style.display = 'block';
  tagsLabel.style.marginBottom = '8px';
  tagsLabel.style.color = '#eee'; // 与页面文字颜色一致
  
  const tagsDisplay = document.createElement('div');
  tagsDisplay.className = 'tags-display';
  tagsDisplay.style.minHeight = '30px';
  tagsDisplay.style.padding = '8px';
  tagsDisplay.style.backgroundColor = '#1a1a1a'; // 与侧边栏背景色一致
  tagsDisplay.style.borderRadius = '6px';
  tagsDisplay.style.flexWrap = 'wrap';
  tagsDisplay.style.display = 'flex';
  
  // 确保tags内容正确显示
  if (uniqueTags && uniqueTags.length > 0) {
    uniqueTags.forEach(tag => {
      if (tag && typeof tag === 'string' && tag.trim()) {
        const cleanTag = tag.trim();
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        tagSpan.textContent = cleanTag;
        tagSpan.style.display = 'inline-flex';
        tagSpan.style.padding = '4px 10px';
        tagSpan.style.margin = '4px 4px 4px 0';
        tagSpan.style.backgroundColor = '#333'; // 与搜索框背景色一致
        tagSpan.style.borderRadius = '16px';
        tagSpan.style.fontSize = '0.9rem';
        tagSpan.style.color = '#ccc'; // 与次要文字颜色一致
        tagsDisplay.appendChild(tagSpan);
      }
    });
  } else {
    tagsDisplay.textContent = '无标签';
    tagsDisplay.style.color = '#999';
    tagsDisplay.style.fontSize = '0.9rem';
    tagsDisplay.style.alignItems = 'center';
    tagsDisplay.style.justifyContent = 'center';
  }
  
  tagsDiv.appendChild(tagsLabel);
  tagsDiv.appendChild(tagsDisplay);
  
  // JSON预览 - 与页面主题一致
  const jsonDiv = document.createElement('div');
  jsonDiv.style.marginBottom = '20px';
  
  const jsonLabel = document.createElement('label');
  jsonLabel.textContent = 'JSON预览：';
  jsonLabel.style.display = 'block';
  jsonLabel.style.marginBottom = '8px';
  jsonLabel.style.color = '#eee'; // 与页面文字颜色一致
  
  const jsonTextarea = document.createElement('textarea');
  jsonTextarea.className = 'export-json';
  jsonTextarea.readOnly = true;
  jsonTextarea.style.width = '100%';
  jsonTextarea.style.height = '200px';
  jsonTextarea.style.padding = '12px';
  jsonTextarea.style.boxSizing = 'border-box';
  jsonTextarea.style.fontFamily = 'monospace';
  jsonTextarea.style.fontSize = '0.9rem';
  jsonTextarea.style.resize = 'vertical';
  jsonTextarea.style.backgroundColor = '#121212'; // 与主内容区背景色一致
  jsonTextarea.style.border = '1px solid #333';
  jsonTextarea.style.borderRadius = '6px';
  jsonTextarea.style.color = '#eee'; // 与页面文字颜色一致
  jsonTextarea.style.outline = 'none';
  
  jsonDiv.appendChild(jsonLabel);
  jsonDiv.appendChild(jsonTextarea);
  
  // 添加到模态框主体
  modalBody.appendChild(titleDiv);
  modalBody.appendChild(descDiv);
  modalBody.appendChild(tagsDiv);
  modalBody.appendChild(jsonDiv);
  
  // 模态框底部 - 与页面主题一致，移除保存按钮功能
  const modalFooter = document.createElement('div');
  modalFooter.className = 'modal-footer';
  modalFooter.style.padding = '16px';
  modalFooter.style.borderTop = '1px solid #333'; // 与页面边框色一致
  modalFooter.style.display = 'flex';
  modalFooter.style.justifyContent = 'flex-end';
  
  // 复制JSON按钮 - 使用页面按钮样式
  const copyButton = document.createElement('button');
  copyButton.textContent = '复制JSON';
  copyButton.style.padding = '8px 16px';
  copyButton.style.backgroundColor = '#007bff'; // 与页面按钮颜色一致
  copyButton.style.color = '#fff';
  copyButton.style.border = 'none';
  copyButton.style.borderRadius = '6px'; // 与页面按钮圆角一致
  copyButton.style.cursor = 'pointer';
  copyButton.style.fontSize = '0.9rem';
  copyButton.style.transition = '0.2s';
  copyButton.onclick = function() {
    const title = titleInput.value.trim();
    if (!title) {
      showToast('请输入标题', true);
      titleInput.focus();
      return;
    }
    
    // 创建符合groups.json格式的词组数据
    // 确保tags字段正确包含购物车内关键词的二级标签和中文关键词
    const finalTags = Array.isArray(uniqueTags) ? uniqueTags.filter(tag => 
      typeof tag === 'string' && tag.trim()
    ) : [];
    
    const groupJSON = {
      "title": title,
      "description": descInput.value.trim() || '从购物车导出的自定义词组',
      "tags": finalTags,
      "items": cart.map(item => ({
        "词": item.word,
        "词2": item.meaning || '',
        "强度": item.strength || 0.7,
        "说明": item.note || ''
      }))
    };
    
    // 修改JSON格式化方式，确保tags和items数组在一行展示
    // 自定义JSON格式化函数，确保tags字段一行展示，items中的每个对象为一行
    function formatJSON(group) {
      let result = '{' + '\n';
      
      // 添加title字段
      result += '        "title": "' + group.title.replace(/"/g, '\\"') + '",' + '\n';
      
      // 添加description字段
      result += '        "description": "' + group.description.replace(/"/g, '\\"') + '",' + '\n';
      
      // 添加tags字段（一行展示）
      const tagsString = group.tags.map(tag => '"' + tag.replace(/"/g, '\\"') + '"').join(', ');
      result += '        "tags": [' + tagsString + '],' + '\n';
      
      // 添加items字段
      result += '        "items": [' + '\n';
      group.items.forEach((item, idx) => {
        // 每个对象一行，内部字段不换行
        result += '          {"词": "' + item["词"].replace(/"/g, '\\"') + '", "词2": "' + 
                  item["词2"].replace(/"/g, '\\"') + '", "强度": ' + item["强度"] + ', "说明": "' + 
                  item["说明"].replace(/"/g, '\\"') + '"}' + (idx < group.items.length - 1 ? ',' : '') + '\n';
      });
      result += '        ]' + '\n';
      
      result += '      }';
      return result;
    }
    
    const jsonStr = formatJSON(groupJSON);
    
    navigator.clipboard.writeText(jsonStr).then(() => {
      showToast('词组JSON已复制到剪贴板');
    }).catch(err => {
      showToast('复制失败，请手动复制', true);
      jsonTextarea.select();
    });
  };
  
  // 关闭按钮 - 使用与页面一致的风格
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '关闭';
  closeBtn.style.marginLeft = '12px';
  closeBtn.style.padding = '8px 16px';
  closeBtn.style.backgroundColor = 'transparent'; // 透明背景
  closeBtn.style.color = '#eee';
  closeBtn.style.border = '1px solid #333'; // 与页面边框色一致
  closeBtn.style.borderRadius = '6px'; // 与页面按钮圆角一致
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '0.9rem';
  closeBtn.style.transition = '0.2s';
  closeBtn.onclick = function() {
    document.body.removeChild(modal);
  };
  
  modalFooter.appendChild(copyButton);
  modalFooter.appendChild(closeBtn);
  
  // 组装模态框
  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);
  modalContent.appendChild(modalFooter);
  modal.appendChild(modalContent);
  
  // 添加到页面
  document.body.appendChild(modal);
  
  // 初始化预览
  updateJsonPreview();
  
  // 监听输入变化，更新预览
  titleInput.addEventListener('input', updateJsonPreview);
  descInput.addEventListener('input', updateJsonPreview);
  
  // 移除点击外部关闭的功能，用户只能通过关闭按钮关闭弹窗
  
  // 更新JSON预览的辅助函数
  function updateJsonPreview() {
    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    
    // 确保tags字段正确包含购物车内关键词的二级标签和中文关键词
    // 创建最终的tags数组，确保它是一个数组，并且只包含有效的非空字符串
    const finalTags = Array.isArray(uniqueTags) ? uniqueTags.filter(tag => 
      typeof tag === 'string' && tag.trim()
    ) : [];
    
    const groupJSON = {
      "title": title || `自定义词组 ${new Date().toLocaleString('zh-CN')}`,
      "description": description || '从购物车导出的自定义词组',
      "tags": finalTags,
      "items": cart.map(item => ({
        "词": item.word,
        "词2": item.meaning || '',
        "强度": item.strength || 0.7,
        "说明": item.note || ''
      }))
    };
    
    // 自定义JSON格式化函数，确保tags字段一行展示，items中的每个对象为一行
    function formatJSON(group) {
      let result = '{' + '\n';
      
      // 添加title字段
      result += '        "title": "' + group.title.replace(/"/g, '\\"') + '",' + '\n';
      
      // 添加description字段
      result += '        "description": "' + group.description.replace(/"/g, '\\"') + '",' + '\n';
      
      // 添加tags字段（一行展示）
      const tagsString = group.tags.map(tag => '"' + tag.replace(/"/g, '\\"') + '"').join(', ');
      result += '        "tags": [' + tagsString + '],' + '\n';
      
      // 添加items字段
      result += '        "items": [' + '\n';
      group.items.forEach((item, idx) => {
        // 每个对象一行，内部字段不换行
        result += '          {"词": "' + item["词"].replace(/"/g, '\\"') + '", "词2": "' + 
                  item["词2"].replace(/"/g, '\\"') + '", "强度": ' + item["强度"] + ', "说明": "' + 
                  item["说明"].replace(/"/g, '\\"') + '"}' + (idx < group.items.length - 1 ? ',' : '') + '\n';
      });
      result += '        ]' + '\n';
      
      result += '      }';
      return result;
    }
    
    jsonTextarea.value = formatJSON(groupJSON);
  }
}