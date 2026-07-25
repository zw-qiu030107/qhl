/**
 * js/notifications.js — Toast 通知系统
 *
 * 在页面右下角显示弹出式通知，支持四种类型：
 * - success（成功 — 绿色）
 * - warning（警告 — 橙色）
 * - error（错误 — 红色）
 * - info（信息 — 蓝色）
 *
 * 特性：
 * - 最多同时显示 3 条通知，超出时移除最旧的
 * - 每条通知 3 秒后自动消失（带动画）
 * - 通知历史记录保存到 localStorage（最多 50 条）
 *
 * @namespace notifications
 */

const notifications = (function () {
  'use strict';

  /** 最大可见通知数 */
  var MAX_VISIBLE = 3;

  /** 通知显示时长（毫秒） */
  var DURATION = 3000;

  /** 动画移除延迟（毫秒，与 CSS transition 同步） */
  var REMOVE_DELAY = 300;

  /** 通知历史最大条数 */
  var MAX_HISTORY = 50;

  /** 通知容器 DOM 引用（缓存） */
  var _container = null;

  // ===========================================================================
  // SVG 图标
  // ===========================================================================

  /**
   * 各通知类型对应的 SVG 图标
   * @type {Object<string,string>}
   */
  var ICONS = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6fc98f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4a860" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c46b6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7eb8da" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * 查找或缓存通知容器
   * @returns {HTMLElement|null}
   * @private
   */
  function _getContainer() {
    if (!_container) {
      _container = document.getElementById('toast-container');
    }
    return _container;
  }

  /**
   * HTML 转义（不依赖 utils 模块，保证独立运行）
   * @param {string} str
   * @returns {string}
   * @private
   */
  function _escape(str) {
    if (!str && str !== 0) return '';
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  /**
   * 记录通知到 localStorage 历史
   * @param {string} type
   * @param {string} title
   * @param {string} message
   * @private
   */
  function _recordHistory(type, title, message) {
    try {
      if (!window.storage) return;
      var history = window.storage.get('notification_history') || [];
      history.push({
        type: type,
        title: title,
        message: message,
        time: Date.now(),
      });
      while (history.length > MAX_HISTORY) {
        history.shift();
      }
      window.storage.set('notification_history', history);
    } catch (e) {
      // 静默失败，不影响主流程
    }
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * 初始化通知系统 — 查找 DOM 容器
   *
   * 在应用启动时调用。如果容器尚不存在，后续 show() 调用会自动重试。
   */
  function init() {
    _container = document.getElementById('toast-container');
  }

  /**
   * 显示一条 toast 通知
   *
   * @param {string} type — 通知类型: 'success' | 'warning' | 'error' | 'info'
   * @param {string} title — 通知标题
   * @param {string} message — 通知正文
   *
   * @example
   * notifications.show('success', '保存成功', '角色卡已保存到本地');
   * notifications.show('error', '网络错误', '请求超时，请检查网络连接');
   */
  function show(type, title, message) {
    var container = _getContainer();

    // 容器不存在则创建并追加到 body
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
      _container = container;
    }

    // 验证类型：无效类型降级为 info
    var icon = ICONS[type];
    if (!icon) {
      console.warn('[notifications] 未知通知类型:', type);
      type = 'info';
      icon = ICONS.info;
    }

    // 创建 toast 元素
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;

    toast.innerHTML =
      '<div class="toast-icon">' + icon + '</div>' +
      '<div class="toast-body">' +
        '<div class="toast-title">' + _escape(title) + '</div>' +
        '<div class="toast-msg">' + _escape(message) + '</div>' +
      '</div>' +
      '<button class="toast-close" aria-label="关闭">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>';

    // 关闭按钮事件
    var closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        _removeToast(toast);
      });
    }

    container.appendChild(toast);

    // 限制最多可见通知数
    var allToasts = container.querySelectorAll('.toast');
    while (allToasts.length > MAX_VISIBLE) {
      _removeToast(allToasts[0]);
      allToasts = container.querySelectorAll('.toast');
    }

    // 记录历史
    _recordHistory(type, title, message);

    // 自动移除
    setTimeout(function () {
      _removeToast(toast);
    }, DURATION);
  }

  /**
   * 带动画移除 toast
   * @param {HTMLElement} toast
   * @private
   */
  function _removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    // 防止重复移除
    if (toast.dataset.removing === 'true') return;
    toast.dataset.removing = 'true';
    toast.classList.add('removing');
    setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, REMOVE_DELAY);
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  return {
    ICONS: ICONS,
    init: init,
    show: show,
  };
})();

// 挂载到 window
window.notifications = notifications;
