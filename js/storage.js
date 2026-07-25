/**
 * js/storage.js — localStorage 封装
 *
 * 所有键自动添加 "st_" 前缀，避免与其它应用冲突。
 * 提供 get / set / remove / clearAll / keys 方法，
 * 所有操作包含 try/catch 错误处理。
 *
 * @namespace storage
 */

const storage = (function () {
  'use strict';

  /** localStorage 键前缀 */
  var PREFIX = 'st_';

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * 读取存储值（JSON 反序列化）
   * @param {string} key — 不带前缀的键名
   * @returns {*} 存储的值，不存在则返回 null
   */
  function get(key) {
    try {
      var raw = localStorage.getItem(PREFIX + key);
      return raw !== null ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[storage] 读取失败:', key, e.message);
      return null;
    }
  }

  /**
   * 写入存储值（JSON 序列化）
   *
   * 写入失败（如 quota 已满）时发送通知。
   *
   * @param {string} key — 不带前缀的键名
   * @param {*} value — 要存储的值（必须可 JSON 序列化）
   */
  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('[storage] 写入失败:', key, e.message);
      // 配额不足时通知用户
      if (window.notifications && window.notifications.show) {
        window.notifications.show(
          'error',
          '存储失败',
          'localStorage 已满或不可用，请清理旧数据'
        );
      }
    }
  }

  /**
   * 删除指定的存储键
   * @param {string} key — 不带前缀的键名
   */
  function remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch (e) {
      console.warn('[storage] 删除失败:', key, e.message);
    }
  }

  /**
   * 清空所有以 "st_" 开头的键
   */
  function clearAll() {
    try {
      var toRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.indexOf(PREFIX) === 0) {
          toRemove.push(k);
        }
      }
      toRemove.forEach(function (k) {
        localStorage.removeItem(k);
      });
      if (window.notifications && window.notifications.show) {
        window.notifications.show(
          'success',
          '已清空',
          '所有本地数据已清除'
        );
      }
    } catch (e) {
      console.warn('[storage] 清空失败:', e.message);
    }
  }

  /**
   * 获取所有以 "st_" 开头的键名列表（去掉前缀）
   * @returns {string[]} 键名列表
   */
  function keys() {
    try {
      var result = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.indexOf(PREFIX) === 0) {
          result.push(k.slice(PREFIX.length));
        }
      }
      return result;
    } catch (e) {
      console.warn('[storage] 获取键列表失败:', e.message);
      return [];
    }
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  return {
    PREFIX: PREFIX,
    get: get,
    set: set,
    remove: remove,
    clearAll: clearAll,
    keys: keys,
  };
})();

// 挂载到 window 以便 HTML onclick 等场景使用
window.storage = storage;
