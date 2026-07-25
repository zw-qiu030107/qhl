/**
 * js/utils.js — 通用工具函数
 *
 * 提供 HTML 转义、消息解析、唯一 ID 生成、token 估算、
 * 防抖等通用功能，供所有模块使用。
 *
 * @namespace utils
 */

const utils = (function () {
  'use strict';

  /** 用于 HTML 转义的临时 DOM 元素（复用） */
  var _escapeEl = null;

  /**
   * 获取或创建用于 HTML 转义的 DOM 元素
   * @returns {HTMLDivElement}
   * @private
   */
  function _getEscapeElement() {
    if (!_escapeEl) {
      _escapeEl = document.createElement('div');
    }
    return _escapeEl;
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * HTML 实体转义 — 使用浏览器 DOM 安全转义
   * @param {string} str — 原始字符串
   * @returns {string} 转义后的 HTML 安全字符串
   */
  function escapeHTML(str) {
    if (!str && str !== 0) return '';
    var el = _getEscapeElement();
    el.textContent = String(str);
    return el.innerHTML;
  }

  /**
   * 解析消息中的 *动作* 和 "对话" 标记为 HTML span
   *
   * 规则：
   * - *文本* → <span class="action-text">*文本*</span>
   * - "文本" → <span class="speech-text">"文本"</span>
   *
   * @param {string} text — 原始消息文本
   * @returns {string} 带 HTML 标记的消息
   */
  function parseMessage(text) {
    if (!text) return '';
    // 先转义 HTML，避免 XSS
    var html = escapeHTML(text);
    // "对话" → speech（双引号在 HTML 转义后变成 &quot;）
    html = html.replace(/&quot;([^&]+)&quot;/g,
      '<span class="speech-text">&quot;$1&quot;</span>');
    // *动作* → action
    html = html.replace(/\*([^*]+)\*/g,
      '<span class="action-text">*$1*</span>');
    return html;
  }

  /**
   * 生成唯一 ID — 基于时间戳 + 随机数
   * @returns {string} 唯一标识符
   */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  /**
   * 估算文本的 token 数量
   *
   * 粗略算法：
   * - 中文字符 × 2
   * - 英文字母长度 × 0.3
   *
   * @param {string} text — 输入文本
   * @returns {number} 估算的 token 数
   */
  function estimateTokens(text) {
    if (!text) return 0;
    // 中文字符（CJK 统一表意文字）
    var cnCount = (text.match(/[一-鿿㐀-䶿]/g) || []).length;
    // 英文单词字符
    var enCount = (text.match(/[a-zA-Z]+/g) || [])
      .reduce(function (sum, w) { return sum + w.length; }, 0);
    return Math.ceil(cnCount * 2 + enCount * 0.3);
  }

  /**
   * 防抖函数 — 在连续调用时只执行最后一次
   *
   * @param {Function} fn — 需要防抖的函数
   * @param {number} delay — 延迟时间（毫秒）
   * @returns {Function} 防抖后的函数
   *
   * @example
   * var debouncedSave = utils.debounce(function () { save(); }, 300);
   * input.addEventListener('input', debouncedSave);
   */
  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var context = this;
      var args = arguments;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        fn.apply(context, args);
      }, delay);
    };
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  return {
    escapeHTML: escapeHTML,
    parseMessage: parseMessage,
    uid: uid,
    estimateTokens: estimateTokens,
    debounce: debounce,
  };
})();
