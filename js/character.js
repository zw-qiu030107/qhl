// js/character.js
const CharacterSettings = {
  fields: {},

  init() {
    // Initialize field references
    this.fields = {
      name: document.getElementById('cs-name'),
      nickname: document.getElementById('cs-nickname'),
      age: document.getElementById('cs-age'),
      zodiac: document.getElementById('cs-zodiac'),
      personality: document.getElementById('cs-personality'),
      likes: document.getElementById('cs-likes'),
      background: document.getElementById('cs-background'),
      relationship: document.getElementById('cs-relationship'),
    };
    this.loadFromCard();

    // Tab switching
    document.querySelectorAll('#right-panel .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#right-panel .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('#right-panel .tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });
  },

  loadFromCard() {
    const card = window.storage?.get('character_card');
    if (!card) return;
    const d = card.data || card;
    this.setVal('name', d.name || '');
    this.setVal('nickname', d.description || '');
    this.setVal('personality', d.personality || '');
    this.setVal('background', d.scenario || '');
  },

  setVal(key, val) {
    if (this.fields[key]) this.fields[key].value = val;
  },

  getVal(key) {
    return this.fields[key]?.value || '';
  },

  save() {
    const card = window.storage?.get('character_card') || {};
    card.data = card.data || {};
    card.data.name = this.getVal('name');
    card.data.personality = this.getVal('personality');
    card.data.scenario = this.getVal('background');
    window.storage?.set('character_card', card);
    window.notifications?.show('success', '已保存', '角色设定已更新');
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  CharacterSettings.init();
});
