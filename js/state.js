// js/state.js — Simple Pub/Sub state management
const state = {
  _data: {},
  _listeners: {},

  get(key) { return this._data[key]; },
  set(key, value) {
    const prev = this._data[key];
    this._data[key] = value;
    (this._listeners[key] || []).forEach(fn => fn(value, prev));
  },

  on(key, fn) {
    (this._listeners[key] = this._listeners[key] || []).push(fn);
  },

  off(key, fn) {
    const arr = this._listeners[key];
    if (arr) this._listeners[key] = arr.filter(f => f !== fn);
  },

  // 批量初始化
  init(initialState) {
    Object.entries(initialState).forEach(([k, v]) => {
      if (this._data[k] === undefined) this._data[k] = v;
    });
  }
};
