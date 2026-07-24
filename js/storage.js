// js/storage.js — localStorage wrapper with 'st_' prefix
const storage = {
  PREFIX: 'st_',

  get(key) {
    try {
      return JSON.parse(localStorage.getItem(this.PREFIX + key));
    } catch { return null; }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch (e) {
      window.notifications?.show('error', '存储失败', 'localStorage 已满或不可用');
    }
  },

  remove(key) { localStorage.removeItem(this.PREFIX + key); },

  clearAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.PREFIX))
      .forEach(k => localStorage.removeItem(k));
    window.notifications?.show('success', '已清空', '所有数据已清除');
  },

  keys() {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(this.PREFIX))
      .map(k => k.slice(this.PREFIX.length));
  }
};
window.storage = storage;
