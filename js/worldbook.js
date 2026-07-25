/**
 * js/worldbook.js — 世界书 (World Book / Lorebook) 管理
 *
 * 管理世界书条目（lorebook entries）的 CRUD，
 * 支持关键词触发、条件触发、概率触发，
 * 多种插入位置，以及导入/导出 JSON。
 *
 * 数据持久化：优先保存到 ST IndexedDB（ST.saveLorebook），
 * 同时回退到 localStorage 以确保调试/离线可用。
 *
 * @namespace WorldBook
 */

const WorldBook = (function () {
  'use strict';

  /** @type {Object[]} 世界书条目列表 */
  var _entries = [];

  /** @type {HTMLElement|null} 条目列表容器 */
  var _container = null;

  // ===========================================================================
  // 常量
  // ===========================================================================

  /**
   * 插入位置选项
   * @type {Array<{value:string, label:string, group:string}>}
   */
  var INSERT_POSITIONS = [
    { value: 'before_char', label: '角色定义之前', group: '提示词' },
    { value: 'after_char', label: '角色定义之后', group: '提示词' },
    { value: 'before_example', label: '示例消息之前', group: '提示词' },
    { value: 'after_example', label: '示例消息之后', group: '提示词' },
    { value: 'top_an', label: '作者注记顶部', group: '注记' },
    { value: 'bottom_an', label: '作者注记底部', group: '注记' },
    { value: 'at_depth', label: '@ 深度 D', group: '深度' },
    { value: 'as_system', label: '系统角色消息', group: '角色' },
    { value: 'as_user', label: '用户角色消息', group: '角色' },
    { value: 'as_assistant', label: '助手角色消息', group: '角色' },
    { value: 'outlet', label: '输出口', group: '宏' },
  ];

  /**
   * 触发条件选项
   * @type {Array<{value:string, label:string}>}
   */
  var TRIGGER_CONDITIONS = [
    { value: 'keyword', label: '关键词匹配' },
    { value: 'always', label: '始终触发' },
    { value: 'probability', label: '概率触发' },
  ];

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * 初始化世界书 — 加载数据并渲染
   */
  function init() {
    _container = document.getElementById('wb-list');
    // 优先从 localStorage 加载（向后兼容及快速启动）
    var stored = (window.storage && window.storage.get('worldbook_entries')) || [];
    _entries = stored;
    render();
    bindToolbar();
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  /**
   * 获取所有条目
   * @returns {Object[]}
   */
  function getAll() {
    return _entries.slice();
  }

  /**
   * 创建新条目
   *
   * @param {Object} [data={}] — 条目初始数据
   * @param {string} [data.name] — 条目名称
   * @param {string[]} [data.keywords] — 关键词列表
   * @param {string} [data.content] — 条目内容
   * @returns {Object} 创建的条目
   */
  function create(data) {
    var uidFn = (window.utils && window.utils.uid)
      ? window.utils.uid
      : function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };

    var entry = {
      id: uidFn(),
      name: '',
      keywords: [],
      content: '',
      weight: 50,
      insertPosition: 'before_char',
      depth: 0,
      outletName: '',
      triggerCondition: 'keyword',
      enabled: true,
      order: _entries.length,
    };
    if (data) {
      Object.keys(data).forEach(function (k) {
        entry[k] = data[k];
      });
    }

    _entries.push(entry);
    save();
    render();

    if (window.notifications) {
      window.notifications.show('success', '已新建', '条目「' + (entry.name || '(未命名)') + '」已创建');
    }

    return entry;
  }

  /**
   * 更新指定条目
   *
   * @param {string} id — 条目 ID
   * @param {Object} data — 更新的数据
   */
  function update(id, data) {
    var idx = -1;
    for (var i = 0; i < _entries.length; i++) {
      if (_entries[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;

    Object.keys(data).forEach(function (k) {
      _entries[idx][k] = data[k];
    });
    save();
    render();

    if (window.notifications) {
      window.notifications.show('success', '已保存', '条目「' + (_entries[idx].name || '(未命名)') + '」已更新');
    }
  }

  /**
   * 删除指定条目
   *
   * @param {string} id — 条目 ID
   */
  function remove(id) {
    var entry = null;
    for (var i = 0; i < _entries.length; i++) {
      if (_entries[i].id === id) { entry = _entries[i]; break; }
    }
    _entries = _entries.filter(function (e) { return e.id !== id; });
    save();
    render();

    if (window.notifications) {
      window.notifications.show('info', '已删除', '条目「' + (entry ? entry.name || '' : '') + '」已删除');
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  /**
   * 渲染所有条目
   */
  function render() {
    if (!_container) return;

    var countEl = document.getElementById('wb-count');
    if (countEl) countEl.textContent = _entries.length + ' 条条目';

    _container.innerHTML = '';
    if (_entries.length === 0) {
      _container.innerHTML =
        '<div style="text-align:center;padding:48px 16px;color:var(--text-muted);font-size:13px">' +
          '暂无世界书条目<br>' +
          '<span style="font-size:11px;color:var(--text-dim)">点击"+ 新建"或"导入"添加</span>' +
        '</div>';
      return;
    }

    for (var i = 0; i < _entries.length; i++) {
      _container.appendChild(renderEntry(_entries[i]));
    }
  }

  /**
   * 渲染单个条目卡片
   *
   * @param {Object} entry — 条目对象
   * @returns {HTMLElement}
   */
  function renderEntry(entry) {
    var esc = (window.utils && window.utils.escapeHTML)
      ? window.utils.escapeHTML
      : function (s) { var d = document.createElement('div'); d.textContent = String(s || ''); return d.innerHTML; };

    var card = document.createElement('div');
    card.className = 'wb-entry';
    card.setAttribute('data-id', entry.id);

    // --- Header ---
    var header = document.createElement('div');
    header.className = 'wb-entry-header';

    var statusDot = document.createElement('span');
    statusDot.className = 'entry-status ' + (entry.enabled ? 'enabled' : 'disabled');

    var nameSpan = document.createElement('span');
    nameSpan.className = 'entry-name';
    nameSpan.textContent = entry.name || '(未命名)';

    var nameWrap = document.createElement('div');
    nameWrap.className = 'entry-name-wrap';
    nameWrap.appendChild(statusDot);
    nameWrap.appendChild(nameSpan);

    var meta = document.createElement('div');
    meta.className = 'entry-meta';
    meta.textContent = '#' + (entry.keywords ? entry.keywords.length : 0) + ' 词 · ' + (entry.weight || 50);

    header.appendChild(nameWrap);
    header.appendChild(meta);

    // --- Body ---
    var body = document.createElement('div');
    body.className = 'wb-entry-body';

    // 字段：名称
    body.appendChild(_makeField('名称',
      '<input type="text" class="wb-f-name" value="' + esc(entry.name || '') + '" placeholder="条目名称">'));

    // 字段：内容
    body.appendChild(_makeField('内容',
      '<textarea class="wb-f-content" rows="2" placeholder="世界书内容">' + esc(entry.content || '') + '</textarea>'));

    // 字段：触发条件
    var condOpts = TRIGGER_CONDITIONS.map(function (c) {
      return '<option value="' + c.value + '"' + (entry.triggerCondition === c.value ? ' selected' : '') + '>' + c.label + '</option>';
    }).join('');
    body.appendChild(_makeField('触发条件', '<select class="wb-f-trigger">' + condOpts + '</select>'));

    // 字段：插入位置
    var posOpts = INSERT_POSITIONS.map(function (p) {
      return '<option value="' + p.value + '"' + (entry.insertPosition === p.value ? ' selected' : '') + '>' + p.label + '</option>';
    }).join('');
    body.appendChild(_makeField('插入位置', '<select class="wb-f-position">' + posOpts + '</select>'));

    // 条件字段：深度（仅 at_depth 时显示）
    var depthShowClass = entry.insertPosition === 'at_depth' ? ' show' : '';
    body.appendChild(_makeField('深度 D',
      '<input type="number" class="wb-f-depth wb-conditional' + depthShowClass + '" value="' + (entry.depth || 0) + '" min="0" max="100">'));

    // 条件字段：输出口（仅 outlet 时显示）
    var outletShowClass = entry.insertPosition === 'outlet' ? ' show' : '';
    body.appendChild(_makeField('输出口',
      '<input type="text" class="wb-f-outlet wb-conditional' + outletShowClass + '" value="' + esc(entry.outletName || '') + '" placeholder="输出口名称">'));

    // 字段：权重
    body.appendChild(_makeField('权重',
      '<input type="number" class="wb-f-weight" value="' + (entry.weight || 50) + '" min="0" max="999">'));

    // 字段：关键词
    var kwTagsHtml = (entry.keywords || []).map(function (k) {
      return '<span class="wb-keyword-tag">' + esc(k) + '<span class="kw-remove" data-kw="' + esc(k) + '">x</span></span>';
    }).join('');
    body.appendChild(_makeField('关键词',
      '<div class="wb-keywords">' + kwTagsHtml + '<input type="text" class="wb-keyword-input" placeholder="添加..."></div>'));

    // 字段：启用开关
    body.appendChild(_makeField('启用',
      '<label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-secondary);cursor:pointer">' +
        '<input type="checkbox" class="wb-f-enabled"' + (entry.enabled ? ' checked' : '') + '>' +
        (entry.enabled ? '已启用' : '已禁用') +
      '</label>'));

    // 操作按钮
    var actions = document.createElement('div');
    actions.className = 'wb-entry-actions';
    actions.innerHTML =
      '<button class="wb-btn-delete">删除</button>' +
      '<button class="wb-btn-cancel">取消</button>' +
      '<button class="wb-btn-save">保存</button>';
    body.appendChild(actions);

    card.appendChild(header);
    card.appendChild(body);

    // 绑定事件
    _bindCardEvents(card, entry);

    return card;
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  /**
   * 保存条目 — 优先级：ST IndexedDB > localStorage
   */
  function save() {
    // 保存到 localStorage（向后兼容）
    if (window.storage) {
      window.storage.set('worldbook_entries', _entries);
    }

    // 保存到 ST IndexedDB
    if (window.ST && typeof ST.saveLorebook === 'function') {
      try {
        // 作为一个世界书保存
        var lorebookName = document.getElementById('cs-name')
          ? document.getElementById('cs-name').value + '的世界书'
          : '默认世界书';

        var lorebook = {
          id: 'wb_default',
          name: lorebookName,
          description: '',
          entries: _entries,
          recursiveScanning: false,
          caseSensitive: false,
          matchWholeWords: false,
          updatedAt: Date.now(),
          createdAt: Date.now(),
        };
        ST.saveLorebook(lorebook).catch(function (err) {
          console.warn('[WorldBook] ST.saveLorebook 失败:', err.message);
        });
      } catch (e) {
        console.warn('[WorldBook] 保存到 ST 数据库失败:', e.message);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Toolbar
  // ---------------------------------------------------------------------------

  /**
   * 绑定工具栏按钮事件
   */
  function bindToolbar() {
    var addBtn = document.getElementById('wb-add');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        var name = prompt('条目名称：');
        if (!name || !name.trim()) return;
        create({ name: name.trim() });
      });
    }

    var importBtn = document.getElementById('wb-import');
    if (importBtn) {
      importBtn.addEventListener('click', function () {
        var jsonStr = prompt('粘贴 JSON 字符串：');
        if (!jsonStr || !jsonStr.trim()) return;
        importJson(jsonStr.trim());
      });
    }

    var exportBtn = document.getElementById('wb-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () { exportJson(); });
    }
  }

  /**
   * 从 JSON 字符串导入条目
   *
   * 支持两种格式：
   * 1. SillyTavern lorebook 格式（{name, entries: {...}, settings: {...}}）
   * 2. 简单数组格式（[{name, keywords, content, ...}, ...]）
   *
   * @param {string} jsonStr
   */
  function importJson(jsonStr) {
    try {
      var data = JSON.parse(jsonStr);

      // 检测 ST lorebook 格式（有 .entries 且是非数组对象）
      if (data && data.entries && typeof data.entries === 'object' && !Array.isArray(data.entries)) {
        _importStFormat(data);
        return;
      }

      if (!Array.isArray(data)) {
        throw new Error('需要 JSON 数组格式或 SillyTavern lorebook 格式');
      }

      _importSimpleArray(data);

    } catch (e) {
      if (window.notifications) {
        window.notifications.show('error', '导入失败', e.message);
      }
    }
  }

  /**
   * 导入 ST lorebook 格式（通过 ST.Importer.importLorebook 转换）
   * @param {Object} stData — ST lorebook JSON
   * @private
   */
  function _importStFormat(stData) {
    var imported;
    if (window.ST && ST.Importer && typeof ST.Importer.importLorebook === 'function') {
      imported = ST.Importer.importLorebook(stData);
    } else {
      // 回退: 手动提取 entries
      var rawEntries = Object.values(stData.entries || {});
      imported = {
        name: stData.name || '导入的世界书',
        description: stData.description || '',
        entries: rawEntries.map(function (e) {
          return {
            id: e.uid || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)),
            keys: e.key || [],
            secondaryKeys: e.keysecondary || [],
            content: e.content || '',
            comment: e.comment || '',
            position: (window.ST && ST.Importer && ST.Importer.POSITION_MAP && ST.Importer.POSITION_MAP[e.position]) || 'after_char',
            weight: e.weight || 100,
            constant: e.constant || false,
            selective: e.selective || false,
            selectiveLogic: (window.ST && ST.Importer && ST.Importer.LOGIC_MAP && ST.Importer.LOGIC_MAP[e.selectiveLogic]) || 'and_any',
            useProbability: e.useProbability || false,
            probability: e.probability || 100,
            depth: e.depth || 0,
            enabled: !(e.disable || e.excluded),
          };
        }),
        recursiveScanning: !!(stData.settings && stData.settings.recursive_scanning),
        caseSensitive: !!(stData.settings && stData.settings.case_sensitive),
        matchWholeWords: !!(stData.settings && stData.settings.match_whole_words),
      };
    }

    if (!imported || !imported.entries || imported.entries.length === 0) {
      if (window.notifications) {
        window.notifications.show('warning', '无条目', '世界书数据为空');
      }
      return;
    }

    var uidFn = (window.utils && window.utils.uid)
      ? window.utils.uid
      : function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };

    // 合并导入
    var existingNames = new Set();
    _entries.forEach(function (e) { existingNames.add(e.name); });

    var count = 0;
    imported.entries.forEach(function (stEntry) {
      var wbName = stEntry.comment || (stEntry.keys && stEntry.keys.length > 0 ? stEntry.keys.join(', ') : '');
      if (!wbName) wbName = '导入条目 ' + (_entries.length + 1);
      if (existingNames.has(wbName)) return;

      _entries.push({
        id: stEntry.id || uidFn(),
        name: wbName,
        keywords: stEntry.keys || [],
        content: stEntry.content || '',
        weight: stEntry.weight || 50,
        insertPosition: stEntry.position || 'before_char',
        depth: stEntry.depth || 0,
        outletName: stEntry.outletName || '',
        triggerCondition: stEntry.constant ? 'always' :
          (stEntry.useProbability ? 'probability' : 'keyword'),
        enabled: true,
        order: _entries.length,
        // 保留 ST 完整字段
        _stKeys: stEntry.keys || [],
        _stSecondaryKeys: stEntry.secondaryKeys || [],
        _stSelective: stEntry.selective || false,
        _stSelectiveLogic: stEntry.selectiveLogic || 'and_any',
        _stConstant: stEntry.constant || false,
        _stProbability: stEntry.probability || 100,
        _stUseProbability: stEntry.useProbability || false,
      });
      existingNames.add(wbName);
      count++;
    });

    save();
    render();

    if (window.notifications) {
      window.notifications.show('success', '导入完成', '导入了 ' + count + ' 条条目');
    }
  }

  /**
   * 导入简单数组格式
   * @param {Object[]} data
   * @private
   */
  function _importSimpleArray(data) {
    var uidFn = (window.utils && window.utils.uid)
      ? window.utils.uid
      : function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };

    var count = 0;
    data.forEach(function (item) {
      if (!item.name) return;
      _entries.push({
        id: uidFn(),
        name: item.name || '',
        keywords: item.keywords || [],
        content: item.content || '',
        weight: item.weight || 50,
        insertPosition: item.insertPosition || 'before_char',
        depth: item.depth || 0,
        outletName: item.outletName || '',
        triggerCondition: item.triggerCondition || 'keyword',
        enabled: item.enabled !== false,
        order: _entries.length,
      });
      count++;
    });

    save();
    render();

    if (window.notifications) {
      window.notifications.show('success', '导入完成', '导入了 ' + count + ' 条条目');
    }
  }

  /**
   * 导出条目为 JSON 文件下载
   */
  function exportJson() {
    var json = JSON.stringify(_entries, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'worldbook_' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);

    if (window.notifications) {
      window.notifications.show('success', '导出成功', '已下载 ' + _entries.length + ' 条条目');
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * 创建标签-字段的包装元素
   * @param {string} label — 标签文本
   * @param {string} innerHTML — 内部 HTML
   * @returns {HTMLElement}
   * @private
   */
  function _makeField(label, innerHTML) {
    var div = document.createElement('div');
    div.className = 'wb-field';
    div.innerHTML = '<label>' + label + '</label>' + innerHTML;
    return div;
  }

  /**
   * 绑定条目卡片的所有交互事件
   * @param {HTMLElement} card
   * @param {Object} entry
   * @private
   */
  function _bindCardEvents(card, entry) {
    var header = card.querySelector('.wb-entry-header');

    // 点击标题切换展开/折叠
    header.addEventListener('click', function (e) {
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
      card.classList.toggle('editing');
    });

    // 保存按钮
    var saveBtn = card.querySelector('.wb-btn-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var data = _gatherFormData(card);
        update(entry.id, data);
        card.classList.remove('editing');
      });
    }

    // 取消按钮
    var cancelBtn = card.querySelector('.wb-btn-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        card.classList.remove('editing');
        render(); // 重新渲染以恢复
      });
    }

    // 删除按钮
    var deleteBtn = card.querySelector('.wb-btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        _showDeleteConfirm(card, entry);
      });
    }

    // 插入位置变更 → 显示/隐藏条件字段
    var posSelect = card.querySelector('.wb-f-position');
    if (posSelect) {
      posSelect.addEventListener('change', function () {
        var val = posSelect.value;
        var depthField = card.querySelector('.wb-f-depth');
        var outletField = card.querySelector('.wb-f-outlet');
        if (depthField) {
          depthField.classList.toggle('show', val === 'at_depth');
        }
        if (outletField) {
          outletField.classList.toggle('show', val === 'outlet');
        }
      });
    }

    // 关键词：回车添加
    var kwInput = card.querySelector('.wb-keyword-input');
    if (kwInput) {
      kwInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var text = kwInput.value.trim();
          if (!text) return;
          var esc = (window.utils && window.utils.escapeHTML)
            ? window.utils.escapeHTML
            : function (s) { var d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; };
          var tag = document.createElement('span');
          tag.className = 'wb-keyword-tag';
          tag.innerHTML = esc(text) + '<span class="kw-remove" data-kw="' + esc(text) + '">x</span>';
          kwInput.parentNode.insertBefore(tag, kwInput);
          kwInput.value = '';
          var rm = tag.querySelector('.kw-remove');
          if (rm) rm.addEventListener('click', function () { tag.remove(); });
        }
      });
    }

    // 关键词：委托删除
    card.addEventListener('click', function (e) {
      var removeBtn = e.target.closest('.kw-remove');
      if (removeBtn) {
        removeBtn.parentElement.remove();
      }
    });

    // 启用开关切换标签文字
    var enabledCb = card.querySelector('.wb-f-enabled');
    if (enabledCb) {
      enabledCb.addEventListener('change', function () {
        var label = enabledCb.closest('label');
        if (label) {
          label.lastChild.textContent = enabledCb.checked ? '已启用' : '已禁用';
        }
      });
    }
  }

  /**
   * 从卡片表单中收集数据
   * @param {HTMLElement} card
   * @returns {Object}
   * @private
   */
  function _gatherFormData(card) {
    var name = (card.querySelector('.wb-f-name') && card.querySelector('.wb-f-name').value) || '';
    var content = (card.querySelector('.wb-f-content') && card.querySelector('.wb-f-content').value) || '';
    var trigger = (card.querySelector('.wb-f-trigger') && card.querySelector('.wb-f-trigger').value) || 'keyword';
    var position = (card.querySelector('.wb-f-position') && card.querySelector('.wb-f-position').value) || 'before_char';
    var depth = parseInt((card.querySelector('.wb-f-depth') && card.querySelector('.wb-f-depth').value) || '0', 10);
    var outlet = (card.querySelector('.wb-f-outlet') && card.querySelector('.wb-f-outlet').value) || '';
    var weight = parseInt((card.querySelector('.wb-f-weight') && card.querySelector('.wb-f-weight').value) || '50', 10);
    var enabled = card.querySelector('.wb-f-enabled') ? card.querySelector('.wb-f-enabled').checked : false;

    var keywords = [];
    card.querySelectorAll('.wb-keyword-tag').forEach(function (tag) {
      var text = tag.childNodes[0] ? tag.childNodes[0].textContent : '';
      if (text) keywords.push(text);
    });

    return {
      name: name,
      content: content,
      triggerCondition: trigger,
      insertPosition: position,
      depth: depth,
      outletName: outlet,
      weight: weight,
      enabled: enabled,
      keywords: keywords,
    };
  }

  /**
   * 显示删除确认提示
   * @param {HTMLElement} card
   * @param {Object} entry
   * @private
   */
  function _showDeleteConfirm(card, entry) {
    card.classList.remove('editing');

    var esc = (window.utils && window.utils.escapeHTML)
      ? window.utils.escapeHTML
      : function (s) { var d = document.createElement('div'); d.textContent = String(s || ''); return d.innerHTML; };

    var confirmEl = document.createElement('div');
    confirmEl.className = 'wb-delete-confirm';
    confirmEl.innerHTML =
      '<div style="margin-bottom:8px">确认删除条目「' + esc(entry.name || '') + '」？</div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
        '<button class="wb-btn-cancel" style="color:var(--text-muted)">取消</button>' +
        '<button class="wb-btn-save" style="background:var(--danger);color:white">确认删除</button>' +
      '</div>';

    card.parentNode.insertBefore(confirmEl, card);

    var cancelConfirmBtn = confirmEl.querySelector('.wb-btn-cancel');
    if (cancelConfirmBtn) {
      cancelConfirmBtn.addEventListener('click', function () { confirmEl.remove(); });
    }

    var confirmDeleteBtn = confirmEl.querySelector('.wb-btn-save');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', function () {
        confirmEl.remove();
        remove(entry.id);
      });
    }
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  return {
    INSERT_POSITIONS: INSERT_POSITIONS,
    TRIGGER_CONDITIONS: TRIGGER_CONDITIONS,
    entries: _entries, // 向后兼容
    init: init,
    getAll: getAll,
    create: create,
    update: update,
    remove: remove,
    delete: remove, // 别名
    render: render,
    renderEntry: renderEntry,
    save: save,
    bindToolbar: bindToolbar,
    import: importJson, // 别名
    importJson: importJson,
    export: exportJson, // 别名
    exportJson: exportJson,
  };
})();

// =============================================================================
// DOMContentLoaded 初始化
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {
  try { WorldBook.init(); } catch (e) {
    console.warn('[WorldBook] 初始化失败:', e.message);
  }
});
