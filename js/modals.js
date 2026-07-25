// js/modals.js — 独立视图管理器
// 每个按钮 = 一个独立全屏视图，不是共享弹窗

const ViewManager = {
  overlay: null,
  current: null,
  previousView: null,

  init() {
    this.overlay = document.getElementById('modal-overlay');
    if (!this.overlay) return;

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });

    // 给所有子视图添加关闭按钮监听
    this.overlay.querySelectorAll('.view-close, .view-back').forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });
  },

  open(viewId) {
    // 关闭当前视图
    if (this.current) {
      this.current.classList.add('hidden');
    }

    // 查找并打开新视图
    this.current = document.getElementById(viewId);
    if (!this.current) return;

    // 全屏遮罩
    this.overlay.classList.remove('hidden');
    this.current.classList.remove('hidden');

    // 禁止背景滚动
    document.body.style.overflow = 'hidden';

    // 高亮对应导航按钮
    this.highlightNav(viewId);
  },

  close() {
    if (this.current) {
      this.current.classList.add('hidden');
    }
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
    this.current = null;
    document.body.style.overflow = '';
    this.clearNavHighlight();
  },

  highlightNav(viewId) {
    // 根据视图ID找到对应的导航按钮并高亮
    const map = {
      'modal-char-manager': 'btn-character-manager',
      'modal-char-editor': 'btn-character-manager',
      'modal-chat-history': 'btn-history',
      'modal-bookmarks': 'btn-bookmarks',
      'modal-settings': 'btn-settings',
    };
    const btnId = map[viewId];
    if (btnId) {
      document.getElementById(btnId)?.classList.add('active');
    }
  },

  clearNavHighlight() {
    document.querySelectorAll('#topnav .nav-pill.active').forEach(b => b.classList.remove('active'));
  }
};

// 兼容旧代码的别名
const ModalManager = {
  init() { ViewManager.init(); },
  open(id) { ViewManager.open(id); },
  close() { ViewManager.close(); }
};

// 统一点击绑定 — 所有 .nav-pill 按钮自动打开对应视图
document.addEventListener('DOMContentLoaded', () => {
  ViewManager.init();

  document.querySelectorAll('.nav-pill[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.dataset.view;
      if (viewId) ViewManager.open(viewId);
    });
  });
});
