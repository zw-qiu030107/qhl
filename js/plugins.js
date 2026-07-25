/**
 * js/plugins.js — 插件系统
 *
 * 轻量级插件注册与生命周期管理。
 * 插件可注册钩子在消息发送、回复、渲染等阶段被调用。
 * 插件列表持久化到 localStorage。
 *
 * @namespace ST.Plugins
 */

(function () {
  'use strict';

  // ===========================================================================
  // 存储键
  // ===========================================================================

  var STORAGE_KEY = 'st_plugins';

  // ===========================================================================
  // 内置插件
  // ===========================================================================

  /**
   * 内置插件: Markdown 渲染
   */
  var _builtinMarkdown = {
    id: 'builtin_markdown',
    name: 'Markdown 渲染',
    description: '将 **粗体** 和 *斜体* 转换为 HTML 标签',
    builtin: true,
    enabled: true,
    hooks: {
      onReply: function (ctx) {
        if (!ctx || !ctx.text) return ctx;
        var text = ctx.text;
        // **粗体**
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // *斜体* (避免匹配 **)
        text = text.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');
        ctx.text = text;
        return ctx;
      },
    },
  };

  /**
   * 内置插件: 字数统计
   */
  var _builtinWordCount = {
    id: 'builtin_wordcount',
    name: '字数统计',
    description: '在消息气泡下方显示字数统计',
    builtin: true,
    enabled: false,
    hooks: {
      onRender: function (ctx) {
        if (!ctx || !ctx.element || !ctx.msg || !ctx.msg.text) return ctx;

        var text = ctx.msg.text;
        // 统计中文字符 + 英文单词
        var chineseChars = (text.match(/[一-鿿]/g) || []).length;
        var englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
        var total = chineseChars + englishWords;

        var countEl = ctx.element.querySelector('.word-count-badge');
        if (!countEl) {
          countEl = document.createElement('span');
          countEl.className = 'word-count-badge';
          var bubble = ctx.element.querySelector('.msg-bubble');
          if (bubble) {
            bubble.appendChild(countEl);
          }
        }
        countEl.textContent = total + ' 字';
        return ctx;
      },
    },
  };

  // ===========================================================================
  // 状态
  // ===========================================================================

  /** @type {Object[]} 已注册插件列表 */
  var _plugins = [];

  // ===========================================================================
  // 公共 API — 插件管理
  // ===========================================================================

  /**
   * 注册一个插件
   *
   * @param {Object} plugin — 插件定义
   * @param {string} plugin.id — 唯一标识符
   * @param {string} plugin.name — 显示名称
   * @param {string} [plugin.description] — 描述
   * @param {Object} [plugin.hooks] — 钩子函数映射
   * @param {Function} [plugin.hooks.onInit] — 初始化回调
   * @param {Function} [plugin.hooks.onSend] — 发送前回调 (ctx: {text})
   * @param {Function} [plugin.hooks.onReply] — 收到回复后回调 (ctx: {text, parsed})
   * @param {Function} [plugin.hooks.onRender] — 渲染消息后回调 (ctx: {msg, element})
   * @param {Function} [plugin.hooks.onWorldBookMatch] — 世界书匹配后回调 (ctx: {entries, input})
   * @returns {boolean} 是否成功注册
   */
  function register(plugin) {
    if (!plugin || !plugin.id) {
      console.warn('[ST.Plugins] 注册失败: 缺少 id');
      return false;
    }

    // 检查重复
    var existing = _findPlugin(plugin.id);
    if (existing) {
      console.warn('[ST.Plugins] 插件 "' + plugin.id + '" 已存在，跳过注册');
      return false;
    }

    var entry = {
      id: plugin.id,
      name: plugin.name || plugin.id,
      description: plugin.description || '',
      hooks: plugin.hooks || {},
      builtin: plugin.builtin || false,
      enabled: plugin.enabled !== undefined ? plugin.enabled : true,
    };

    _plugins.push(entry);
    save();

    console.log('[ST.Plugins] 已注册插件:', entry.name);
    return true;
  }

  /**
   * 注销插件
   *
   * @param {string} id — 插件 ID
   * @returns {boolean} 是否成功
   */
  function unregister(id) {
    var idx = _findIndex(id);
    if (idx === -1) return false;

    var name = _plugins[idx].name;
    _plugins.splice(idx, 1);
    save();

    console.log('[ST.Plugins] 已注销插件:', name);
    return true;
  }

  /**
   * 获取所有已注册插件
   *
   * @returns {Object[]}
   */
  function list() {
    return _plugins.slice();
  }

  /**
   * 启用插件
   *
   * @param {string} id — 插件 ID
   * @returns {boolean}
   */
  function enable(id) {
    var plugin = _findPlugin(id);
    if (!plugin) return false;
    plugin.enabled = true;
    save();
    return true;
  }

  /**
   * 禁用插件
   *
   * @param {string} id — 插件 ID
   * @returns {boolean}
   */
  function disable(id) {
    var plugin = _findPlugin(id);
    if (!plugin) return false;
    plugin.enabled = false;
    save();
    return true;
  }

  // ===========================================================================
  // 公共 API — 生命周期
  // ===========================================================================

  /**
   * 调用所有已启用插件的指定钩子
   *
   * @param {string} hookName — 钩子名称 (onInit|onSend|onReply|onRender|onWorldBookMatch)
   * @param {Object} [context] — 上下文对象，插件可读取/修改
   * @returns {Object} 处理后的上下文
   */
  function call(hookName, context) {
    if (!hookName) return context;

    var ctx = context || {};

    for (var i = 0; i < _plugins.length; i++) {
      var plugin = _plugins[i];
      if (!plugin.enabled) continue;
      if (!plugin.hooks || typeof plugin.hooks[hookName] !== 'function') continue;

      try {
        var result = plugin.hooks[hookName](ctx);
        if (result !== undefined && result !== null) {
          ctx = result;
        }
      } catch (e) {
        console.warn('[ST.Plugins] 插件 "' + plugin.name + '" 钩子 ' + hookName + ' 错误:', e.message);
      }
    }

    return ctx;
  }

  // ===========================================================================
  // 持久化
  // ===========================================================================

  /**
   * 从 localStorage 加载插件设置
   */
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var saved;
      if (raw) {
        saved = JSON.parse(raw);
      } else {
        saved = {};
      }

      // 恢复内置插件的启用状态
      _restoreEnabled('builtin_markdown', saved, true);
      _restoreEnabled('builtin_wordcount', saved, false);

    } catch (e) {
      console.warn('[ST.Plugins] 加载失败:', e.message);
    }

    // 注册所有内置插件
    _registerBuiltins();
  }

  /**
   * 保存插件设置到 localStorage
   */
  function save() {
    try {
      var data = {};
      for (var i = 0; i < _plugins.length; i++) {
        var p = _plugins[i];
        if (p.builtin) {
          data[p.id] = p.enabled;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[ST.Plugins] 保存失败:', e.message);
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * 查找插件索引
   * @param {string} id
   * @returns {number}
   * @private
   */
  function _findIndex(id) {
    for (var i = 0; i < _plugins.length; i++) {
      if (_plugins[i].id === id) return i;
    }
    return -1;
  }

  /**
   * 查找插件
   * @param {string} id
   * @returns {Object|null}
   * @private
   */
  function _findPlugin(id) {
    var idx = _findIndex(id);
    return idx !== -1 ? _plugins[idx] : null;
  }

  /**
   * 从保存数据恢复启用状态
   * @param {string} id
   * @param {Object} saved
   * @param {boolean} defaultVal
   * @private
   */
  function _restoreEnabled(id, saved, defaultVal) {
    if (saved.hasOwnProperty(id)) {
      var plugin = _findPlugin(id);
      if (plugin) {
        plugin.enabled = !!saved[id];
      } else {
        // 暂存以便注册时使用
        if (!_restoreEnabled._cache) _restoreEnabled._cache = {};
        _restoreEnabled._cache[id] = !!saved[id];
      }
    }
  }

  /**
   * 注册所有内置插件
   * @private
   */
  function _registerBuiltins() {
    var cache = _restoreEnabled._cache || {};

    var md = Object.assign({}, _builtinMarkdown, { hooks: Object.assign({}, _builtinMarkdown.hooks) });
    if (cache.hasOwnProperty('builtin_markdown')) {
      md.enabled = cache['builtin_markdown'];
    }
    register(md);

    var wc = Object.assign({}, _builtinWordCount, { hooks: Object.assign({}, _builtinWordCount.hooks) });
    if (cache.hasOwnProperty('builtin_wordcount')) {
      wc.enabled = cache['builtin_wordcount'];
    }
    register(wc);
  }

  // ===========================================================================
  // 初始化
  // ===========================================================================

  load();

  // 导出命名空间
  if (!window.ST) window.ST = {};
  window.ST.Plugins = {
    register: register,
    unregister: unregister,
    list: list,
    enable: enable,
    disable: disable,
    call: call,
    load: load,
    save: save,
  };

  console.log('[ST.Plugins] 插件系统已初始化 (' + _plugins.length + ' 个插件)');
})();
