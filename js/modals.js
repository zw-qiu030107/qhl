/**
 * js/modals.js — 独立视图管理器
 *
 * 每个带 data-view 属性的按钮对应一个独立的"全屏覆盖层视图"，
 * 不是传统 Bootstrap 风格的共享弹窗。
 *
 * 功能：
 * - 所有带 data-view 属性的元素自动绑定打开对应视图
 * - ESC 键和关闭按钮均可关闭当前视图
 * - 高亮对应导航按钮
 * - 禁止/恢复背景滚动
 *
 * @namespace ViewManager
 * @namespace ModalManager   (兼容旧代码的别名)
 */

const ViewManager = (function () {
  'use strict';

  /** 遮罩层 DOM 引用 */
  var _overlay = null;

  /** 当前显示的视图 DOM 元素 */
  var _currentView = null;

  /** 视图 ID -> 导航按钮 ID 映射 */
  var NAV_MAP = {
    'modal-char-manager': 'btn-character-manager',
    'modal-char-editor': 'btn-character-manager',
    'modal-chat-history': 'btn-history',
    'modal-bookmarks': 'btn-bookmarks',
    'modal-settings': 'btn-settings',
  };

  /** 存储打开视图前的外部聚焦元素（用于恢复焦点） */
  var _previousFocus = null;

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * 初始化视图管理器
   *
   * - 查找遮罩层元素
   * - 绑定 ESC 键关闭
   * - 绑定所有 .view-close / .view-back 按钮
   */
  function init() {
    _overlay = document.getElementById('modal-overlay');
    if (!_overlay) {
      console.warn('[ViewManager] 找不到 #modal-overlay 元素');
      return;
    }

    // ESC 键关闭
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _currentView) {
        close();
      }
    });

    // 绑定所有子视图内的关闭按钮（覆盖层内带 .view-close 或 .view-back 的元素）
    _bindCloseButtons();
  }

  /**
   * 打开指定 ID 的视图
   *
   * @param {string} viewId — 视图 DOM 元素的 id（例如 'modal-settings'）
   *
   * @example
   * ViewManager.open('modal-chat-history');
   */
  function open(viewId) {
    if (!_overlay) {
      console.warn('[ViewManager] 遮罩层未初始化');
      return;
    }

    var target = document.getElementById(viewId);
    if (!target) {
      console.warn('[ViewManager] 找不到视图:', viewId);
      return;
    }

    // 在关闭当前视图前保存焦点
    _previousFocus = document.activeElement;

    // 关闭当前视图
    if (_currentView && _currentView !== target) {
      _currentView.classList.add('hidden');
    }

    // 显示目标视图和遮罩
    _currentView = target;
    _overlay.classList.remove('hidden');
    target.classList.remove('hidden');

    // 禁止背景滚动
    document.body.style.overflow = 'hidden';

    // 高亮对应的导航按钮
    _highlightNav(viewId);

    // 将焦点移入视图内的第一个可聚焦元素
    _focusFirstElement(target);
  }

  /**
   * 关闭当前视图
   */
  function close() {
    if (_currentView) {
      _currentView.classList.add('hidden');
    }
    if (_overlay) {
      _overlay.classList.add('hidden');
    }
    _currentView = null;

    // 恢复背景滚动
    document.body.style.overflow = '';

    // 清除导航高亮
    _clearNavHighlight();

    // 恢复之前的焦点
    if (_previousFocus && typeof _previousFocus.focus === 'function') {
      try { _previousFocus.focus(); } catch (e) { /* ignore */ }
    }
    _previousFocus = null;
  }

  /**
   * 高亮对应视图的导航按钮
   * @param {string} viewId — 视图 DOM id
   */
  function highlightNav(viewId) {
    _highlightNav(viewId);
  }

  /**
   * 清除所有导航按钮的高亮状态
   */
  function clearNavHighlight() {
    _clearNavHighlight();
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * 绑定覆盖层内所有关闭按钮
   * @private
   */
  function _bindCloseButtons() {
    if (!_overlay) return;
    var closeButtons = _overlay.querySelectorAll('.view-close, .view-back');
    closeButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        close();
      });
    });
  }

  /**
   * 根据视图 ID 高亮导航按钮
   * @param {string} viewId
   * @private
   */
  function _highlightNav(viewId) {
    var btnId = NAV_MAP[viewId];
    if (btnId) {
      var btn = document.getElementById(btnId);
      if (btn) btn.classList.add('active');
    }
  }

  /**
   * 清除所有 .nav-pill.active 高亮
   * @private
   */
  function _clearNavHighlight() {
    var pills = document.querySelectorAll('.nav-pill.active');
    pills.forEach(function (b) { b.classList.remove('active'); });
  }

  /**
   * 将焦点移到视图内的第一个可聚焦元素
   * @param {HTMLElement} view
   * @private
   */
  function _focusFirstElement(view) {
    var focusable = view.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) {
      try { focusable.focus(); } catch (e) { /* ignore */ }
    }
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  return {
    init: init,
    open: open,
    close: close,
    highlightNav: highlightNav,
    clearNavHighlight: clearNavHighlight,
  };
})();

// =============================================================================
// 兼容旧代码的别名
// =============================================================================

/**
 * ModalManager — ViewManager 的别名，兼容旧调用方式
 * @namespace ModalManager
 */
const ModalManager = {
  /** @see ViewManager.init */
  init: function () { ViewManager.init(); },

  /** @see ViewManager.open */
  open: function (id) { ViewManager.open(id); },

  /** @see ViewManager.close */
  close: function () { ViewManager.close(); },
};

// =============================================================================
// 自动绑定 data-view 属性
// =============================================================================

/**
 * DOMContentLoaded 时：
 * 1. 初始化 ViewManager
 * 2. 给所有带 data-view 属性的元素自动绑定 click → open
 */
document.addEventListener('DOMContentLoaded', function () {
  ViewManager.init();

  // 委托模式：捕获阶段的 data-view 点击
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-view]');
    if (!trigger) return;
    var viewId = trigger.getAttribute('data-view');
    if (viewId) {
      e.preventDefault();
      e.stopPropagation();
      ViewManager.open(viewId);
    }
  });
});
