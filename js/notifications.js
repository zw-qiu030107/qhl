// js/notifications.js -- Toast notification system

const notifications = {
  ICONS: {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6fc98f" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4a860" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c46b6b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7eb8da" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  },

  container: null,

  init() {
    this.container = document.getElementById('toast-container');
  },

  show(type, title, message) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${this.ICONS[type]}</div>
      <div class="toast-body">
        <div class="toast-title">${utils.escapeHTML(title)}</div>
        <div class="toast-msg">${utils.escapeHTML(message)}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    this.container.appendChild(toast);

    // 记录通知历史
    const history = window.storage?.get('notification_history') || [];
    history.push({ type, title, message, time: Date.now() });
    if (history.length > 50) history.shift();
    window.storage?.set('notification_history', history);

    // Limit to max 3 visible toasts -- remove oldest when exceeded
    const toasts = this.container.querySelectorAll('.toast');
    if (toasts.length > 3) toasts[0].remove();

    // Auto-remove after 3 seconds with slide-out animation
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};
window.notifications = notifications;
