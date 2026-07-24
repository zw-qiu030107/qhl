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
