/**
 * js/settings.js — 全局设置管理
 *
 * 管理应用全局设置：主题、字体大小、气泡样式、API 配置等。
 * 设置通过 storage 模块持久化到 localStorage。
 *
 * 额外功能：
 * - 滑块实时数值显示（temperature, top_p）
 * - API 连接测试
 * - Ctrl+H / Ctrl+B 快捷键
 * - 流式输出开关
 * - 作者注记频率警告
 *
 * @namespace Settings
 */

const Settings = (function () {
  'use strict';

  // ===========================================================================
  // 默认值
  // ===========================================================================

  /** @type {Object<string,string>} 默认设置 */
  var DEFAULTS = {
    theme: 'default',
    fontSize: 'medium',
    bubbleStyle: 'default',
    apiUrl: '',
    apiKey: '',
    apiModel: '',
  };

  /** 元素 ID 后缀到 setting key 的映射 */
  var DOM_ID_MAP = null;

  /**
   * 懒初始化 ID 映射表
   * @returns {Object<string,string>}
   * @private
   */
  function _getIdMap() {
    if (!DOM_ID_MAP) {
      DOM_ID_MAP = {
        'setting-theme': 'theme',
        'setting-font-size': 'fontSize',
        'setting-bubble-style': 'bubbleStyle',
        'setting-api-url': 'apiUrl',
        'setting-api-key': 'apiKey',
        'setting-api-model': 'apiModel',
      };
    }
    return DOM_ID_MAP;
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * 初始化设置模块
   *
   * - 加载已保存的设置到 UI
   * - 绑定所有设置相关的 change 事件
   * - 绑定清空按钮、API 测试按钮
   */
  function init() {
    try {
      load();
    } catch (e) {
      console.warn('[Settings] 加载设置失败:', e.message);
    }

    // 绑定主题/字体/气泡样式
    _bindSelect('setting-theme', 'theme');
    _bindSelect('setting-font-size', 'fontSize');
    _bindSelect('setting-bubble-style', 'bubbleStyle');

    // 绑定 API 配置
    _bindInput('setting-api-url', 'apiUrl');
    _bindInput('setting-api-key', 'apiKey');
    _bindInput('setting-api-model', 'apiModel');

    // 清空按钮
    var clearBtn = document.getElementById('btn-clear-all');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () { clearAll(); });
    }

    // API 测试按钮
    var testBtn = document.getElementById('btn-test-api');
    if (testBtn) {
      testBtn.addEventListener('click', function () { testApiConnection(); });
    }
  }

  /**
   * 从 storage 加载设置并应用到 UI
   */
  function load() {
    var saved = (window.storage && window.storage.get('settings')) || {};
    var merged = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      merged[k] = (saved[k] !== undefined) ? saved[k] : DEFAULTS[k];
    });

    // 回填 DOM
    var idMap = _getIdMap();
    Object.keys(idMap).forEach(function (domId) {
      var settingKey = idMap[domId];
      var el = document.getElementById(domId);
      if (el && merged[settingKey] !== undefined) {
        el.value = merged[settingKey];
      }
    });

    // 应用主题/字体
    apply(merged);
  }

  /**
   * 设置单个配置项并持久化
   *
   * @param {string} key — 配置键名
   * @param {string} val — 配置值
   *
   * @example
   * Settings.set('theme', 'dark');
   */
  function set(key, val) {
    try {
      var s = getAll();
      s[key] = val;
      if (window.storage) {
        window.storage.set('settings', s);
      }
      apply(s);
    } catch (e) {
      console.warn('[Settings] 保存失败:', key, e.message);
    }
  }

  /**
   * 获取所有设置的当前值（含默认值）
   * @returns {Object}
   */
  function getAll() {
    var saved = (window.storage && window.storage.get('settings')) || {};
    var result = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      result[k] = (saved[k] !== undefined) ? saved[k] : DEFAULTS[k];
    });
    return result;
  }

  /**
   * 获取 API 配置信息
   * @returns {{url: string, key: string, model: string}}
   */
  function getApiConfig() {
    var s = getAll();
    return {
      url: s.apiUrl || '',
      key: s.apiKey || '',
      model: s.apiModel || '',
    };
  }

  /**
   * 将设置应用到文档外观
   *
   * - 主题：设置 data-theme 属性
   * - 字体大小：设置 CSS 变量
   * - 气泡样式：设置 data-bubble-style 属性
   *
   * @param {Object} s — 设置对象
   */
  function apply(s) {
    try {
      // 主题
      document.documentElement.setAttribute('data-theme', s.theme || DEFAULTS.theme);

      // 字体大小倍数
      var multiplier = '1';
      if (s.fontSize === 'small') multiplier = '0.9';
      else if (s.fontSize === 'large') multiplier = '1.15';
      document.documentElement.style.setProperty('--font-size-multiplier', multiplier);

      // 气泡样式
      document.body.setAttribute('data-bubble-style', s.bubbleStyle || DEFAULTS.bubbleStyle);
    } catch (e) {
      console.warn('[Settings] 应用样式失败:', e.message);
    }
  }

  /**
   * 测试 API 连接
   *
   * 发送一个最小的请求到配置的 API 端点，验证连通性。
   * 结果会显示在 #api-test-result 元素中。
   *
   * @returns {Promise<void>}
   */
  async function testApiConnection() {
    var cfg = getApiConfig();
    var resultEl = document.getElementById('api-test-result');

    // 验证输入
    if (!cfg.url || !cfg.key) {
      if (resultEl) {
        resultEl.textContent = '请先填写接口地址和 API Key';
        resultEl.style.color = 'var(--danger)';
      }
      return;
    }

    if (resultEl) {
      resultEl.textContent = '测试中...';
      resultEl.style.color = 'var(--text-muted)';
    }

    try {
      var resp = await fetch(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + cfg.key,
        },
        body: JSON.stringify({
          model: cfg.model || 'gpt-4o',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      });

      if (resp.ok) {
        if (resultEl) {
          resultEl.textContent = '连接成功';
          resultEl.style.color = 'var(--success)';
        }
        // 持久化当前 API 配置
        set('apiUrl', cfg.url);
        set('apiKey', cfg.key);
        set('apiModel', cfg.model);
      } else {
        var errText = '';
        try { errText = await resp.text(); } catch (e) { /* ignore */ }
        if (resultEl) {
          resultEl.textContent = '连接失败: ' + resp.status;
          resultEl.style.color = 'var(--danger)';
        }
        console.warn('[Settings] API 测试失败:', resp.status, errText.slice(0, 200));
      }
    } catch (e) {
      if (resultEl) {
        resultEl.textContent = '网络错误: ' + e.message;
        resultEl.style.color = 'var(--danger)';
      }
      console.warn('[Settings] API 测试网络错误:', e.message);
    }
  }

  /**
   * 清空所有本地数据
   *
   * 弹出确认对话框后执行 storage.clearAll()。
   */
  function clearAll() {
    if (!confirm('确定要清空所有本地数据吗？此操作不可撤销。')) return;
    try {
      if (window.storage) {
        window.storage.clearAll();
      }
      if (window.notifications && window.notifications.show) {
        window.notifications.show(
          'success',
          '已清空',
          '所有本地数据已清除，刷新页面生效'
        );
      }
    } catch (e) {
      console.warn('[Settings] 清空失败:', e.message);
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * 绑定 <select> 元素的 change 事件到设置
   * @param {string} domId — 元素 ID
   * @param {string} settingKey — 设置键名
   * @private
   */
  function _bindSelect(domId, settingKey) {
    var el = document.getElementById(domId);
    if (!el) return;
    el.addEventListener('change', function () {
      set(settingKey, el.value);
    });
  }

  /**
   * 绑定 <input> 元素的 change 事件到设置
   * @param {string} domId — 元素 ID
   * @param {string} settingKey — 设置键名
   * @private
   */
  function _bindInput(domId, settingKey) {
    var el = document.getElementById(domId);
    if (!el) return;
    el.addEventListener('change', function () {
      set(settingKey, el.value);
    });
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  return {
    init: init,
    load: load,
    set: set,
    getAll: getAll,
    getApiConfig: getApiConfig,
    apply: apply,
    testApiConnection: testApiConnection,
    clearAll: clearAll,
  };
})();

// =============================================================================
// 滑块实时数值同步
// =============================================================================

/**
 * 绑定 temperature 和 top_p 滑块的实时数值显示
 * 使用 DOMContentLoaded 确保 DOM 已就绪
 */
document.addEventListener('DOMContentLoaded', function () {
  // temperature 滑块
  var tempSlider = document.getElementById('cs-temperature');
  var tempDisplay = document.getElementById('temperature-val');
  if (tempSlider && tempDisplay) {
    tempSlider.addEventListener('input', function () {
      tempDisplay.textContent = parseFloat(tempSlider.value).toFixed(1);
    });
  }

  // top_p 滑块
  var toppSlider = document.getElementById('cs-topp');
  var toppDisplay = document.getElementById('topp-val');
  if (toppSlider && toppDisplay) {
    toppSlider.addEventListener('input', function () {
      toppDisplay.textContent = parseFloat(toppSlider.value).toFixed(2);
    });
  }
});

// =============================================================================
// 流式输出开关
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {
  var streamingBtn = document.getElementById('cs-streaming');
  if (!streamingBtn) return;

  // 从 storage 恢复状态
  var saved = (window.storage && window.storage.get('settings')) || {};
  if (saved.streaming) {
    streamingBtn.classList.add('active');
    streamingBtn.setAttribute('aria-checked', 'true');
  } else {
    streamingBtn.classList.remove('active');
    streamingBtn.setAttribute('aria-checked', 'false');
  }

  streamingBtn.addEventListener('click', function () {
    var isActive = streamingBtn.classList.toggle('active');
    streamingBtn.setAttribute('aria-checked', String(isActive));
    try {
      if (window.storage) {
        var s = window.storage.get('settings') || {};
        s.streaming = isActive;
        window.storage.set('settings', s);
      }
    } catch (e) {
      console.warn('[Settings] 保存 streaming 状态失败:', e.message);
    }
  });
});

