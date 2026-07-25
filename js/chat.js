/**
 * js/chat.js — 对话系统核心
 *
 * 包含聊天渲染、输入处理、对话历史和书签四大模块。
 *
 * 所有初始化在 DOMContentLoaded 时自动触发。
 *
 * @namespace ChatRenderer  — 消息渲染与显示
 * @namespace ChatInput     — 用户输入与 API 调用
 * @namespace ChatHistory   — 多会话对话历史管理
 * @namespace Bookmarks     — 消息书签收藏管理
 */

// =============================================================================
// ChatRenderer — 消息渲染器
// =============================================================================

/**
 * 聊天消息渲染器
 *
 * 负责将消息对象渲染为 DOM 元素，支持单条/批量渲染、
 * 滚动到底部、示例对话加载等功能。
 *
 * @namespace ChatRenderer
 */
const ChatRenderer = (function () {
  'use strict';

  /** @type {HTMLElement|null} 消息容器 */
  var _container = null;

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * 初始化渲染器 — 查找容器并加载示例对话
   */
  function init() {
    _container = document.getElementById('chat-messages');
    if (_container) {
      loadSampleConversation();
    }
  }

  /**
   * 渲染单条消息到聊天区域
   *
   * @param {Object} msg — 消息对象
   * @param {string} msg.role — 'user' | 'char' | 'narration'
   * @param {string} msg.text — 消息文本
   * @param {string} [msg.senderName] — 发送者显示名称
   * @param {string} [msg.id] — 消息唯一 ID
   * @param {string} [msg.type] — 'narration' 表示叙述文本
   * @returns {HTMLElement} 创建的 DOM 元素
   */
  function renderMessage(msg) {
    if (!_container) return null;

    var wrapper = document.createElement('div');
    wrapper.className = 'chat-msg ' + (msg.role || '');
    if (msg.id) wrapper.setAttribute('data-msg-id', msg.id);

    // 叙述消息
    if (msg.type === 'narration') {
      wrapper.className = 'chat-narration';
      wrapper.textContent = msg.text || '';
      _container.appendChild(wrapper);
      return wrapper;
    }

    // 发送者标签
    var label = document.createElement('div');
    label.className = 'msg-label';
    if (msg.role === 'char') {
      label.textContent = msg.senderName || '角色';
    } else {
      label.textContent = '你';
    }

    // 对话气泡
    var bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    if (typeof utils !== 'undefined' && utils.parseMessage) {
      bubble.innerHTML = utils.parseMessage(msg.text || '');
    } else {
      bubble.textContent = msg.text || '';
    }

    // 收藏按钮（仅角色消息显示）
    if (msg.role === 'char' && msg.text) {
      var bmBtn = _createBookmarkButton(msg);
      bubble.appendChild(bmBtn);
    }

    wrapper.appendChild(label);
    wrapper.appendChild(bubble);
    _container.appendChild(wrapper);

    return wrapper;
  }

  /**
   * 批量渲染消息（使用 DocumentFragment 提升性能）
   *
   * @param {Object[]} messages — 消息对象数组
   */
  function renderMessages(messages) {
    if (!_container || !messages || !messages.length) return;

    var frag = document.createDocumentFragment();
    messages.forEach(function (msg) {
      var wrapper = document.createElement('div');

      if (msg.type === 'narration') {
        wrapper.className = 'chat-narration';
        wrapper.textContent = msg.text || '';
        frag.appendChild(wrapper);
        return;
      }

      wrapper.className = 'chat-msg ' + (msg.role || '');
      if (msg.id) wrapper.setAttribute('data-msg-id', msg.id);

      var label = document.createElement('div');
      label.className = 'msg-label';
      label.textContent = msg.role === 'char'
        ? (msg.senderName || '角色')
        : '你';

      var bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      if (typeof utils !== 'undefined' && utils.parseMessage) {
        bubble.innerHTML = utils.parseMessage(msg.text || '');
      } else {
        bubble.textContent = msg.text || '';
      }

      wrapper.appendChild(label);
      wrapper.appendChild(bubble);
      frag.appendChild(wrapper);
    });

    _container.appendChild(frag);
    scrollToBottom();
  }

  /**
   * 滚动消息区到底部
   */
  function scrollToBottom() {
    if (_container) {
      _container.scrollTop = _container.scrollHeight;
    }
  }

  /**
   * 加载示例对话（从内嵌数据或 qhl.json 的 first_mes）
   */
  function loadSampleConversation() {
    var samples = [
      { role: 'narration', type: 'narration', text: '五楼走廊那头传来翻箱倒柜的声响...母亲小娟正往脸上抹粉，口红涂歪了一道。' },
      { role: 'char', senderName: '玲玲', text: '*玲玲退回自己房间，把门掩上，没关严。她坐在床边拿起手机，屏幕上是抖音里一个跳舞的视频，音量调到最低。*' },
      { role: 'narration', type: 'narration', text: '走廊里高跟鞋踩瓷砖的声音由远及近。' },
      { role: 'char', senderName: '玲玲', text: '*光着脚走到门口，手搭在门把上停了停，嘴唇抿了一下。然后踩着楼梯往下走。四楼堂哥的房门没关紧，她直接推开半扇，探进脑袋。*' },
      { role: 'char', senderName: '玲玲', text: '"哥，我妈又出去了，你要不要上来。" 声音压得低，尾音往上飘' },
      { role: 'user', senderName: '你', text: '"这么晚了还不睡？上来吧，我在打游戏。"' },
      { role: 'char', senderName: '玲玲', text: '*她推门进来，光着脚踩在地板上，径直走到你床沿坐下。栗色卷发散在肩上，灰色吊带的肩带滑了一边。*\n\n"哥——" *拖长了尾音，把手机翻过来给你看屏幕。*\n\n"我妈又去找那个叔叔了。我不想一个人在五楼。" *她低头抠着手机壳边缘，声音越来越小。*' },
    ];

    renderMessages(samples);

    // 存入全局状态
    if (typeof state !== 'undefined') {
      state.set('messages', samples);
    }
  }

  /**
   * 创建并渲染一条新消息，同时添加到对话历史
   *
   * @param {string} role — 'user' | 'char'
   * @param {string} text — 消息文本
   * @param {string} [senderName] — 发送者名称
   * @returns {Object} 创建的消息对象
   */
  function addMessage(role, text, senderName) {
    var uidFn = (typeof utils !== 'undefined' && utils.uid) ? utils.uid : function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };
    var msg = {
      role: role,
      text: text,
      senderName: senderName || '',
      id: uidFn(),
      time: Date.now(),
    };

    renderMessage(msg);
    scrollToBottom();

    // 添加到对话历史
    if (typeof ChatHistory !== 'undefined' && ChatHistory.addMessage) {
      try {
        ChatHistory.addMessage(msg);
      } catch (e) {
        console.warn('[ChatRenderer] 添加到 ChatHistory 失败:', e.message);
      }
    }

    return msg;
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * 创建收藏按钮
   * @param {Object} msg
   * @returns {HTMLButtonElement}
   * @private
   */
  function _createBookmarkButton(msg) {
    var btn = document.createElement('button');
    btn.className = 'msg-bookmark-btn';
    btn.title = '收藏此消息';
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var sender = msg.role === 'char' ? (msg.senderName || '角色') : '你';
      if (typeof Bookmarks !== 'undefined') {
        Bookmarks.add(msg.text || '', msg.id || '', sender);
      }
    });
    return btn;
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  return {
    container: null, // 向后兼容：允许外部直接访问 _container
    init: init,
    renderMessage: renderMessage,
    renderMessages: renderMessages,
    scrollToBottom: scrollToBottom,
    loadSampleConversation: loadSampleConversation,
    addMessage: addMessage,
  };
})();

