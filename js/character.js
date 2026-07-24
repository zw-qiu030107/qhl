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

/* ---- 角色卡管理 ---- */
const CharacterManager = {
  cards: [],

  init() {
    const btn = document.getElementById('btn-character-manager');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (typeof ModalManager === 'undefined') return;
      this.renderList();
      ModalManager.open('modal-char-manager');
    });
    this.setupDragDrop();
  },

  renderList() {
    const list = document.getElementById('char-card-list');
    if (!list) return;
    const cards = this.cards;
    if (!cards.length) {
      list.innerHTML = '<div class="empty-list-msg">暂无角色卡，拖拽 JSON 文件到上方导入</div>';
      return;
    }
    list.innerHTML = cards.map((card, i) => {
      const name = card.data?.name || card.name || '未命名';
      const desc = card.data?.description || card.description || '';
      return `
        <div class="char-card-item" data-index="${i}">
          <div class="char-card-info">
            <span class="char-card-name">${this.escapeHtml(name)}</span>
            <span class="char-card-desc">${this.escapeHtml(desc)}</span>
          </div>
          <div class="char-card-actions">
            <button class="btn-card-edit" data-index="${i}" title="编辑">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-card-delete" data-index="${i}" title="删除">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Bind edit buttons
    list.querySelectorAll('.btn-card-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        const card = this.cards[idx];
        if (card && typeof CharacterEditor !== 'undefined') {
          CharacterEditor.loadCard(card);
          CharacterEditor.currentIndex = idx;
          ModalManager.open('modal-char-editor');
        }
      });
    });

    // Bind delete buttons
    list.querySelectorAll('.btn-card-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        this.deleteCard(idx);
      });
    });
  },

  setupDragDrop() {
    const zone = document.getElementById('char-drop-zone');
    const input = document.getElementById('char-file-input');
    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.json')) {
        this.readFile(file);
      }
    });

    input.addEventListener('change', () => {
      const file = input.files[0];
      if (file) this.readFile(file);
      input.value = '';
    });
  },

  readFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        this.importCard(data);
      } catch (err) {
        if (typeof window.notifications !== 'undefined') {
          window.notifications.show('error', '导入失败', 'JSON 解析错误：' + err.message);
        }
      }
    };
    reader.readAsText(file);
  },

  importCard(jsonData) {
    this.cards.push(jsonData);
    this.saveToStorage();
    this.renderList();
    if (typeof window.notifications !== 'undefined') {
      const name = jsonData.data?.name || jsonData.name || '角色卡';
      window.notifications.show('success', '导入成功', `已导入「${name}」`);
    }
  },

  exportCard(index) {
    const card = this.cards[index];
    if (!card) return;
    const name = card.data?.name || card.name || 'character';
    const blob = new Blob([JSON.stringify(card, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  deleteCard(index) {
    if (index < 0 || index >= this.cards.length) return;
    this.cards.splice(index, 1);
    this.saveToStorage();
    this.renderList();
    if (typeof window.notifications !== 'undefined') {
      window.notifications.show('info', '已删除', '角色卡已移除');
    }
  },

  saveToStorage() {
    if (typeof window.storage !== 'undefined') {
      window.storage.set('character_cards', this.cards);
    }
  },

  loadFromStorage() {
    if (typeof window.storage !== 'undefined') {
      this.cards = window.storage.get('character_cards') || [];
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

/* ---- 角色卡编辑器 ---- */
const CharacterEditor = {
  currentIndex: -1,

  init() {
    // Range slider sync
    const range = document.getElementById('editor-talkativeness');
    const val = document.getElementById('editor-talkativeness-val');
    if (range && val) {
      range.addEventListener('input', () => {
        val.textContent = range.value;
      });
    }

    // Tags inline input
    const tagInput = document.getElementById('editor-tags-input');
    if (tagInput) {
      tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const text = tagInput.value.trim();
          if (text) this.addTag(text);
          tagInput.value = '';
        }
      });
    }

    // Toggle view button
    const toggleBtn = document.getElementById('editor-toggle-view');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleView());
    }

    // Save button
    const saveBtn = document.getElementById('editor-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.save());
    }
  },

  loadCard(card) {
    const d = card.data || card;
    this.setVal('editor-name', d.name || '');
    this.setVal('editor-description', d.description || '');
    this.setVal('editor-personality', d.personality || '');
    this.setVal('editor-scenario', d.scenario || '');
    this.setVal('editor-first-mes', d.first_mes || '');
    this.setVal('editor-mes-example', d.mes_example || '');
    this.setVal('editor-talkativeness', d.talkativeness ?? 50);
    const tv = document.getElementById('editor-talkativeness-val');
    if (tv) tv.textContent = d.talkativeness ?? 50;

    // Tags
    const container = document.getElementById('editor-tags-container');
    if (container) {
      // Remove old chips, keep input
      container.querySelectorAll('.tag-chip').forEach(el => el.remove());
      const input = container.querySelector('.tag-input-inline');
      if (Array.isArray(d.tags)) {
        d.tags.forEach(tag => this.addTag(tag));
      }
    }

    // Sync JSON textarea
    this.syncJsonView();
    // Ensure form view is visible
    this.showFormView();
  },

  setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  },

  getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  },

  addTag(text) {
    const container = document.getElementById('editor-tags-container');
    if (!container) return;
    const input = container.querySelector('.tag-input-inline');
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `${this.escapeHtml(text)}<span class="tag-remove" data-tag="${this.escapeHtml(text)}">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </span>`;
    chip.querySelector('.tag-remove').addEventListener('click', () => {
      chip.remove();
    });
    container.insertBefore(chip, input);
  },

  getTags() {
    const container = document.getElementById('editor-tags-container');
    if (!container) return [];
    return Array.from(container.querySelectorAll('.tag-chip')).map(chip => {
      return chip.textContent.trim();
    });
  },

  toggleView() {
    const formView = document.getElementById('editor-form-view');
    const jsonView = document.getElementById('editor-json-view');
    const toggleBtn = document.getElementById('editor-toggle-view');
    if (!formView || !jsonView || !toggleBtn) return;

    const isFormVisible = formView.style.display !== 'none';
    if (isFormVisible) {
      // Switch to JSON view: sync before showing
      this.syncJsonView();
      formView.style.display = 'none';
      jsonView.style.display = 'block';
      toggleBtn.textContent = '表单视图';
    } else {
      // Switch to form view: parse JSON back
      this.parseJsonView();
      jsonView.style.display = 'none';
      formView.style.display = 'block';
      toggleBtn.textContent = 'JSON 视图';
    }
  },

  syncJsonView() {
    const textarea = document.getElementById('editor-json-textarea');
    if (!textarea) return;
    const card = this.collectCard();
    textarea.value = JSON.stringify(card, null, 2);
  },

  parseJsonView() {
    const textarea = document.getElementById('editor-json-textarea');
    if (!textarea) return;
    try {
      const data = JSON.parse(textarea.value);
      this.loadCard(data);
    } catch (e) {
      if (typeof window.notifications !== 'undefined') {
        window.notifications.show('error', 'JSON 解析错误', '请检查格式后再切换');
      }
    }
  },

  collectCard() {
    return {
      name: this.getVal('editor-name'),
      description: this.getVal('editor-description'),
      personality: this.getVal('editor-personality'),
      scenario: this.getVal('editor-scenario'),
      first_mes: this.getVal('editor-first-mes'),
      mes_example: this.getVal('editor-mes-example'),
      talkativeness: parseInt(this.getVal('editor-talkativeness')) || 50,
      tags: this.getTags()
    };
  },

  save() {
    const card = this.collectCard();
    // Update card in CharacterManager if exists
    if (typeof CharacterManager !== 'undefined') {
      if (this.currentIndex >= 0 && this.currentIndex < CharacterManager.cards.length) {
        CharacterManager.cards[this.currentIndex] = { data: card };
        CharacterManager.saveToStorage();
        CharacterManager.renderList();
      } else {
        // Save as new
        CharacterManager.cards.push({ data: card });
        CharacterManager.saveToStorage();
      }
    }
    if (typeof window.notifications !== 'undefined') {
      window.notifications.show('success', '已保存', `角色卡「${card.name}」已更新`);
    }
    ModalManager.close();
  },

  showFormView() {
    const formView = document.getElementById('editor-form-view');
    const jsonView = document.getElementById('editor-json-view');
    const toggleBtn = document.getElementById('editor-toggle-view');
    if (formView) formView.style.display = 'block';
    if (jsonView) jsonView.style.display = 'none';
    if (toggleBtn) toggleBtn.textContent = 'JSON 视图';
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// Initialize after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  CharacterManager.init();
  CharacterEditor.init();
});