// =============================================================================
// 作者注记频率警告
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {
  var anFreqInput = document.getElementById('cs-an-frequency');
  var anWarning = document.getElementById('an-warning');
  if (!anFreqInput || !anWarning) return;

  function toggleWarning() {
    var val = parseFloat(anFreqInput.value);
    anWarning.style.display = val === 0 ? '' : 'none';
  }

  anFreqInput.addEventListener('input', toggleWarning);
  anFreqInput.addEventListener('change', toggleWarning);
  // 初始状态
  toggleWarning();
});

// =============================================================================
// 键盘快捷键
// =============================================================================

/**
 * Ctrl+H — 打开对话历史
 * Ctrl+B — 打开书签
 */
document.addEventListener('keydown', function (e) {
  if (!e.ctrlKey) return;
  if (e.key === 'h' || e.key === 'H') {
    e.preventDefault();
    if (typeof ModalManager !== 'undefined') {
      ModalManager.open('modal-chat-history');
      // 触发 ChatHistory 渲染
      if (typeof ChatHistory !== 'undefined' && ChatHistory.renderList) {
        ChatHistory.renderList();
      }
    }
  }
  if (e.key === 'b' || e.key === 'B') {
    e.preventDefault();
    if (typeof ModalManager !== 'undefined') {
      ModalManager.open('modal-bookmarks');
      // 触发 Bookmarks 渲染
      if (typeof Bookmarks !== 'undefined' && Bookmarks.renderList) {
        Bookmarks.renderList();
      }
    }
  }
});
