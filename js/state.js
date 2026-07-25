/**
 * js/state.js — 简易发布/订阅状态管理
 *
 * 提供一个轻量级的状态管理器，支持：
 * - get / set 读写状态
 * - on / off 事件订阅与取消
 * - init 批量初始化默认值
 *
 * 状态变更时自动触发监听器，传递 (newValue, oldValue)。
 *
 * @namespace state
 */

const state = (function () {
  'use strict';

  /** @type {Object<string,*>} 内部状态存储 */
  var _data = {};

  /** @type {Object<string,Array<Function>>} 事件监听器 */
  var _listeners = {};

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * 读取状态值
   * @param {string} key — 状态键名
   * @returns {*} 当前值（不存在返回 undefined）
   */
  function get(key) {
    return _data[key];
  }

  /**
   * 写入状态值，触发对应的监听器
   *
   * @param {string} key — 状态键名
   * @param {*} value — 新值
   *
   * @example
   * state.set('messages', newMessages);
   */
  function set(key, value) {
    var prev = _data[key];
    // 避免无意义的事件触发（值相同时跳过）
    if (prev === value) return;
    _data[key] = value;
    var fns = _listeners[key];
    if (fns && fns.length) {
      // 复制一份再遍历，防止回调中修改数组
      fns.slice().forEach(function (fn) {
        try {
          fn(value, prev);
        } catch (e) {
          console.warn('[state] 监听器执行错误:', key, e.message);
        }
      });
    }
  }

  /**
   * 订阅状态变更事件
   *
   * @param {string} key — 状态键名
   * @param {Function} fn — 回调函数，参数 (newValue, oldValue)
   *
   * @example
   * state.on('messages', function (newVal, oldVal) {
   *   console.log('消息已更新');
   * });
   */
  function on(key, fn) {
    if (!_listeners[key]) {
      _listeners[key] = [];
    }
    _listeners[key].push(fn);
  }

  /**
   * 取消状态变更订阅
   *
   * @param {string} key — 状态键名
   * @param {Function} fn — 要移除的回调函数引用
   *
   * @example
   * state.off('messages', myHandler);
   */
  function off(key, fn) {
    var arr = _listeners[key];
    if (arr) {
      _listeners[key] = arr.filter(function (f) { return f !== fn; });
      if (_listeners[key].length === 0) {
        delete _listeners[key];
      }
    }
  }

  /**
   * 批量初始化状态 — 仅为尚不存在的键设置默认值
   *
   * @param {Object<string,*>} initialState — 默认键值对
   *
   * @example
   * state.init({
   *   messages: [],
   *   showLeftPanel: true,
   *   showRightPanel: true,
   * });
   */
  function init(initialState) {
    if (!initialState || typeof initialState !== 'object') return;
    Object.keys(initialState).forEach(function (k) {
      if (_data[k] === undefined) {
        _data[k] = initialState[k];
      }
    });
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  return {
    get: get,
    set: set,
    on: on,
    off: off,
    init: init,
  };
})();