// 同步 container 引用（向后兼容旧代码直接访问 ChatRenderer.container）
Object.defineProperty(ChatRenderer, 'container', {
  get: function () { return document.getElementById('chat-messages'); },
  enumerable: true,
  configurable: true,
});

// =============================================================================
// ChatInput — 用户输入与 API 调用
// =============================================================================

/**
 * 聊天输入处理器
 *
 * 负责用户输入、发送消息、调用 LLM API、
 * 以及重新生成/继续写/撤销/清空等操作。
 *
 * @namespace ChatInput
 */
const ChatInput = (function () {
  'use strict';

  /** @type {HTMLTextAreaElement|null} */
  var _input = null;

  /** @type {HTMLElement|null} token 计数显示 */
  var _tokenDisplay = null;

  /** @type {HTMLButtonElement|null} 发送按钮 */
  var _sendBtn = null;

  /** @type {HTMLElement|null} 操作菜单 */
  var _actionMenu = null;

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * 初始化输入栏 — 绑定输入、发送、操作菜单等事件
   */
  function init() {
    _input = document.getElementById('msg-input');
    _tokenDisplay = document.getElementById('token-count-display');
    _sendBtn = document.getElementById('btn-send');
    _actionMenu = document.getElementById('action-menu');

    // 输入事件
    if (_input) {
      _input.addEventListener('input', function () { updateTokenCount(); });
      _input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          send();
        }
      });
    }

    // 发送按钮
    if (_sendBtn) {
      _sendBtn.addEventListener('click', function () { send(); });
    }

    // 操作菜单按钮
    var actionsBtn = document.getElementById('btn-actions');
    if (actionsBtn && _actionMenu) {
      actionsBtn.addEventListener('click', function () {
        _actionMenu.classList.toggle('show');
      });
    }

    // 点击菜单外部自动关闭
    document.addEventListener('click', function (e) {
      if (!_actionMenu) return;
      if (!e.target.closest('.action-menu-wrap')) {
        _actionMenu.classList.remove('show');
      }
    });

    // 操作菜单项绑定
    _bindAction('act-regenerate', regenerate);
    _bindAction('act-continue', continueWrite);
    _bindAction('act-undo', undo);
    _bindAction('act-clear', clearChat);
  }

  /**
   * 更新 token 数量显示
   */
  function updateTokenCount() {
    if (!_tokenDisplay || !_input) return;
    var count = 0;
    if (typeof utils !== 'undefined' && utils.estimateTokens) {
      count = utils.estimateTokens(_input.value);
    }
    _tokenDisplay.textContent = 'Token: ' + count + '/4096';
  }

  /**
   * 发送消息 — 核心流程
   *
   * 1. 获取输入文本
   * 2. 渲染用户消息到聊天区
   * 3. 存入 state
   * 4. 调用 LLM API
   */
  function send() {
    if (!_input) return;
    var text = _input.value.trim();
    if (!text) return;

    // 渲染用户消息
    var msg = ChatRenderer.addMessage('user', text, '你');

    // 更新全局消息列表
    var msgs = (typeof state !== 'undefined' && state.get('messages')) || [];
    msgs.push(msg);
    if (typeof state !== 'undefined') {
      state.set('messages', msgs);
    }

    // 清空输入
    _input.value = '';
    updateTokenCount();

    // 关闭操作菜单
    if (_actionMenu) {
      _actionMenu.classList.remove('show');
    }

    // 调用 LLM
    callLLM(msgs);
  }

  /**
   * 调用 LLM API — 构建 prompt 并请求 AI 回复
   *
   * 优先使用 ST.assemblePrompt 构建消息（含世界书匹配、变量替换等），
   * 若无 ST 模块则回退到 buildApiMessages 简易构建。
   *
   * 回复会经由 ST.StreamParser 解析，在游戏模式下使用游戏界面渲染，
   * 否则渲染为普通聊天气泡。
   *
   * @param {Object[]} messages — 当前消息列表
   * @returns {Promise<void>}
   */
  async function callLLM(messages) {
    // 获取 API 配置
    var config = (typeof Settings !== 'undefined' && Settings.getApiConfig)
      ? Settings.getApiConfig()
      : { url: '', key: '', model: '' };

    if (!config.url || !config.key) {
      if (typeof notifications !== 'undefined') {
        notifications.show('warning', '未配置 API', '请在全局设置中填写 API 接口地址和 Key');
      }
      return;
    }

    // 显示"思考中"指示器
    var thinkingMsg = ChatRenderer.addMessage('char', '*正在思考...*', '玲玲');

    // 通知用户
    if (typeof notifications !== 'undefined') {
      notifications.show('info', '请求中', '正在等待模型回复...');
    }

    // 构建 API 消息
    var apiMessages;
    try {
      if (window.ST && typeof ST.assemblePrompt === 'function') {
        // === 使用酒馆 prompt assembler（完整流程） ===
        var charName = _getCharacterName();
        var userName = '你';
        var lastMsg = messages[messages.length - 1];
        var userInput = (lastMsg && lastMsg.text) ? lastMsg.text.replace(/<[^>]+>/g, '') : '';
        var preset = (typeof ST.createDefaultPreset === 'function')
          ? ST.createDefaultPreset()
          : {};

        // 获取活跃世界书
        var activeBooks = [];
        if (typeof ST.getLorebooks === 'function') {
          try {
            activeBooks = await ST.getLorebooks();
          } catch (e) {
            console.warn('[ChatInput] 获取 lorebooks 失败:', e.message);
          }
        }

        // 清理历史消息
        var cleanHistory = messages
          .filter(function (m) { return m.type !== 'narration'; })
          .map(function (m) {
            return {
              role: m.role === 'user' ? 'user' : 'assistant',
              content: (m.text || '').replace(/<[^>]+>/g, ''),
            };
          });

        var result = ST.assemblePrompt({
          userInput: userInput,
          history: cleanHistory,
          preset: preset,
          lorebooks: activeBooks,
          userName: userName,
          characterName: charName,
          variables: (typeof state !== 'undefined' && state.get('gameVariables')) || {},
        });
        apiMessages = result.messages;
      } else {
        // === 回退：简易 prompt 构建 ===
        apiMessages = buildApiMessages(messages);
      }
    } catch (e) {
      console.warn('[ChatInput] 构建 prompt 失败，使用回退方案:', e.message);
      apiMessages = buildApiMessages(messages);
    }

    // 获取参数
    var temperature = parseFloat(_getFieldValue('cs-temperature', '1.0'));
    var topP = parseFloat(_getFieldValue('cs-topp', '0.9'));
    var maxTokens = parseInt(_getFieldValue('cs-max-tokens', '512'), 10);
    var streaming = _isStreamingEnabled();

    // 请求 API
    try {
      var requestBody = {
        model: config.model || 'gpt-4o',
        messages: apiMessages,
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: topP,
        stream: streaming,
      };

      var resp = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + config.key,
        },
        body: JSON.stringify(requestBody),
      });

      // 移除"思考中"
      _removeElement(thinkingMsg);

      if (!resp.ok) {
        var errText = '';
        try { errText = await resp.text(); } catch (ex) { /* ignore */ }
        var errMsg = resp.status + ': ' + errText.slice(0, 150);
        if (typeof notifications !== 'undefined') {
          notifications.show('error', 'API 错误', errMsg);
        }
        ChatRenderer.addMessage('char', '*[API 错误: ' + resp.status + ']*', '系统');
        return;
      }

      var data = await resp.json();
      var reply = '';
      if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        reply = data.choices[0].message.content;
      } else if (data.choices && data.choices[0] && data.choices[0].text) {
        reply = data.choices[0].text;
      } else {
        reply = '(空回复)';
      }

      // 尝试解析结构化标签
      var parsed = null;
      if (window.ST && ST.StreamParser && typeof ST.StreamParser.parse === 'function') {
        try {
          parsed = ST.StreamParser.parse(reply);
        } catch (e) {
          console.warn('[ChatInput] StreamParser 解析失败:', e.message);
        }
      }

      // 处理游戏模式 vs 普通聊天模式
      var msg;
      var updatedMsgs;

      if (window.ST && ST.GameMode && ST.GameMode.isActive() &&
          parsed && (parsed.maintext || (parsed.options && parsed.options.length > 0))) {
        // === 游戏模式渲染 ===
        ST.GameMode.displayParsedReply(parsed);

        msg = {
          role: 'char',
          text: reply,
          senderName: _getCharacterName(),
          id: utils.uid(),
          time: Date.now(),
          parsed: parsed,
        };

        updatedMsgs = (typeof state !== 'undefined' && state.get('messages')) || [];
        updatedMsgs.push(msg);
        if (typeof state !== 'undefined') state.set('messages', updatedMsgs);

        // 应用变量合并
        _applyVariables(parsed);
      } else {
        // === 普通聊天模式 ===
        msg = ChatRenderer.addMessage('char', reply, _getCharacterName());

        updatedMsgs = (typeof state !== 'undefined' && state.get('messages')) || [];
        updatedMsgs.push(msg);
        if (typeof state !== 'undefined') state.set('messages', updatedMsgs);
      }

    } catch (e) {
      // 网络错误处理
      _removeElement(thinkingMsg);
      if (typeof notifications !== 'undefined') {
        notifications.show('error', '网络错误', e.message);
      }
      ChatRenderer.addMessage('char', '*[网络错误: ' + e.message + ']*', '系统');
    }
  }

  /**
   * 构建 API 消息（简易回退方案）
   *
   * 直接使用角色设定字段构建 system prompt + 对话历史。
   *
   * @param {Object[]} messages — 消息列表
   * @returns {Object[]} API 格式的消息数组
   */
  function buildApiMessages(messages) {
    var charName = _getCharacterName();
    var personality = _getFieldValue('cs-personality', '');
    var scenario = _getFieldValue('cs-background', '');

    // 系统提示
    var systemPrompt = '你是' + charName + '，正在进行角色扮演。\n';
    if (personality) systemPrompt += '性格: ' + personality + '\n';
    if (scenario) systemPrompt += '场景: ' + scenario + '\n';
    systemPrompt += '回复中使用 *动作描述* 表示动作/心理，"对话内容" 表示说话。';

    var apiMessages = [{ role: 'system', content: systemPrompt }];

    messages.forEach(function (m) {
      if (m.type === 'narration') return;
      var role = m.role === 'user' ? 'user' : 'assistant';
      var cleanText = (m.text || '').replace(/<[^>]+>/g, '');
      apiMessages.push({ role: role, content: cleanText });
    });

    return apiMessages;
  }

  /**
   * 重新生成最后一条 AI 回复
   */
  function regenerate() {
    if (_actionMenu) _actionMenu.classList.remove('show');

    var msgs = (typeof state !== 'undefined' && state.get('messages')) || [];
    if (msgs.length === 0) {
      if (typeof notifications !== 'undefined') {
        notifications.show('info', '重新生成', '没有可重新生成的消息');
      }
      return;
    }

    // 移除最后一条角色消息
    var last = msgs[msgs.length - 1];
    if (last.role === 'char') {
      msgs.pop();
      if (typeof state !== 'undefined') state.set('messages', msgs);
    }

    // 重建聊天区
    var container = document.getElementById('chat-messages');
    if (container) container.innerHTML = '';
    ChatRenderer.renderMessages(msgs);

    // 重新调用
    callLLM(msgs);
  }

  /**
   * 继续写 — 在末尾添加继续提示后重新请求
   */
  function continueWrite() {
    if (_actionMenu) _actionMenu.classList.remove('show');

    var msgs = (typeof state !== 'undefined' && state.get('messages')) || [];
    if (msgs.length === 0) {
      if (typeof notifications !== 'undefined') {
        notifications.show('info', '继续写', '没有可继续的消息');
      }
      return;
    }

    // 添加继续提示
    var continueMsg = {
      role: 'user',
      text: '(继续写下去，不要重复之前的内容)',
      senderName: '系统',
      id: (typeof utils !== 'undefined' && utils.uid) ? utils.uid() : Date.now().toString(36),
      time: Date.now(),
    };
    msgs.push(continueMsg);
    if (typeof state !== 'undefined') state.set('messages', msgs);

    callLLM(msgs);
  }

  /**
   * 撤销 — 删除最后一条消息并重绘
   */
  function undo() {
    if (_actionMenu) _actionMenu.classList.remove('show');

    var msgs = (typeof state !== 'undefined' && state.get('messages')) || [];
    if (msgs.length > 0) {
      msgs.pop();
      if (typeof state !== 'undefined') state.set('messages', msgs);
      var container = document.getElementById('chat-messages');
      if (container) container.innerHTML = '';
      ChatRenderer.renderMessages(msgs);
    }
  }

  /**
   * 清空聊天 — 删除所有消息并关闭当前会话
   */
  function clearChat() {
    if (_actionMenu) _actionMenu.classList.remove('show');

    var container = document.getElementById('chat-messages');
    if (container) container.innerHTML = '';

    if (typeof state !== 'undefined') state.set('messages', []);

    // 关闭当前会话
    if (typeof ChatHistory !== 'undefined' && ChatHistory.closeSession) {
      try { ChatHistory.closeSession(); } catch (e) { /* ignore */ }
    }

    if (typeof notifications !== 'undefined') {
      notifications.show('success', '已清空', '对话内容已清除');
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * 获取角色名称
   * @returns {string}
   * @private
   */
  function _getCharacterName() {
    var el = document.getElementById('cs-name');
    return (el && el.value) ? el.value : '邱惠玲';
  }

  /**
   * 获取表单字段值
   * @param {string} id
   * @param {string} fallback
   * @returns {string}
   * @private
   */
  function _getFieldValue(id, fallback) {
    var el = document.getElementById(id);
    return (el && el.value) ? el.value : fallback;
  }

  /**
   * 检查流式输出是否启用
   * @returns {boolean}
   * @private
   */
  function _isStreamingEnabled() {
    var btn = document.getElementById('cs-streaming');
    return !!(btn && btn.classList.contains('active'));
  }

  /**
   * 安全移除 DOM 元素
   * @param {HTMLElement} el
   * @private
   */
  function _removeElement(el) {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  /**
   * 绑定操作菜单项事件
   * @param {string} id — 元素 ID
   * @param {Function} handler — 处理函数
   * @private
   */
  function _bindAction(id, handler) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', function () { handler(); });
    }
  }

  /**
   * 应用变量合并（游戏模式下）
   * @param {Object} parsed — StreamParser 解析结果
   * @private
   */
  function _applyVariables(parsed) {
    if (!parsed) return;
    // ST.VarsMerger
    if (window.ST && ST.VarsMerger && ST.VarsMerger.mergeVariables) {
      var current = (typeof state !== 'undefined' && state.get('gameVariables')) || {};
      var next = ST.VarsMerger.mergeVariables(current, parsed.varsExtracted || (parsed.varsCommands && parsed.varsCommands.merge) || {});
      if (typeof state !== 'undefined') state.set('gameVariables', next);
    }
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  return {
    init: init,
    updateTokenCount: updateTokenCount,
    send: send,
    callLLM: callLLM,
    buildApiMessages: buildApiMessages,
    regenerate: regenerate,
    continueWrite: continueWrite,
    undo: undo,
    clearChat: clearChat,
  };
})();

