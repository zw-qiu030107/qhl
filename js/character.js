/**
 * js/character.js — 角色设定与管理
 *
 * 三个模块：
 * - CharacterSettings — 右侧面板"角色"标签页的快速设定
 * - CharacterManager — 角色卡列表的导入/导出/删除
 * - CharacterEditor   — 角色卡详细编辑器（表单/JSON 双视图）
 *
 * @namespace CharacterSettings
 * @namespace CharacterManager
 * @namespace CharacterEditor
 */

// =============================================================================
// CharacterSettings — 角色快速设定
// =============================================================================

/**
 * 右侧面板"角色"标签页的快速设定表单
 *
 * 与 storage 中的 character_card 同步，
 * 支持 Tab 切换和简单的字段读写。
 *
 * @namespace CharacterSettings
 */
const CharacterSettings = (function () {
  'use strict';

  /** @type {Object<string,HTMLInputElement|HTMLTextAreaElement>} 字段引用缓存 */
  var _fields = {};

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * 初始化 — 缓存字段引用、绑定 Tab 切换、加载数据
   */
  function init() {
    // 缓存字段引用
    _fields = {
      name: document.getElementById('cs-name'),
      nickname: document.getElementById('cs-nickname'),
      age: document.getElementById('cs-age'),
      zodiac: document.getElementById('cs-zodiac'),
      personality: document.getElementById('cs-personality'),
      likes: document.getElementById('cs-likes'),
      background: document.getElementById('cs-background'),
      relationship: document.getElementById('cs-relationship'),
    };

    loadFromCard();

    // Tab 切换
    var panel = document.getElementById('right-panel');
    if (panel) {
      var tabs = panel.querySelectorAll('.tab-btn');
      tabs.forEach(function (btn) {
        btn.addEventListener('click', function () {
          // 清除所有激活状态
          tabs.forEach(function (b) { b.classList.remove('active'); });
          panel.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });
          // 激活当前
          btn.classList.add('active');
          var content = document.getElementById(btn.getAttribute('data-tab'));
          if (content) content.classList.add('active');
        });
      });
    }
  }

  /**
   * 从 storage 中的 character_card 加载数据到表单
   */
  function loadFromCard() {
    if (typeof window.storage === 'undefined') return;
    var card = window.storage.get('character_card');
    if (!card) return;

    var d = card.data || card;
    _setVal('name', d.name || '');
    _setVal('nickname', d.description || '');
    _setVal('personality', d.personality || '');
    _setVal('background', d.scenario || '');
  }

  /**
   * 设置字段值（通过字段 key）
   * @param {string} key — 字段名
   * @param {string} val — 值
   */
  function setVal(key, val) {
    _setVal(key, val);
  }

  /**
   * 获取字段值
   * @param {string} key — 字段名
   * @returns {string}
   */
  function getVal(key) {
    var el = _fields[key];
    return el ? el.value : '';
  }

  /**
   * 保存当前表单数据到 character_card
   */
  function save() {
    try {
      if (typeof window.storage === 'undefined') return;
      var card = window.storage.get('character_card') || {};
      card.data = card.data || {};
      card.data.name = getVal('name');
      card.data.personality = getVal('personality');
      card.data.scenario = getVal('background');
      window.storage.set('character_card', card);

      if (typeof window.notifications !== 'undefined') {
        window.notifications.show('success', '已保存', '角色设定已更新');
      }
    } catch (e) {
      console.warn('[CharacterSettings] 保存失败:', e.message);
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * @param {string} key
   * @param {string} val
   * @private
   */
  function _setVal(key, val) {
    var el = _fields[key];
    if (el) el.value = val;
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  return {
    init: init,
    loadFromCard: loadFromCard,
    setVal: setVal,
    getVal: getVal,
    save: save,
  };
})();

// =============================================================================
// CharacterManager — 角色卡列表管理
// =============================================================================

/**
 * 角色卡管理器
 *
 * 支持拖拽/点击导入 JSON 或 PNG 角色卡，
 * 管理角色卡列表的 CRUD，自动应用角色卡到 UI。
 *
 * @namespace CharacterManager
 */
const CharacterManager = (function () {
  'use strict';

  /** @type {Object[]} 角色卡列表 */
  var _cards = [];

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * 初始化 — 加载存储数据，设置拖拽区域
   */
  function init() {
    loadFromStorage();
    setupDragDrop();
  }

  /**
   * 渲染角色卡列表到 #char-card-list
   */
  function renderList() {
    var list = document.getElementById('char-card-list');
    if (!list) return;

    if (!_cards.length) {
      list.innerHTML = '<div class="empty-list-msg">暂无角色卡，拖拽 JSON 文件到上方导入</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < _cards.length; i++) {
      var card = _cards[i];
      var name = (card.data && card.data.name) || card.name || '未命名';
      var desc = (card.data && card.data.description) || card.description || '';
      html +=
        '<div class="char-card-item" data-index="' + i + '">' +
          '<div class="char-card-info">' +
            '<span class="char-card-name">' + escapeHtml(name) + '</span>' +
            '<span class="char-card-desc">' + escapeHtml(desc) + '</span>' +
          '</div>' +
          '<div class="char-card-actions">' +
            '<button class="btn-card-edit" data-index="' + i + '" title="编辑">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
            '</button>' +
            '<button class="btn-card-delete" data-index="' + i + '" title="删除">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>';
    }
    list.innerHTML = html;

    // 绑定编辑按钮
    list.querySelectorAll('.btn-card-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-index'), 10);
        var card = _cards[idx];
        if (card && typeof CharacterEditor !== 'undefined') {
          CharacterEditor.loadCard(card);
          CharacterEditor.currentIndex = idx;
          if (typeof ModalManager !== 'undefined') {
            ModalManager.open('modal-char-editor');
          }
        }
      });
    });

    // 绑定删除按钮
    list.querySelectorAll('.btn-card-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-index'), 10);
        deleteCard(idx);
      });
    });
  }

  /**
   * 设置拖拽上传区域
   */
  function setupDragDrop() {
    var zone = document.getElementById('char-drop-zone');
    var input = document.getElementById('char-file-input');
    if (!zone || !input) return;

    // 点击触发文件选择
    zone.addEventListener('click', function () { input.click(); });

    // 拖拽事件
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', function () {
      zone.classList.remove('drag-over');
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('drag-over');
      var file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.json') || file.name.endsWith('.png'))) {
        readFile(file);
      }
    });

    // 文件选择事件
    input.addEventListener('change', function () {
      var file = input.files[0];
      if (file) readFile(file);
      input.value = '';
    });
  }

  /**
   * 读取上传的角色卡文件（JSON 或 PNG）
   *
   * @param {File} file
   */
  function readFile(file) {
    // PNG 角色卡 — 使用 ST.Importer 提取
    if (file.type.indexOf('png') !== -1 || file.name.endsWith('.png')) {
      if (window.ST && ST.Importer && typeof ST.Importer.extractCardFromPng === 'function') {
        ST.Importer.extractCardFromPng(file).then(function (card) {
          importCard(card);
        }).catch(function (err) {
          if (typeof window.notifications !== 'undefined') {
            window.notifications.show('error', '导入失败', err.message || String(err));
          }
        });
      } else {
        if (typeof window.notifications !== 'undefined') {
          window.notifications.show('warning', '不支持', 'PNG 角色卡需要 ST 模块支持');
        }
      }
      return;
    }

    // JSON 角色卡
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var raw = JSON.parse(e.target.result);
        var card = (window.ST && ST.Importer && typeof ST.Importer.importCharacterCard === 'function')
          ? ST.Importer.importCharacterCard(raw)
          : raw;
        importCard(card);
      } catch (err) {
        if (typeof window.notifications !== 'undefined') {
          window.notifications.show('error', '导入失败', 'JSON 解析错误：' + err.message);
        }
      }
    };
    reader.onerror = function () {
      if (typeof window.notifications !== 'undefined') {
        window.notifications.show('error', '读取失败', '无法读取文件');
      }
    };
    reader.readAsText(file);
  }

  /**
   * 导入角色卡 — 添加到列表、保存、应用到 UI
   *
   * @param {Object} card
   */
  function importCard(card) {
    _cards.push(card);
    saveToStorage();
    renderList();

    var name = (card.data && card.data.name) || card.name || '角色卡';
    if (typeof window.notifications !== 'undefined') {
      window.notifications.show('success', '导入成功', '已导入「' + name + '」');
    }

    // 自动应用为当前角色
    if (window.ST && ST.Importer && typeof ST.Importer.applyCharacterCard === 'function') {
      ST.Importer.applyCharacterCard(card);
    } else if (typeof CharacterSettings !== 'undefined') {
      CharacterSettings.loadFromCard();
    }
  }

  /**
   * 导出角色卡 JSON 文件
   *
   * @param {number} index — 卡片索引
   */
  function exportCard(index) {
    var card = _cards[index];
    if (!card) return;
    var name = (card.data && card.data.name) || card.name || 'character';
    var json = JSON.stringify(card, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 删除指定索引的角色卡
   *
   * @param {number} index
   */
  function deleteCard(index) {
    if (index < 0 || index >= _cards.length) return;
    _cards.splice(index, 1);
    saveToStorage();
    renderList();
    if (typeof window.notifications !== 'undefined') {
      window.notifications.show('info', '已删除', '角色卡已移除');
    }
  }

  /**
   * 保存角色卡列表到 localStorage
   */
  function saveToStorage() {
    if (typeof window.storage !== 'undefined') {
      window.storage.set('character_cards', _cards);
    }
  }

  /**
   * 从 localStorage 加载角色卡列表
   */
  function loadFromStorage() {
    if (typeof window.storage !== 'undefined') {
      var data = window.storage.get('character_cards');
      _cards = Array.isArray(data) ? data : [];
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * HTML 安全转义
   * @param {string} str
   * @returns {string}
   * @private
   */
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  return {
    cards: _cards, // 向后兼容
    init: init,
    renderList: renderList,
    setupDragDrop: setupDragDrop,
    readFile: readFile,
    importCard: importCard,
    exportCard: exportCard,
    deleteCard: deleteCard,
    saveToStorage: saveToStorage,
    loadFromStorage: loadFromStorage,
  };
})();

// =============================================================================
// CharacterEditor — 角色卡编辑器
// =============================================================================

/**
 * 角色卡详细编辑器
 *
 * 支持表单视图和 JSON 原始视图双模式切换，
 * 含标签（tags）的内联添加/删除，
 * 以及健谈度（talkativeness）滑块。
 *
 * @namespace CharacterEditor
 */
const CharacterEditor = (function () {
  'use strict';

  /** @type {number} 当前编辑的角色卡在 CharacterManager.cards 中的索引 */
  var _currentIndex = -1;

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * 初始化编辑器 — 绑定所有编辑控件
   */
  function init() {
    // 健谈度滑块
    var range = document.getElementById('editor-talkativeness');
    var val = document.getElementById('editor-talkativeness-val');
    if (range && val) {
      range.addEventListener('input', function () {
        val.textContent = range.value;
      });
    }

    // 标签输入（回车添加）
    var tagInput = document.getElementById('editor-tags-input');
    if (tagInput) {
      tagInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var text = tagInput.value.trim();
          if (text) addTag(text);
          tagInput.value = '';
        }
      });
    }

    // 视图切换按钮
    var toggleBtn = document.getElementById('editor-toggle-view');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () { toggleView(); });
    }

    // 保存按钮
    var saveBtn = document.getElementById('editor-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () { save(); });
    }
  }

  /**
   * 加载角色卡数据到编辑器表单
   *
   * @param {Object} card — 角色卡对象
   */
  function loadCard(card) {
    var d = card.data || card;

    _setElementValue('editor-name', d.name || '');
    _setElementValue('editor-description', d.description || '');
    _setElementValue('editor-personality', d.personality || '');
    _setElementValue('editor-scenario', d.scenario || '');
    _setElementValue('editor-first-mes', d.first_mes || '');
    _setElementValue('editor-mes-example', d.mes_example || '');

    var talkativeness = d.talkativeness != null ? d.talkativeness : 50;
    _setElementValue('editor-talkativeness', talkativeness);
    var tv = document.getElementById('editor-talkativeness-val');
    if (tv) tv.textContent = talkativeness;

    // 标签
    var container = document.getElementById('editor-tags-container');
    if (container) {
      // 移除旧 chip（保留 input）
      container.querySelectorAll('.tag-chip').forEach(function (el) { el.remove(); });
      if (Array.isArray(d.tags)) {
        d.tags.forEach(function (tag) { addTag(tag); });
      }
    }

    // 同步 JSON 视图
    syncJsonView();
    // 确保显示表单视图
    showFormView();
  }

  /**
   * 切换表单视图 / JSON 视图
   */
  function toggleView() {
    var formView = document.getElementById('editor-form-view');
    var jsonView = document.getElementById('editor-json-view');
    var toggleBtn = document.getElementById('editor-toggle-view');
    if (!formView || !jsonView || !toggleBtn) return;

    var isForm = formView.style.display !== 'none';
    if (isForm) {
      // 切换到 JSON 视图
      syncJsonView();
      formView.style.display = 'none';
      jsonView.style.display = 'block';
      toggleBtn.textContent = '表单视图';
    } else {
      // 切换到表单视图
      parseJsonView();
      jsonView.style.display = 'none';
      formView.style.display = 'block';
      toggleBtn.textContent = 'JSON 视图';
    }
  }

  /**
   * 同步 JSON 视图 — 将表单数据序列化到 textarea
   */
  function syncJsonView() {
    var textarea = document.getElementById('editor-json-textarea');
    if (!textarea) return;
    var card = collectCard();
    textarea.value = JSON.stringify(card, null, 2);
  }

  /**
   * 解析 JSON 视图 — 尝试解析 textarea 内容并回填表单
   */
  function parseJsonView() {
    var textarea = document.getElementById('editor-json-textarea');
    if (!textarea) return;
    try {
      var data = JSON.parse(textarea.value);
      loadCard(data);
    } catch (e) {
      if (typeof window.notifications !== 'undefined') {
        window.notifications.show('error', 'JSON 解析错误', '请检查格式后再切换');
      }
    }
  }

  /**
   * 收集表单数据，组装角色卡对象
   *
   * @returns {Object}
   */
  function collectCard() {
    return {
      name: _getElementValue('editor-name'),
      description: _getElementValue('editor-description'),
      personality: _getElementValue('editor-personality'),
      scenario: _getElementValue('editor-scenario'),
      first_mes: _getElementValue('editor-first-mes'),
      mes_example: _getElementValue('editor-mes-example'),
      talkativeness: parseInt(_getElementValue('editor-talkativeness'), 10) || 50,
      tags: getTags(),
    };
  }

  /**
   * 保存当前编辑的角色卡
   */
  function save() {
    var card = collectCard();
    if (typeof CharacterManager !== 'undefined') {
      if (_currentIndex >= 0 && _currentIndex < CharacterManager.cards.length) {
        // 更新已有卡片
        CharacterManager.cards[_currentIndex] = { data: card };
        CharacterManager.saveToStorage();
        CharacterManager.renderList();
      } else {
        // 保存为新卡片
        CharacterManager.cards.push({ data: card });
        CharacterManager.saveToStorage();
        CharacterManager.renderList();
      }
    }
    if (typeof window.notifications !== 'undefined') {
      window.notifications.show('success', '已保存', '角色卡「' + card.name + '」已更新');
    }
    if (typeof ModalManager !== 'undefined') {
      ModalManager.close();
    }
  }

  /**
   * 添加标签 chip
   *
   * @param {string} text
   */
  function addTag(text) {
    var container = document.getElementById('editor-tags-container');
    if (!container) return;

    var input = container.querySelector('.tag-input-inline');
    var chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML =
      escapeHtml(text) +
      '<span class="tag-remove" data-tag="' + escapeHtml(text) + '">' +
        '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</span>';

    var removeBtn = chip.querySelector('.tag-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        chip.remove();
      });
    }

    container.insertBefore(chip, input || null);
  }

  /**
   * 获取当前所有标签文本
   *
   * @returns {string[]}
   */
  function getTags() {
    var container = document.getElementById('editor-tags-container');
    if (!container) return [];
    var chips = container.querySelectorAll('.tag-chip');
    var tags = [];
    chips.forEach(function (chip) {
      tags.push(chip.childNodes[0].textContent.trim());
    });
    return tags;
  }

  // ===========================================================================
  // Accessors for external use
  // ===========================================================================

  Object.defineProperty(CharacterEditor, 'currentIndex', {
    get: function () { return _currentIndex; },
    set: function (v) { _currentIndex = v; },
    enumerable: true,
    configurable: true,
  });

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * @param {string} id
   * @param {string} val
   * @private
   */
  function _setElementValue(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  }

  /**
   * @param {string} id
   * @returns {string}
   * @private
   */
  function _getElementValue(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  /**
   * 显示表单视图（隐藏 JSON 视图）
   * @private
   */
  function showFormView() {
    var formView = document.getElementById('editor-form-view');
    var jsonView = document.getElementById('editor-json-view');
    var toggleBtn = document.getElementById('editor-toggle-view');
    if (formView) formView.style.display = 'block';
    if (jsonView) jsonView.style.display = 'none';
    if (toggleBtn) toggleBtn.textContent = 'JSON 视图';
  }

  /**
   * @param {string} str
   * @returns {string}
   * @private
   */
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  return {
    init: init,
    loadCard: loadCard,
    toggleView: toggleView,
    syncJsonView: syncJsonView,
    parseJsonView: parseJsonView,
    collectCard: collectCard,
    save: save,
    addTag: addTag,
    getTags: getTags,
  };
})();

// =============================================================================
// DOMContentLoaded 初始化
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {
  try { CharacterSettings.init(); } catch (e) { console.warn('[character.js] CharacterSettings.init 失败:', e.message); }
});

document.addEventListener('DOMContentLoaded', function () {
  try { CharacterManager.init(); } catch (e) { console.warn('[character.js] CharacterManager.init 失败:', e.message); }
  try { CharacterEditor.init(); } catch (e) { console.warn('[character.js] CharacterEditor.init 失败:', e.message); }
});
