// ====================================================================== //
// js/modals.js — ViewManager 视图管理器 + 统一事件绑定                       //
// ====================================================================== //

const ViewManager = {
  overlay: null,
  current: null,

  init() {
    this.overlay = document.getElementById('modal-overlay');
    if (!this.overlay) return;

    // Escape 键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });

    // 点击遮罩外部关闭
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // 子视图内关闭按钮委托
    this.overlay.querySelectorAll('.view-close, .view-back').forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });
  },

  // 打开指定 ID 的弹窗
  open(viewId) {
    // 如果当前已有弹窗打开，先隐藏它
    if (this.current) {
      this.current.classList.add('hidden');
    }

    // 找到目标弹窗元素
    this.current = document.getElementById(viewId);
    if (!this.current) return;

    // 显示遮罩层 + 移除目标弹窗的 hidden 类
    this.overlay.classList.remove('hidden');
    this.current.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    this.highlightNav(viewId);
  },

  // 关闭当前弹窗
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

  // 高亮触发弹窗的导航按钮
  highlightNav(viewId) {
    const map = {
      'modal-char-manager': 'btn-character-manager',
      'modal-char-editor':  'btn-character-manager',
      'modal-chat-history': 'btn-history',
      'modal-bookmarks':    'btn-bookmarks',
      'modal-settings':     'btn-settings',
    };
    const btnId = map[viewId];
    if (btnId) {
      document.getElementById(btnId)?.classList.add('active');
    }
  },

  // 清除所有药丸按钮的 active 高亮
  clearNavHighlight() {
    // 【修改点 ③】原选择器为 '#topnav .nav-pill.active'
    // 但实际 HTML 中 nav-pill 并不一定在 #topnav 内，
    // 改为不带父级前缀，确保能正确匹配到所有 .nav-pill.active
    document.querySelectorAll('.nav-pill.active').forEach(b => b.classList.remove('active'));
  }
};

// 兼容旧代码的别名（ModalManager → ViewManager）
const ModalManager = {
  init()  { ViewManager.init();  },
  open(id){ ViewManager.open(id); },
  close() { ViewManager.close(); }
};


// ====================================================================== //
// 统一事件绑定                                                              //
// ====================================================================== //
// 原理：所有带 data-view 属性的元素，点击时自动打开对应弹窗。                 //
// 新增按钮只需加 data-view="modal-xxx" 即可，无需写额外 JS。                  //

document.addEventListener('DOMContentLoaded', () => {
  ViewManager.init();

  document.addEventListener('click', (e) => {
    // 从被点击的元素向上查找最近的 [data-view]
    const trigger = e.target.closest('[data-view]');
    if (!trigger) return;

    const viewId = trigger.dataset.view;
    if (viewId) {
      e.preventDefault();
      e.stopPropagation();  // 【修改点 ④】阻止冒泡
      // 原因：下拉菜单项（带 data-view）嵌套在 .nav-pill-group 内，
      //       如果 pill 本身也有 data-view，冒泡会导致重复调用 open()。
      //       加上 stopPropagation() 确保只有被点击的那个元素触发。
      ViewManager.open(viewId);
    }
  });
});
