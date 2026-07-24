// js/chat.js
const ChatRenderer = {
  container: null,

  init() {
    this.container = document.getElementById('chat-messages');
    this.loadSampleConversation();
  },

  // 渲染单条消息
  renderMessage(msg) {
    const wrapper = document.createElement('div');
    wrapper.className = `chat-msg ${msg.role}`;
    if (msg.id) wrapper.dataset.msgId = msg.id;

    if (msg.type === 'narration') {
      wrapper.className = 'chat-narration';
      wrapper.textContent = msg.text;
      this.container.appendChild(wrapper);
      return;
    }

    const label = document.createElement('div');
    label.className = 'msg-label';
    label.textContent = msg.role === 'char' ? msg.senderName || '角色' : '你';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = utils.parseMessage(msg.text);

    // 收藏按钮
    const bmBtn = document.createElement('button');
    bmBtn.className = 'msg-bookmark-btn';
    bmBtn.title = '收藏此消息';
    bmBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>';
    bmBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sender = msg.role === 'char' ? (msg.senderName || '角色') : '你';
      if (typeof Bookmarks !== 'undefined') {
        Bookmarks.add(msg.text, msg.id || '', sender);
      }
    });
    bubble.appendChild(bmBtn);

    wrapper.appendChild(label);
    wrapper.appendChild(bubble);
    this.container.appendChild(wrapper);
  },

  // 批量渲染
  renderMessages(messages) {
    const frag = document.createDocumentFragment();
    messages.forEach(msg => {
      const wrapper = document.createElement('div');
      wrapper.className = `chat-msg ${msg.role}`;
      if (msg.id) wrapper.dataset.msgId = msg.id;
      if (msg.type === 'narration') {
        wrapper.className = 'chat-narration';
        wrapper.textContent = msg.text;
        frag.appendChild(wrapper);
        return;
      }
      const label = document.createElement('div');
      label.className = 'msg-label';
      label.textContent = msg.role === 'char' ? (msg.senderName || '角色') : '你';
      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      bubble.innerHTML = utils.parseMessage(msg.text);
      wrapper.appendChild(label);
      wrapper.appendChild(bubble);
      frag.appendChild(wrapper);
    });
    this.container.appendChild(frag);
    this.scrollToBottom();
  },

  scrollToBottom() {
    this.container.scrollTop = this.container.scrollHeight;
  },

  // 加载基于 qhl.json 的示例对话
  loadSampleConversation() {
    const samples = [
      { role: 'narration', type: 'narration', text: '五楼走廊那头传来翻箱倒柜的声响…母亲小娟正往脸上抹粉，口红涂歪了一道。' },
      { role: 'char', senderName: '玲玲', text: '*玲玲退回自己房间，把门掩上，没关严。她坐在床边拿起手机，屏幕上是抖音里一个跳舞的视频，音量调到最低。*' },
      { role: 'narration', type: 'narration', text: '走廊里高跟鞋踩瓷砖的声音由远及近。' },
      { role: 'char', senderName: '玲玲', text: '*光着脚走到门口，手搭在门把上停了停，嘴唇抿了一下。然后踩着楼梯往下走。四楼堂哥的房门没关紧，她直接推开半扇，探进脑袋。*' },
      { role: 'char', senderName: '玲玲', text: '"哥，我妈又出去了，你要不要上来。" 声音压得低，尾音往上飘' },
      { role: 'user', senderName: '你', text: '"这么晚了还不睡？上来吧，我在打游戏。"' },
      { role: 'char', senderName: '玲玲', text: '*她推门进来，光着脚踩在地板上，径直走到你床沿坐下。栗色卷发散在肩上，灰色吊带的肩带滑了一边。*\n\n"哥——" *拖长了尾音，把手机翻过来给你看屏幕。*\n\n"我妈又去找那个叔叔了。我不想一个人在五楼。" *她低头抠着手机壳边缘，声音越来越小。*' },
    ];
    this.renderMessages(samples);
    // 存到全局状态
    if (window.state) window.state.set('messages', samples);
  },

  addMessage(role, text, senderName) {
    const msg = { role, text, senderName, id: utils.uid(), time: Date.now() };
    this.renderMessage(msg);
    this.scrollToBottom();
    if (typeof ChatHistory !== 'undefined' && ChatHistory._sessions) {
      ChatHistory.addMessage(msg);
    }
    return msg;
  }
};