// =============================================================================
// ChatHistory — 对话历史管理
// =============================================================================

/**
 * 多会话对话历史管理器
 *
 * 自动在每次对话开始时创建新会话，记录所有消息，
 * 支持会话列表的加载/保存/渲染。
 *
 * @namespace ChatHistory
 */
const ChatHistory = (function () {
  'use strict';

  /** @type {Object[]} 会话列表 */
  var _sessions = [];

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * 初始化 — 从 storage 加载历史会话
   */
  function init() {
    load();
  }

  /**
   * 从 storage 加载会话数据
   */
  function load() {
    try {
      if (typeof storage === 'undefined') return;
      var data = storage.get('chat_sessions');
      _sessions = Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('[ChatHistory] 加载失败:', e.message);
      _sessions = [];
    }
  }

  /**
   * 保存会话数据到 storage
   */
  function save() {
    try {
      if (typeof storage !== 'undefined') {
        storage.set('chat_sessions', _sessions);
      }
    } catch (e) {
      console.warn('[ChatHistory] 保存失败:', e.message);
    }
  }

  /**
   * 获取当前活跃的会话（不存在则自动创建）
   * @returns {Object}
   */
  function getCurrentSession() {
    _ensureSession();
    return _sessions[0];
  }

  /**
   * 向当前会话添加一条消息
   * @param {Object} msg — 消息对象
   */
  function addMessage(msg) {
    var session = getCurrentSession();
    if (!session.messages) session.messages = [];
    session.messages.push(msg);
    session.messageCount = session.messages.length;

    // 自动设置会话标题（取第一条用户消息的前 N 个字符）
    if (session.title === '新会话' && msg.text && msg.role === 'user') {
      var preview = msg.text.replace(/[*"「」]/g, '').trim();
      session.title = preview.length > 24
        ? preview.slice(0, 24) + '...'
        : preview;
    }

    session.endTime = Date.now();
    save();
  }

  /**
   * 关闭当前会话（标记为已结束）
   */
  function closeSession() {
    if (_sessions.length > 0 && !_sessions[0].closed) {
      _sessions[0].closed = true;
      _sessions[0].endTime = Date.now();
      save();
    }
  }

  /**
   * 获取所有会话
   * @returns {Object[]}
   */
  function getAll() {
    return _sessions.slice();
  }

  /**
   * 清空所有历史会话
   */
  function clearAll() {
    _sessions = [];
    save();
  }

  /**
   * 渲染会话列表到 #history-list 容器
   */
  function renderList() {
    var container = document.getElementById('history-list');
    if (!container) return;

    var sessions = _sessions.filter(function (s) {
      return s.messages && s.messages.length > 0;
    });

    if (!sessions.length) {
      container.innerHTML = '<div class="history-empty" style="text-align:center;padding:40px;color:var(--text-muted)"><p>暂无对话记录</p></div>';
      return;
    }

    container.innerHTML = '';

    var escape = (typeof utils !== 'undefined' && utils.escapeHTML)
      ? utils.escapeHTML
      : function (s) {
          var d = document.createElement('div');
          d.textContent = String(s || '');
          return d.innerHTML;
        };

    sessions.forEach(function (session) {
      var item = document.createElement('div');
      item.className = 'history-session';

      var time = new Date(session.startTime).toLocaleString('zh-CN', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });

      var lastMsg = session.messages[session.messages.length - 1];
      var preview = lastMsg
        ? (lastMsg.text || '').replace(/[*"「」]/g, '').trim()
        : '';

      item.innerHTML =
        '<div class="history-session-header">' +
          '<span class="history-session-time">' + escape(time) + '</span>' +
          '<span class="history-session-count">' + (session.messageCount || session.messages.length) + ' 条消息</span>' +
        '</div>' +
        '<div class="history-session-preview">' + escape(preview.slice(0, 60)) + '</div>';

      // 点击加载该会话
      item.addEventListener('click', function () {
        if (typeof state !== 'undefined' && session.messages) {
          state.set('messages', session.messages.slice());
          var chatContainer = document.getElementById('chat-messages');
          if (chatContainer) chatContainer.innerHTML = '';
          ChatRenderer.renderMessages(session.messages);
        }
        if (typeof ModalManager !== 'undefined') {
          ModalManager.close();
        }
      });

      container.appendChild(item);
    });
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * 确保存在当前会话（不存在则创建一个）
   * @private
   */
  function _ensureSession() {
    if (!_sessions.length || _sessions[0].closed) {
      var uidFn = (typeof utils !== 'undefined' && utils.uid)
        ? utils.uid
        : function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };

      _sessions.unshift({
        id: uidFn(),
        startTime: Date.now(),
        endTime: null,
        closed: false,
        messageCount: 0,
        title: '新会话',
        messages: [],
      });
      save();
    }
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  return {
    _sessions: _sessions, // 向后兼容：允许外部直接访问
    init: init,
    load: load,
    save: save,
    getCurrentSession: getCurrentSession,
    addMessage: addMessage,
    closeSession: closeSession,
    getAll: getAll,
    clearAll: clearAll,
    renderList: renderList,
  };
})();

// =============================================================================
// Bookmarks — 消息书签管理
// =============================================================================

/**
 * 消息书签收藏管理器
 *
 * 支持添加/删除/跳转书签，自动去重（按 msgId），
 * 数据持久化到 localStorage。
 *
 * @namespace Bookmarks
 */
const Bookmarks = (function () {
  'use strict';

  /** @type {Object[]} 书签列表 */
  var _items = [];

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * 初始化 — 从 storage 加载书签
   */
  function init() {
    load();
  }

  /**
   * 从 storage 加载书签数据
   */
  function load() {
    try {
      if (typeof storage === 'undefined') return;
      var data = storage.get('bookmarks');
      _items = Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('[Bookmarks] 加载失败:', e.message);
      _items = [];
    }
  }

  /**
   * 保存书签数据到 storage
   */
  function save() {
    try {
      if (typeof storage !== 'undefined') {
        storage.set('bookmarks', _items);
      }
    } catch (e) {
      console.warn('[Bookmarks] 保存失败:', e.message);
    }
  }

  /**
   * 添加书签（按 msgId 去重）
   *
   * @param {string} text — 消息文本（最多保存 120 字）
   * @param {string} msgId — 消息唯一 ID
   * @param {string} sender — 发送者名称
   */
  function add(text, msgId, sender) {
    // 去重检查
    var existing = _items.find(function (b) { return b.msgId === msgId; });
    if (existing) {
      if (typeof notifications !== 'undefined') {
        notifications.show('info', '已收藏', '此消息已在书签中');
      }
      return;
    }

    var uidFn = (typeof utils !== 'undefined' && utils.uid)
      ? utils.uid
      : function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };

    _items.unshift({
      id: uidFn(),
      msgId: msgId || '',
      text: (text || '').slice(0, 120),
      sender: sender || '',
      time: Date.now(),
    });

    save();

    if (typeof notifications !== 'undefined') {
      notifications.show('success', '已添加书签', '消息已收藏到书签');
    }

    renderList();
  }

  /**
   * 删除指定 ID 的书签
   * @param {string} id — 书签 ID
   */
  function remove(id) {
    _items = _items.filter(function (b) { return b.id !== id; });
    save();
    renderList();
  }

  /**
   * 获取所有书签
   * @returns {Object[]}
   */
  function getAll() {
    return _items.slice();
  }

  /**
   * 清空所有书签
   */
  function clearAll() {
    _items = [];
    save();
  }

  /**
   * 渲染书签列表到 #bookmark-list 容器
   */
  function renderList() {
    var container = document.getElementById('bookmark-list');
    if (!container) return;

    if (!_items.length) {
      container.innerHTML = '<div class="history-empty" style="text-align:center;padding:40px;color:var(--text-muted)"><p>暂无书签</p></div>';
      return;
    }

    container.innerHTML = '';

    var escape = (typeof utils !== 'undefined' && utils.escapeHTML)
      ? utils.escapeHTML
      : function (s) {
          var d = document.createElement('div');
          d.textContent = String(s || '');
          return d.innerHTML;
        };

    var self = this;

    _items.forEach(function (bm) {
      var item = document.createElement('div');
      item.className = 'bookmark-item';

      var time = new Date(bm.time).toLocaleString('zh-CN', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });

      item.innerHTML =
        '<div class="bookmark-header">' +
          '<span class="bookmark-sender">' + escape(bm.sender) + '</span>' +
          '<span class="bookmark-time">' + escape(time) + '</span>' +
        '</div>' +
        '<div class="bookmark-quote">' + escape(bm.text) + '</div>' +
        '<div class="bookmark-actions">' +
          '<button class="bookmark-jump btn btn-sm btn-secondary">跳转</button>' +
          '<button class="bookmark-remove btn btn-sm btn-danger">删除</button>' +
        '</div>';

      // 跳转按钮
      var jumpBtn = item.querySelector('.bookmark-jump');
      if (jumpBtn) {
        jumpBtn.addEventListener('click', function () {
          if (typeof ModalManager !== 'undefined') {
            ModalManager.close();
          }
          if (bm.msgId) {
            var el = document.querySelector('[data-msg-id="' + bm.msgId + '"]');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        });
      }

      // 删除按钮
      var removeBtn = item.querySelector('.bookmark-remove');
      if (removeBtn) {
        removeBtn.addEventListener('click', function () {
          self.remove(bm.id);
        });
      }

      container.appendChild(item);
    });
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  return {
    init: init,
    load: load,
    save: save,
    add: add,
    remove: remove,
    getAll: getAll,
    clearAll: clearAll,
    renderList: renderList,
  };
})();

// =============================================================================
// DOMContentLoaded 初始化
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {
  // 初始化渲染器和输入
  ChatRenderer.init();
  ChatInput.init();

  // 初始化游戏模式
  if (window.ST && ST.GameMode && typeof ST.GameMode.init === 'function') {
    try {
      ST.GameMode.init();
    } catch (e) {
      console.warn('[chat.js] GameMode.init 失败:', e.message);
    }
  }
});

document.addEventListener('DOMContentLoaded', function () {
  // 初始化对话历史和书签
  ChatHistory.init();
  Bookmarks.init();

  // 清空对话时关闭当前会话（额外监听以确保顺序）
  var clearBtn = document.getElementById('act-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      ChatHistory.closeSession();
    });
  }
});
