// js/utils.js
const utils = {
  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // 解析消息中的 *动作* 和 "对话" 标记
  parseMessage(text) {
    let html = utils.escapeHTML(text);
    // "对话" → speech
    html = html.replace(/&quot;([^&]+)&quot;/g, '<span class="speech-text">"$1"</span>');
    // *动作* → action
    html = html.replace(/\*([^*]+)\*/g, '<span class="action-text">*$1*</span>');
    return html;
  },

  // 生成唯一 ID
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  // 估算 token 数（粗略：中文 1 字 ≈ 2 token，英文 1 词 ≈ 1.3 token）
  estimateTokens(text) {
    const cn = (text.match(/[一-鿿]/g) || []).length;
    const en = (text.match(/[a-zA-Z]+/g) || []).reduce((s, w) => s + w.length, 0);
    return Math.ceil(cn * 2 + en * 0.3);
  },

  debounce(fn, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
};