// 输入栏
const ChatInput = {
  input: null,
  tokenDisplay: null,
  sendBtn: null,
  actionMenu: null,

  init() {
    this.input = document.getElementById('msg-input');
    this.tokenDisplay = document.getElementById('token-count-display');
    this.sendBtn = document.getElementById('btn-send');
    this.actionMenu = document.getElementById('action-menu');

    this.input.addEventListener('input', () => this.updateTokenCount());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });

    this.sendBtn.addEventListener('click', () => this.send());

    document.getElementById('btn-actions').addEventListener('click', () => {
      this.actionMenu.classList.toggle('show');
    });

    // 点击其他地方关闭菜单
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.action-menu-wrap')) {
        this.actionMenu.classList.remove('show');
      }
    });

    // 操作菜单项
    document.getElementById('act-regenerate').addEventListener('click', () => this.regenerate());
    document.getElementById('act-continue').addEventListener('click', () => this.continueWrite());
    document.getElementById('act-undo').addEventListener('click', () => this.undo());
    document.getElementById('act-clear').addEventListener('click', () => this.clearChat());
  },

  updateTokenCount() {
    const text = this.input.value;
    const count = utils.estimateTokens(text);
    this.tokenDisplay.textContent = `Token: ${count}/4096`;
  },

  send() {
    const text = this.input.value.trim();
    if (!text) return;
    const msg = ChatRenderer.addMessage('user', text, '你');
    // 保存到状态
    if (window.state) {
      const msgs = window.state.get('messages') || [];
      msgs.push(msg);
      window.state.set('messages', msgs);
    }
    this.input.value = '';
    this.updateTokenCount();
    this.actionMenu.classList.remove('show');
    // TODO: 未来连接 LLM 后端时在此处发送请求
  },

  regenerate() {
    if (typeof notifications !== 'undefined') {
      notifications.show('info', '重新生成', '此功能将在连接后端后可用');
    }
    this.actionMenu.classList.remove('show');
  },

  continueWrite() {
    if (typeof notifications !== 'undefined') {
      notifications.show('info', '继续写', '此功能将在连接后端后可用');
    }
    this.actionMenu.classList.remove('show');
  },

  undo() {
    const msgs = window.state?.get('messages') || [];
    if (msgs.length > 0) {
      msgs.pop();
      // 重建聊天区
      ChatRenderer.container.innerHTML = '';
      ChatRenderer.renderMessages(msgs);
      window.state?.set('messages', msgs);
    }
    this.actionMenu.classList.remove('show');
  },

  clearChat() {
    ChatRenderer.container.innerHTML = '';
    if (window.state) window.state.set('messages', []);
    if (typeof notifications !== 'undefined') {
      notifications.show('success', '已清空', '对话内容已清除');
    }
    this.actionMenu.classList.remove('show');
  },

  simulateCharReply(text) {
    // 模拟角色回复（用于演示）
    setTimeout(() => {
      const msg = ChatRenderer.addMessage('char', text, '玲玲');
      if (window.state) {
        const msgs = window.state.get('messages') || [];
        msgs.push(msg);
        window.state.set('messages', msgs);
      }
    }, 800);
  }
};

// DOM 就绪后自动初始化
document.addEventListener('DOMContentLoaded', () => {
  ChatRenderer.init();
  ChatInput.init();
});

