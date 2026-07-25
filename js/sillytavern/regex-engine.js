/**
 * js/regex-engine.js — 正则脚本系统
 *
 * 独立的文本替换引擎，在消息发送前/接收后对文本应用正则规则。
 * 规则持久化到 localStorage，支持导入/导出 JSON。
 *
 * 与 SillyTavern 角色卡内的 regex_scripts 不同，
 * 此模块是全局的、独立于角色卡的正则系统。
 *
 * @namespace ST.RegexEngine
 */

(function () {
  'use strict';

  // ===========================================================================
  // 存储键
  // ===========================================================================

  var STORAGE_KEY = 'st_regex_rules';

  // ===========================================================================
  // 默认规则
  // ===========================================================================

  /**
   * 生成唯一 ID
   * @returns {string}
   */
  function _uid() {
    return 're_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /**
   * 默认规则列表
   * @type {Object[]}
   */
  var _defaultRules = [
    {
      id: _uid(),
      name: '移除思考标签',
      regex: '<thinking>[\\s\\S]*?</thinking>',
      replacement: '',
      flags: 'gi',
      scope: 'output',
      enabled: true,
      order: 0,
    },
  ];

  // ===========================================================================
  // 状态
  // ===========================================================================

  /** @type {Object[]} 规则列表 */
  var _rules = [];

  // ===========================================================================
  // 公共 API — 文本处理
  // ===========================================================================

  /**
   * 对输入文本应用所有 scope=input/both 的启用规则
   *
   * @param {string} text — 用户输入文本
   * @returns {string} 处理后的文本
   */
  function applyInput(text) {
    if (!text || typeof text !== 'string') return text;
    return _applyRules(text, 'input');
  }

  /**
   * 对输出文本应用所有 scope=output/both 的启用规则
   *
   * @param {string} text — 模型回复文本
   * @returns {string} 处理后的文本
   */
  function applyOutput(text) {
    if (!text || typeof text !== 'string') return text;
    return _applyRules(text, 'output');
  }

  // ===========================================================================
  // 公共 API — 规则管理
  // ===========================================================================

  /**
   * 获取所有规则（按 order 排序）
   * @returns {Object[]}
   */
  function getRules() {
    return _rules.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }

  /**
   * 添加新规则
   * @param {Object} [rule] — 可选的预设规则字段
   * @returns {Object} 新规则对象
   */
  function addRule(rule) {
    var newRule = {
      id: _uid(),
      name: (rule && rule.name) || '新规则',
      regex: (rule && rule.regex) || '',
      replacement: (rule && rule.replacement) || '',
      flags: (rule && rule.flags) || 'gi',
      scope: (rule && rule.scope) || 'both',
      enabled: (rule !== undefined && rule.enabled !== undefined) ? rule.enabled : true,
      order: _rules.length,
    };
    _rules.push(newRule);
    save();
    return newRule;
  }

  /**
   * 更新规则
   * @param {string} id — 规则 ID
   * @param {Object} updates — 要更新的字段
   * @returns {boolean} 是否成功
   */
  function updateRule(id, updates) {
    var rule = _findRule(id);
    if (!rule) return false;
    var keys = Object.keys(updates);
    for (var i = 0; i < keys.length; i++) {
      rule[keys[i]] = updates[keys[i]];
    }
    save();
    return true;
  }

  /**
   * 删除规则
   * @param {string} id — 规则 ID
   * @returns {boolean} 是否成功
   */
  function deleteRule(id) {
    var idx = _findIndex(id);
    if (idx === -1) return false;
    _rules.splice(idx, 1);
    save();
    return true;
  }

  /**
   * 上移规则（减小 order）
   * @param {string} id — 规则 ID
   */
  function moveUp(id) {
    var idx = _findIndex(id);
    if (idx <= 0) return;
    // 交换 order
    var a = _rules[idx];
    var b = _rules[idx - 1];
    var temp = a.order;
    a.order = b.order;
    b.order = temp;
    save();
  }

  /**
   * 下移规则（增大 order）
   * @param {string} id — 规则 ID
   */
  function moveDown(id) {
    var idx = _findIndex(id);
    if (idx < 0 || idx >= _rules.length - 1) return;
    var a = _rules[idx];
    var b = _rules[idx + 1];
    var temp = a.order;
    a.order = b.order;
    b.order = temp;
    save();
  }

  // ===========================================================================
  // 公共 API — 持久化
  // ===========================================================================

  /**
   * 从 localStorage 加载规则
   */
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        _rules = JSON.parse(raw);
        if (!Array.isArray(_rules)) _rules = [];
      } else {
        // 首次使用，写入默认规则
        _rules = JSON.parse(JSON.stringify(_defaultRules));
        save();
      }
    } catch (e) {
      console.warn('[ST.RegexEngine] 加载失败:', e.message);
      _rules = JSON.parse(JSON.stringify(_defaultRules));
    }
  }

  /**
   * 保存规则到 localStorage
   */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_rules));
    } catch (e) {
      console.warn('[ST.RegexEngine] 保存失败:', e.message);
    }
  }

  /**
   * 导出规则为 JSON 数组字符串
   * @returns {string}
   */
  function exportRules() {
    return JSON.stringify(_rules, null, 2);
  }

  /**
   * 从 JSON 数组导入规则
   * @param {string|Object[]} json — JSON 字符串或数组
   * @returns {{ success: boolean, count: number, error?: string }}
   */
  function importRules(json) {
    try {
      var arr;
      if (typeof json === 'string') {
        arr = JSON.parse(json);
      } else if (Array.isArray(json)) {
        arr = json;
      } else {
        return { success: false, count: 0, error: '数据格式错误: 需要 JSON 数组' };
      }

      if (!Array.isArray(arr)) {
        return { success: false, count: 0, error: '数据格式错误: 需要 JSON 数组' };
      }

      // 合并导入（去重）
      var existingIds = new Set();
      _rules.forEach(function (r) { existingIds.add(r.id); });

      var imported = 0;
      for (var i = 0; i < arr.length; i++) {
        var item = arr[i];
        // 确保必要字段
        if (!item.id) item.id = _uid();
        if (!item.name) item.name = '导入规则 ' + (i + 1);
        if (!item.scope) item.scope = 'both';
        if (item.enabled === undefined) item.enabled = true;
        if (item.order === undefined) item.order = _rules.length + imported;

        if (!existingIds.has(item.id)) {
          _rules.push(item);
          existingIds.add(item.id);
          imported++;
        }
      }

      save();
      return { success: true, count: imported };
    } catch (e) {
      return { success: false, count: 0, error: e.message };
    }
  }

  // ===========================================================================
  // 公共 API — UI
  // ===========================================================================

  /**
   * 初始化 UI — 创建规则列表容器并渲染
   */
  function initUI() {
    var tabContent = document.getElementById('tab-regex');
    if (!tabContent) return;

    // 构建 UI
    tabContent.innerHTML = _buildUI();
    _bindUIEvents();
    renderList();
  }

  /**
   * 渲染规则列表
   */
  function renderList() {
    var list = document.getElementById('regex-rule-list');
    if (!list) return;

    var countEl = document.getElementById('regex-count');
    var sorted = getRules();

    if (countEl) {
      var enabledCount = 0;
      sorted.forEach(function (r) { if (r.enabled) enabledCount++; });
      countEl.textContent = enabledCount + '/' + sorted.length + ' 条规则';
    }

    if (sorted.length === 0) {
      list.innerHTML = '<div class="regex-empty-state"><div class="empty-desc">暂无正则规则，点击"+ 新建"添加</div></div>';
      return;
    }

    list.innerHTML = '';

    var scopeLabels = { input: '输入', output: '输出', both: '双向' };

    for (var i = 0; i < sorted.length; i++) {
      var rule = sorted[i];
      var card = document.createElement('div');
      card.className = 'regex-rule' + (rule.enabled ? '' : ' disabled');

      var scopeLabel = scopeLabels[rule.scope] || '双向';
      var scopeClass = 'regex-scope-' + rule.scope;

      // Escape HTML for display
      var escRegex = _escapeHTML(rule.regex || '');
      var escReplacement = _escapeHTML(rule.replacement || '');

      card.innerHTML =
        '<div class="regex-rule-header">' +
          '<span class="regex-rule-name">' + _escapeHTML(rule.name || '未命名') + '</span>' +
          '<div class="regex-rule-meta">' +
            '<span class="regex-scope-badge ' + scopeClass + '">' + scopeLabel + '</span>' +
            '<button class="regex-btn-toggle ' + (rule.enabled ? 'enabled' : '') + '" data-id="' + rule.id + '" data-action="toggle" title="切换启用">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="regex-rule-body">' +
          '<div class="regex-field">' +
            '<label>名称</label>' +
            '<input type="text" class="regex-input-name" data-id="' + rule.id + '" value="' + _escapeHTML(rule.name || '') + '" placeholder="规则名称">' +
          '</div>' +
          '<div class="regex-field">' +
            '<label>正则表达式</label>' +
            '<input type="text" class="regex-input-pattern" data-id="' + rule.id + '" value="' + escRegex + '" placeholder="/pattern/flags">' +
          '</div>' +
          '<div class="regex-field">' +
            '<label>替换为</label>' +
            '<input type="text" class="regex-input-replacement" data-id="' + rule.id + '" value="' + escReplacement + '" placeholder="替换文本（支持 $1 捕获组）">' +
          '</div>' +
          '<div class="regex-field-row">' +
            '<div class="regex-field">' +
              '<label>标志</label>' +
              '<select class="regex-select-flags" data-id="' + rule.id + '">' +
                '<option value="g"' + (rule.flags === 'g' ? ' selected' : '') + '>g (全局)</option>' +
                '<option value="gi"' + (rule.flags === 'gi' ? ' selected' : '') + '>gi (全局+忽略大小写)</option>' +
                '<option value="gm"' + (rule.flags === 'gm' ? ' selected' : '') + '>gm (全局+多行)</option>' +
                '<option value="gim"' + (rule.flags === 'gim' ? ' selected' : '') + '>gim (全局+忽略大小写+多行)</option>' +
                '<option value="i"' + (rule.flags === 'i' ? ' selected' : '') + '>i (仅忽略大小写)</option>' +
                '<option value="m"' + (rule.flags === 'm' ? ' selected' : '') + '>m (仅多行)</option>' +
              '</select>' +
            '</div>' +
            '<div class="regex-field">' +
              '<label>作用域</label>' +
              '<select class="regex-select-scope" data-id="' + rule.id + '">' +
                '<option value="input"' + (rule.scope === 'input' ? ' selected' : '') + '>输入</option>' +
                '<option value="output"' + (rule.scope === 'output' ? ' selected' : '') + '>输出</option>' +
                '<option value="both"' + (rule.scope === 'both' ? ' selected' : '') + '>双向</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div class="regex-rule-actions">' +
            '<button class="regex-btn-move" data-id="' + rule.id + '" data-action="up" title="上移" ' + (i === 0 ? 'disabled' : '') + '>' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>' +
            '</button>' +
            '<button class="regex-btn-move" data-id="' + rule.id + '" data-action="down" title="下移" ' + (i === sorted.length - 1 ? 'disabled' : '') + '>' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
            '</button>' +
            '<div class="regex-actions-spacer"></div>' +
            '<button class="regex-btn-delete" data-id="' + rule.id + '" data-action="delete" title="删除">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +
              ' 删除' +
            '</button>' +
          '</div>' +
        '</div>';

      list.appendChild(card);
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * 查找规则索引
   * @param {string} id
   * @returns {number}
   * @private
   */
  function _findIndex(id) {
    for (var i = 0; i < _rules.length; i++) {
      if (_rules[i].id === id) return i;
    }
    return -1;
  }

  /**
   * 查找规则
   * @param {string} id
   * @returns {Object|null}
   * @private
   */
  function _findRule(id) {
    var idx = _findIndex(id);
    return idx !== -1 ? _rules[idx] : null;
  }

  /**
   * 按作用域应用规则
   * @param {string} text
   * @param {string} scopeFilter — 'input' | 'output'
   * @returns {string}
   * @private
   */
  function _applyRules(text, scopeFilter) {
    var sorted = getRules();
    var result = text;

    for (var i = 0; i < sorted.length; i++) {
      var rule = sorted[i];
      if (!rule.enabled) continue;
      if (rule.scope !== scopeFilter && rule.scope !== 'both') continue;
      if (!rule.regex) continue;

      try {
        var re = new RegExp(rule.regex, rule.flags || 'gi');
        result = result.replace(re, rule.replacement || '');
      } catch (e) {
        console.warn('[ST.RegexEngine] 规则 "' + rule.name + '" 正则错误:', e.message);
      }
    }

    return result;
  }

  /**
   * HTML 转义
   * @param {string} str
   * @returns {string}
   * @private
   */
  function _escapeHTML(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /**
   * 构建 UI HTML
   * @returns {string}
   * @private
   */
  function _buildUI() {
    return '' +
      '<div class="wb-toolbar">' +
        '<span class="wb-count" id="regex-count">0 条规则</span>' +
        '<div class="wb-actions">' +
          '<button class="btn-add" id="regex-add">+ 新建</button>' +
          '<button id="regex-import">导入</button>' +
          '<button id="regex-export">导出</button>' +
        '</div>' +
      '</div>' +
      '<div id="regex-rule-list"></div>';
  }

  /**
   * 绑定 UI 事件
   * @private
   */
  function _bindUIEvents() {
    // 新建规则
    var addBtn = document.getElementById('regex-add');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        addRule();
        renderList();
      });
    }

    // 导入
    var importBtn = document.getElementById('regex-import');
    if (importBtn) {
      importBtn.addEventListener('click', function () {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', function () {
          var file = input.files[0];
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function (e) {
            var result = importRules(e.target.result);
            if (result.success) {
              if (typeof notifications !== 'undefined') {
                notifications.show('success', '导入成功', '导入了 ' + result.count + ' 条规则');
              }
            } else {
              if (typeof notifications !== 'undefined') {
                notifications.show('error', '导入失败', result.error || '未知错误');
              }
            }
            renderList();
          };
          reader.readAsText(file);
        });
        input.click();
      });
    }

    // 导出
    var exportBtn = document.getElementById('regex-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var json = exportRules();
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'regex_rules_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        if (typeof notifications !== 'undefined') {
          notifications.show('success', '导出成功', '规则已导出为 JSON 文件');
        }
      });
    }

    // 规则列表事件委托
    var list = document.getElementById('regex-rule-list');
    if (list) {
      list.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-action]');
        if (!btn) return;
        var id = btn.getAttribute('data-id');
        var action = btn.getAttribute('data-action');

        switch (action) {
          case 'toggle':
            var rule = _findRule(id);
            if (rule) {
              rule.enabled = !rule.enabled;
              save();
              renderList();
            }
            break;
          case 'up':
            moveUp(id);
            renderList();
            break;
          case 'down':
            moveDown(id);
            renderList();
            break;
          case 'delete':
            if (confirm('确定删除此规则？')) {
              deleteRule(id);
              renderList();
            }
            break;
        }
      });

      // 字段变更事件
      list.addEventListener('input', function (e) {
        var id = e.target.getAttribute('data-id');
        if (!id) return;
        var rule = _findRule(id);
        if (!rule) return;

        if (e.target.classList.contains('regex-input-name')) {
          rule.name = e.target.value;
        } else if (e.target.classList.contains('regex-input-pattern')) {
          rule.regex = e.target.value;
        } else if (e.target.classList.contains('regex-input-replacement')) {
          rule.replacement = e.target.value;
        }
        save();
      });

      list.addEventListener('change', function (e) {
        var id = e.target.getAttribute('data-id');
        if (!id) return;
        var rule = _findRule(id);
        if (!rule) return;

        if (e.target.classList.contains('regex-select-flags')) {
          rule.flags = e.target.value;
        } else if (e.target.classList.contains('regex-select-scope')) {
          rule.scope = e.target.value;
        }
        save();
      });
    }
  }

  // ===========================================================================
  // 初始化
  // ===========================================================================

  load();

  // 导出命名空间
  if (!window.ST) window.ST = {};
  window.ST.RegexEngine = {
    applyInput: applyInput,
    applyOutput: applyOutput,
    getRules: getRules,
    addRule: addRule,
    updateRule: updateRule,
    deleteRule: deleteRule,
    moveUp: moveUp,
    moveDown: moveDown,
    load: load,
    save: save,
    exportRules: exportRules,
    importRules: importRules,
    initUI: initUI,
    renderList: renderList,
  };

  console.log('[ST.RegexEngine] 正则引擎已初始化');
})();
