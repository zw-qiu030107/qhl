// js/worldbook.js — 世界书 (World Book)
const WorldBook = {
  entries: [],
  container: null,

  INSERT_POSITIONS: [
    { value: 'before_char', label: '角色定义之前', group: '提示词' },
    { value: 'after_char', label: '角色定义之后', group: '提示词' },
    { value: 'before_example', label: '示例消息之前', group: '提示词' },
    { value: 'after_example', label: '示例消息之后', group: '提示词' },
    { value: 'top_an', label: '作者注记顶部', group: '注记' },
    { value: 'bottom_an', label: '作者注记底部', group: '注记' },
    { value: 'at_depth', label: '@ 深度 D', group: '深度' },
    { value: 'as_system', label: '⚙️ 系统角色消息', group: '角色' },
    { value: 'as_user', label: '👤 用户角色消息', group: '角色' },
    { value: 'as_assistant', label: '🤖 助手角色消息', group: '角色' },
    { value: 'outlet', label: '输出口', group: '宏' },
  ],

  TRIGGER_CONDITIONS: [
    { value: 'keyword', label: '关键词匹配' },
    { value: 'always', label: '始终触发' },
    { value: 'probability', label: '概率触发' },
  ],

  init() {
    this.container = document.getElementById('wb-list');
    const stored = window.storage?.get('worldbook_entries');
    this.entries = (stored && stored.length > 0) ? stored : [];
    this.render();
    this.bindToolbar();
  },

  // ---- CRUD ----

  getAll() {
    return this.entries;
  },

  create(data) {
    const entry = {
      id: utils.uid(),
      keywords: [],
      content: '',
      weight: 50,
      insertPosition: 'before_char',
      depth: 0,
      outletName: '',
      triggerCondition: 'keyword',
      enabled: true,
      order: this.entries.length,
      ...data,
    };
    this.entries.push(entry);
    this.save();
    this.render();
    window.notifications?.show('success', '已新建', `条目「${entry.name}」已创建`);
    return entry;
  },

  update(id, data) {
    const idx = this.entries.findIndex(e => e.id === id);
    if (idx === -1) return;
    Object.assign(this.entries[idx], data);
    this.save();
    this.render();
    window.notifications?.show('success', '已保存', `条目「${this.entries[idx].name}」已更新`);
  },

  delete(id) {
    const entry = this.entries.find(e => e.id === id);
    this.entries = this.entries.filter(e => e.id !== id);
    this.save();
    this.render();
    window.notifications?.show('info', '已删除', `条目「${entry?.name || ''}」已删除`);
  },

  // ---- Rendering ----

  render() {
    if (!this.container) return;
    const count = this.entries.length;
    const el = document.getElementById('wb-count');
    if (el) el.textContent = `${count} 条条目`;

    this.container.innerHTML = '';
    if (count === 0) {
      this.container.innerHTML = '<div style="text-align:center;padding:48px 16px;color:var(--text-muted);font-size:13px">暂无世界书条目<br><span style="font-size:11px;color:var(--text-dim)">点击"+ 新建"或"导入"添加</span></div>';
      return;
    }
    this.entries.forEach(entry => {
      this.container.appendChild(this.renderEntry(entry));
    });
  },

  renderEntry(entry) {
    const card = document.createElement('div');
    card.className = 'wb-entry';
    card.dataset.id = entry.id;

    // --- Header ---
    const header = document.createElement('div');
    header.className = 'wb-entry-header';

    const statusDot = document.createElement('span');
    statusDot.className = `entry-status ${entry.enabled ? 'enabled' : 'disabled'}`;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'entry-name';
    nameSpan.textContent = entry.name || '(未命名)';

    const nameWrap = document.createElement('div');
    nameWrap.className = 'entry-name';
    nameWrap.appendChild(statusDot);
    nameWrap.appendChild(nameSpan);

    const meta = document.createElement('div');
    meta.className = 'entry-meta';
    meta.textContent = `#${entry.keywords?.length || 0} 词 · ${entry.weight || 50}`;

    header.appendChild(nameWrap);
    header.appendChild(meta);

    // --- Body ---
    const body = document.createElement('div');
    body.className = 'wb-entry-body';

    // Name field
    body.appendChild(this._field('名称', `<input type="text" class="wb-f-name" value="${utils.escapeHTML(entry.name || '')}" placeholder="条目名称">`));

    // Content
    body.appendChild(this._field('内容', `<textarea class="wb-f-content" rows="2" placeholder="世界书内容">${utils.escapeHTML(entry.content || '')}</textarea>`));

    // Trigger condition
    const condOpts = this.TRIGGER_CONDITIONS.map(c =>
      `<option value="${c.value}" ${entry.triggerCondition === c.value ? 'selected' : ''}>${c.label}</option>`
    ).join('');
    body.appendChild(this._field('触发条件', `<select class="wb-f-trigger">${condOpts}</select>`));

    // Insert position
    const posOpts = this.INSERT_POSITIONS.map(p =>
      `<option value="${p.value}" ${entry.insertPosition === p.value ? 'selected' : ''}>${p.label}</option>`
    ).join('');
    body.appendChild(this._field('插入位置', `<select class="wb-f-position">${posOpts}</select>`));

    // Conditional: depth (for @ 深度 D)
    const depthShow = entry.insertPosition === 'at_depth' ? ' show' : '';
    body.appendChild(this._field('深度 D', `<input type="number" class="wb-f-depth wb-conditional${depthShow}" value="${entry.depth || 0}" min="0" max="100">`));

    // Conditional: outlet name (for 输出口)
    const outletShow = entry.insertPosition === 'outlet' ? ' show' : '';
    body.appendChild(this._field('输出口', `<input type="text" class="wb-f-outlet wb-conditional${outletShow}" value="${utils.escapeHTML(entry.outletName || '')}" placeholder="输出口名称">`));

    // Weight
    body.appendChild(this._field('权重', `<input type="number" class="wb-f-weight" value="${entry.weight || 50}" min="0" max="999">`));

    // Keywords
    const kwTags = (entry.keywords || []).map(k =>
      `<span class="wb-keyword-tag">${utils.escapeHTML(k)}<span class="kw-remove" data-kw="${utils.escapeHTML(k)}">×</span></span>`
    ).join('');
    body.appendChild(this._field('关键词',
      `<div class="wb-keywords">${kwTags}<input type="text" class="wb-keyword-input" placeholder="添加..."></div>`
    ));

    // Enabled toggle
    body.appendChild(this._field('启用',
      `<label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-secondary);cursor:pointer">
         <input type="checkbox" class="wb-f-enabled" ${entry.enabled ? 'checked' : ''}>
         ${entry.enabled ? '已启用' : '已禁用'}
       </label>`
    ));

    // Actions
    const actions = document.createElement('div');
    actions.className = 'wb-entry-actions';
    actions.innerHTML = `
      <button class="wb-btn-delete">删除</button>
      <button class="wb-btn-cancel">取消</button>
      <button class="wb-btn-save">保存</button>
    `;
    body.appendChild(actions);

    card.appendChild(header);
    card.appendChild(body);

    // --- Event binding (delegation via card) ---
    this._bindCardEvents(card, entry);

    return card;
  },

  _field(label, innerHTML) {
    const div = document.createElement('div');
    div.className = 'wb-field';
    div.innerHTML = `<label>${label}</label>${innerHTML}`;
    return div;
  },

  _bindCardEvents(card, entry) {
    const header = card.querySelector('.wb-entry-header');
    const body = card.querySelector('.wb-entry-body');
    const isExpanded = card.classList.contains('editing');

    // Toggle expand on header click
    header.addEventListener('click', (e) => {
      // Ignore clicks on buttons/inputs inside header
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
      card.classList.toggle('editing');
    });

    // Save button
    card.querySelector('.wb-btn-save')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const data = this._gatherFormData(card);
      this.update(entry.id, data);
      card.classList.remove('editing');
    });

    // Cancel button
    card.querySelector('.wb-btn-cancel')?.addEventListener('click', (e) => {
      e.stopPropagation();
      card.classList.remove('editing');
      // Re-render to reset form to saved state
      this.render();
    });

    // Delete button — show confirmation
    card.querySelector('.wb-btn-delete')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._showDeleteConfirm(card, entry);
    });

    // Conditional field toggles for insert position
    const posSelect = card.querySelector('.wb-f-position');
    if (posSelect) {
      posSelect.addEventListener('change', () => {
        const val = posSelect.value;
        const depthField = card.querySelector('.wb-f-depth');
        const outletField = card.querySelector('.wb-f-outlet');
        if (depthField) depthField.classList.toggle('show', val === 'at_depth');
        if (outletField) outletField.classList.toggle('show', val === 'outlet');
      });
    }

    // Keyword add: Enter key on keyword input
    const kwInput = card.querySelector('.wb-keyword-input');
    if (kwInput) {
      kwInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const text = kwInput.value.trim();
          if (!text) return;
          // Insert tag before the input
          const tag = document.createElement('span');
          tag.className = 'wb-keyword-tag';
          tag.innerHTML = `${utils.escapeHTML(text)}<span class="kw-remove" data-kw="${utils.escapeHTML(text)}">×</span>`;
          kwInput.parentNode.insertBefore(tag, kwInput);
          kwInput.value = '';
          // Bind remove on new tag
          tag.querySelector('.kw-remove')?.addEventListener('click', () => tag.remove());
        }
      });
    }

    // Keyword remove: delegated
    card.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.kw-remove');
      if (removeBtn) {
        removeBtn.parentElement.remove();
      }
    });

    // Enabled checkbox toggle label
    const enabledCb = card.querySelector('.wb-f-enabled');
    if (enabledCb) {
      enabledCb.addEventListener('change', () => {
        const label = enabledCb.closest('label');
        if (label) {
          label.lastChild.textContent = enabledCb.checked ? '已启用' : '已禁用';
        }
      });
    }
  },

  _gatherFormData(card) {
    const name = card.querySelector('.wb-f-name')?.value || '';
    const content = card.querySelector('.wb-f-content')?.value || '';
    const trigger = card.querySelector('.wb-f-trigger')?.value || 'keyword';
    const position = card.querySelector('.wb-f-position')?.value || 'before_char';
    const depth = parseInt(card.querySelector('.wb-f-depth')?.value || '0', 10);
    const outlet = card.querySelector('.wb-f-outlet')?.value || '';
    const weight = parseInt(card.querySelector('.wb-f-weight')?.value || '50', 10);
    const enabled = card.querySelector('.wb-f-enabled')?.checked || false;
    // Gather keywords from tags
    const keywords = [];
    card.querySelectorAll('.wb-keyword-tag').forEach(tag => {
      const text = tag.childNodes[0]?.textContent || '';
      if (text) keywords.push(text);
    });
    return { name, content, triggerCondition: trigger, insertPosition: position, depth, outletName: outlet, weight, enabled, keywords };
  },

  _showDeleteConfirm(card, entry) {
    // Collapse current card
    card.classList.remove('editing');
    // Insert delete confirmation above the card
    const confirmEl = document.createElement('div');
    confirmEl.className = 'wb-delete-confirm';
    confirmEl.innerHTML = `
      <div style="margin-bottom:8px">确认删除条目「${utils.escapeHTML(entry.name || '')}」？</div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="wb-btn-cancel" style="color:var(--text-muted)">取消</button>
        <button class="wb-btn-save" style="background:var(--danger);color:white">确认删除</button>
      </div>
    `;
    card.parentNode.insertBefore(confirmEl, card);

    confirmEl.querySelector('.wb-btn-cancel')?.addEventListener('click', () => confirmEl.remove());
    confirmEl.querySelector('.wb-btn-save')?.addEventListener('click', () => {
      confirmEl.remove();
      this.delete(entry.id);
    });
  },

  // ---- Persistence ----

  save() {
    window.storage?.set('worldbook_entries', this.entries);
  },

  // ---- Toolbar ----

  bindToolbar() {
    document.getElementById('wb-add')?.addEventListener('click', () => {
      const name = prompt('条目名称：');
      if (!name) return;
      this.create({ name });
    });

    document.getElementById('wb-import')?.addEventListener('click', () => {
      const jsonStr = prompt('粘贴 JSON 字符串：');
      if (!jsonStr) return;
      this.import(jsonStr);
    });

    document.getElementById('wb-export')?.addEventListener('click', () => {
      this.export();
    });
  },

  import(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (!Array.isArray(data)) throw new Error('需要 JSON 数组');
      let count = 0;
      data.forEach(item => {
        if (!item.name) return;
        this.entries.push({
          id: utils.uid(),
          keywords: item.keywords || [],
          content: item.content || '',
          weight: item.weight || 50,
          insertPosition: item.insertPosition || 'before_char',
          depth: item.depth || 0,
          outletName: item.outletName || '',
          triggerCondition: item.triggerCondition || 'keyword',
          enabled: item.enabled !== false,
          order: this.entries.length,
          ...item,
          id: utils.uid(), // force new id
        });
        count++;
      });
      this.save();
      this.render();
      window.notifications?.show('success', '导入完成', `导入了 ${count} 条条目`);
    } catch (e) {
      window.notifications?.show('error', '导入失败', e.message);
    }
  },

  export() {
    const json = JSON.stringify(this.entries, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worldbook_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    window.notifications?.show('success', '导出成功', `已下载 ${this.entries.length} 条条目`);
  },
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  WorldBook.init();
});