// ====== 对话历史管理 ======
const ChatHistory = {
  _sessions: [],

  init() {
    this.load();
  },

  load() {
    const data = storage.get('chat_sessions');
    this._sessions = Array.isArray(data) ? data : [];
  },

  save() {
    storage.set('chat_sessions', this._sessions);
  },

  _ensureSession() {
    if (!this._sessions.length || this._sessions[0].closed) {
      this._sessions.unshift({
        id: utils.uid(),
        startTime: Date.now(),
        endTime: null,
        closed: false,
        messageCount: 0,
        title: '新会话',
        messages: []
      });
      this.save();
    }
  },

  getCurrentSession() {
    this._ensureSession();
    return this._sessions[0];
  },

  addMessage(msg) {
    const session = this.getCurrentSession();
    session.messages.push(msg);
    session.messageCount = session.messages.length;
    if (session.title === '新会话' && msg.text) {
      const preview = msg.text.replace(/[*"「」]/g, '').trim();
      session.title = preview.length > 24 ? preview.slice(0, 24) + '...' : preview;
    }
    session.endTime = Date.now();
    this.save();
  },

  closeSession() {
    if (this._sessions.length && !this._sessions[0].closed) {
      this._sessions[0].closed = true;
      this._sessions[0].endTime = Date.now();
      this.save();
    }
  },

  getAll() {
    return this._sessions;
  },

  clearAll() {
    this._sessions = [];
    this.save();
  },

  renderList() {
    const container = document.getElementById('history-list');
    if (!container) return;
    const sessions = this.getAll().filter(s => s.messages && s.messages.length > 0);
    if (!sessions.length) {
      container.innerHTML = '<div class="history-empty" style="text-align:center;padding:40px;color:var(--text-muted)"><p>暂无对话记录</p></div>';
      return;
    }
    container.innerHTML = '';
    sessions.forEach(session => {
      const item = document.createElement('div');
      item.className = 'history-session';
      const time = new Date(session.startTime).toLocaleString('zh-CN', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const lastMsg = session.messages[session.messages.length - 1];
      const preview = lastMsg ? lastMsg.text.replace(/[*"「」]/g, '').trim() : '';
      item.innerHTML =
        '<div class="history-session-header">' +
          '<span class="history-session-time">' + utils.escapeHTML(time) + '</span>' +
          '<span class="history-session-count">' + session.messageCount + ' 条消息</span>' +
        '</div>' +
        '<div class="history-session-preview">' + utils.escapeHTML(preview.slice(0, 60)) + '</div>';
      item.addEventListener('click', () => {
        if (window.state) {
          window.state.set('messages', session.messages);
          ChatRenderer.container.innerHTML = '';
          ChatRenderer.renderMessages(session.messages);
          ModalManager.close();
        }
      });
      container.appendChild(item);
    });
  }
};

// ====== 书签管理 ======
const Bookmarks = {
  _items: [],

  init() {
    this.load();
  },

  load() {
    const data = storage.get('bookmarks');
    this._items = Array.isArray(data) ? data : [];
  },

  save() {
    storage.set('bookmarks', this._items);
  },

  add(text, msgId, sender) {
    const existing = this._items.find(b => b.msgId === msgId);
    if (existing) {
      if (typeof notifications !== 'undefined') {
        notifications.show('info', '已收藏', '此消息已在书签中');
      }
      return;
    }
    this._items.unshift({
      id: utils.uid(),
      msgId: msgId || '',
      text: text.slice(0, 120),
      sender: sender || '',
      time: Date.now()
    });
    this.save();
    if (typeof notifications !== 'undefined') {
      notifications.show('success', '已添加书签', '消息已收藏到书签');
    }
    this.renderList();
  },

  remove(id) {
    this._items = this._items.filter(b => b.id !== id);
    this.save();
    this.renderList();
  },

  getAll() {
    return this._items;
  },

  clearAll() {
    this._items = [];
    this.save();
  },

  renderList() {
    const container = document.getElementById('bookmark-list');
    if (!container) return;
    if (!this._items.length) {
      container.innerHTML = '<div class="history-empty" style="text-align:center;padding:40px;color:var(--text-muted)"><p>暂无书签</p></div>';
      return;
    }
    container.innerHTML = '';
    this._items.forEach(bm => {
      const item = document.createElement('div');
      item.className = 'bookmark-item';
      const time = new Date(bm.time).toLocaleString('zh-CN', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      item.innerHTML =
        '<div class="bookmark-header">' +
          '<span class="bookmark-sender">' + utils.escapeHTML(bm.sender) + '</span>' +
          '<span class="bookmark-time">' + utils.escapeHTML(time) + '</span>' +
        '</div>' +
        '<div class="bookmark-quote">' + utils.escapeHTML(bm.text) + '</div>' +
        '<div class="bookmark-actions">' +
          '<button class="bookmark-jump btn btn-sm btn-secondary">跳转</button>' +
          '<button class="bookmark-remove btn btn-sm btn-danger">删除</button>' +
        '</div>';
      item.querySelector('.bookmark-jump')?.addEventListener('click', () => {
        ModalManager.close();
        if (bm.msgId) {
          const el = document.querySelector('[data-msg-id="' + bm.msgId + '"]');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      item.querySelector('.bookmark-remove')?.addEventListener('click', () => {
        this.remove(bm.id);
      });
      container.appendChild(item);
    });
  }
};

// 初始化历史记录和书签按钮
document.addEventListener('DOMContentLoaded', () => {
  ChatHistory.init();
  Bookmarks.init();

  const historyBtn = document.getElementById('btn-history');
  const bookmarkBtn = document.getElementById('btn-bookmarks');

  if (historyBtn) {
    historyBtn.addEventListener('click', () => {
      ChatHistory.renderList();
      ModalManager.open('modal-chat-history');
    });
  }

  if (bookmarkBtn) {
    bookmarkBtn.addEventListener('click', () => {
      Bookmarks.renderList();
      ModalManager.open('modal-bookmarks');
    });
  }

  // 清空对话时关闭当前会话
  const clearBtn = document.getElementById('act-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      ChatHistory.closeSession();
    });
  }
});
