// js/modals.js -- Modal system manager

const ModalManager = {
  overlay: null,
  current: null,

  init() {
    this.overlay = document.getElementById('modal-overlay');
    if (!this.overlay) return;

    // Click outside modal content to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  },

  open(modalId) {
    this.close();
    this.current = document.getElementById(modalId);
    if (!this.current) return;
    this.overlay.classList.remove('hidden');
    this.current.classList.remove('hidden');
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden';
  },

  close() {
    if (this.current) this.current.classList.add('hidden');
    if (this.overlay) this.overlay.classList.add('hidden');
    this.current = null;
    document.body.style.overflow = '';
  }
};

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  ModalManager.init();
});
