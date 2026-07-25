/**
 * js/game-mode.js — 游戏模式交互界面
 *
 * 当游戏模式激活时，LLM 回复的结构化标签（maintext、options、thinking 等）
 * 被渲染为沉浸式游戏界面，而非标准聊天气泡。
 *
 * 支持三种思维链显示模式：折叠（fold）、隐藏（hide）、内联（inline）。
 *
 * @namespace ST.GameMode
 */

window.ST = window.ST || {};

ST.GameMode = (function () {
  'use strict';

  /** @type {boolean} 游戏模式是否激活 */
  var _active = false;

  /** @type {string} 思维链显示模式: 'fold' | 'hide' | 'inline' */
  var _thinkingMode = 'fold';

  /** @type {Function|null} 自定义选项点击处理器 */
  var _optionHandler = null;

  // 缓存的 DOM 引用
  var _gameArea = null;
  var _chatArea = null;
  var _gameMaintext = null;
  var _gameOptions = null;
  var _gameThinking = null;
  var _gameVars = null;
  var _toggleBtn = null;

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * 初始化游戏模式 — 绑定 DOM 元素和事件监听器
   *
   * 应在 DOMContentLoaded 后调用一次。
   */
  function init() {
    _gameArea = document.getElementById('game-area');
    _chatArea = document.getElementById('chat-area');
    _gameMaintext = document.getElementById('game-maintext');
    _gameOptions = document.getElementById('game-options');
    _gameThinking = document.getElementById('game-thinking');
    _gameVars = document.getElementById('game-vars');
    _toggleBtn = document.getElementById('btn-game-mode');

    if (_toggleBtn) {
      _toggleBtn.addEventListener('click', toggle);
    }

    // 初始隐藏游戏区域
    if (_gameArea) {
      _gameArea.style.display = 'none';
    }

    console.log('[ST.GameMode] 游戏模式已初始化');
  }

  /**
   * 切换游戏模式开/关
   */
  function toggle() {
    if (_active) {
      switchToChat();
    } else {
      switchToGame();
    }
  }

  /**
   * 切换到游戏模式 — 显示游戏 UI，隐藏聊天 UI
   */
  function switchToGame() {
    _active = true;
    if (_chatArea) _chatArea.style.display = 'none';
    if (_gameArea) _gameArea.style.display = 'flex';
    if (_toggleBtn) {
      _toggleBtn.classList.add('active');
      _toggleBtn.setAttribute('aria-pressed', 'true');
      _toggleBtn.title = '切换回对话模式';
    }
  }

  /**
   * 切换回聊天模式 — 显示聊天 UI，隐藏游戏 UI
   */
  function switchToChat() {
    _active = false;
    if (_chatArea) _chatArea.style.display = 'flex';
    if (_gameArea) _gameArea.style.display = 'none';
    if (_toggleBtn) {
      _toggleBtn.classList.remove('active');
      _toggleBtn.setAttribute('aria-pressed', 'false');
      _toggleBtn.title = '切换到游戏模式';
    }
  }

  /**
   * 检查游戏模式是否激活
   * @returns {boolean}
   */
  function isActive() {
    return _active;
  }

  /**
   * 显示解析后的回复到游戏界面
   *
   * @param {Object} parsed — ST.StreamParser.parse() 的 ParsedTags 结果
   * @param {string} parsed.maintext — 剧情正文
   * @param {string[]} parsed.options — 选项文本列表
   * @param {string} parsed.thinking — AI 思维链
   * @param {string} parsed.sum — 回合摘要
   * @param {string} parsed.varsRaw — 原始变量文本
   */
  function displayParsedReply(parsed) {
    if (!_gameArea) return;

    // 渲染叙事正文
    if (_gameMaintext) {
      _gameMaintext.innerHTML = formatNarrativeText(parsed.maintext || '');
      _gameMaintext.scrollTop = 0;
    }

    // 渲染选项按钮
    renderOptions(parsed.options || []);

    // 渲染思维链
    renderThinking(parsed.thinking || '');

    // 渲染变量区
    if (_gameVars) {
      if (parsed.varsRaw && parsed.varsRaw.trim()) {
        _gameVars.textContent = parsed.varsRaw;
        _gameVars.style.display = 'block';
      } else {
        _gameVars.style.display = 'none';
      }
    }

    // 滚动正文到顶部
    if (_gameMaintext) {
      _gameMaintext.scrollTop = 0;
    }
  }

  /**
   * 渲染选项按钮列表
   *
   * @param {string[]} options — 选项文本列表
   */
  function renderOptions(options) {
    if (!_gameOptions) return;

    _gameOptions.innerHTML = '';

    if (!options || !options.length) {
      var emptyHint = document.createElement('div');
      emptyHint.className = 'game-options-empty';
      emptyHint.textContent = '（在输入框中输入你的行动）';
      _gameOptions.appendChild(emptyHint);
      return;
    }

    for (var i = 0; i < options.length; i++) {
      var btn = createOptionButton(options[i], i);
      _gameOptions.appendChild(btn);
    }
  }

  /**
   * 创建一个选项按钮
   *
   * @param {string} optionText — 选项文本
   * @param {number} index — 选项索引
   * @returns {HTMLButtonElement}
   */
  function createOptionButton(optionText, index) {
    var btn = document.createElement('button');
    btn.className = 'game-option-btn';
    btn.textContent = optionText;
    btn.setAttribute('data-option-index', String(index));

    btn.addEventListener('click', function () {
      handleOptionClick(optionText);
    });

    return btn;
  }

  /**
   * 处理选项点击 — 将选项文本设置为输入框内容并发送
   *
   * @param {string} optionText — 被点击的选项文本
   */
  function handleOptionClick(optionText) {
    // 如果有自定义处理器，优先使用
    if (typeof _optionHandler === 'function') {
      _optionHandler(optionText);
      return;
    }

    // 默认行为：填入输入框并调用发送
    var input = document.getElementById('msg-input');
    if (input) {
      input.value = optionText;
      if (typeof ChatInput !== 'undefined' && ChatInput.send) {
        ChatInput.send();
      }
    }

    // 点击后清空选项，防止重复点击
    if (_gameOptions) {
      _gameOptions.innerHTML = '';
    }
  }

  /**
   * 设置自定义的选项点击处理器
   *
   * @param {Function} handler — 回调函数 (optionText: string) => void
   */
  function setOptionHandler(handler) {
    _optionHandler = handler;
  }

  /**
   * 渲染思维链区域
   *
   * @param {string} thinkingText — 思维链文本
   */
  function renderThinking(thinkingText) {
    if (!_gameThinking) return;

    var body = _gameThinking.querySelector('.game-thinking-body');
    if (!body) return;

    // 无内容 → 隐藏
    if (!(thinkingText || '').trim()) {
      _gameThinking.style.display = 'none';
      body.textContent = '';
      return;
    }

    switch (_thinkingMode) {
      case 'hide':
        _gameThinking.style.display = 'none';
        break;
      case 'inline':
        _gameThinking.style.display = 'block';
        body.textContent = thinkingText;
        _gameThinking.setAttribute('open', '');
        break;
      case 'fold':
      default:
        _gameThinking.style.display = 'block';
        body.textContent = thinkingText;
        _gameThinking.removeAttribute('open');
        break;
    }
  }

  /**
   * 设置思维链显示模式
   *
   * @param {'fold'|'hide'|'inline'} mode
   */
  function setThinkingMode(mode) {
    if (mode === 'fold' || mode === 'hide' || mode === 'inline') {
      _thinkingMode = mode;
    }
  }

  /**
   * 格式化叙事文本 — 基础 Markdown 转 HTML
   *
   * 规则：
   * - **粗体** → <strong>
   * - *斜体* → <em>
   * - 双换行 → <p>
   * - 单换行 → <br>
   *
   * @param {string} text — 原始叙事文本
   * @returns {string} HTML 字符串
   */
  function formatNarrativeText(text) {
    if (!text) return '';

    // HTML 转义
    var html;
    if (typeof utils !== 'undefined' && utils.escapeHTML) {
      html = utils.escapeHTML(text);
    } else {
      html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    // **粗体**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // *斜体*（不匹配已被 ** 处理过的 `*...*` 形式中的 `*`，
    // 这里简单处理：** 之后的独立 *...* 对）
    html = html.replace(/(?:^|[^*])\*([^*]+)\*(?:[^*]|$)/g, function (match, p1, offset) {
      // 检查前面是否有 * 表示它可能是 ** 的一部分
      var pre = offset > 0 ? html.charAt(offset - 1) : '';
      var post = offset + match.length < html.length ? html.charAt(offset + match.length - 1) : '';
      return pre + '<em>*' + p1 + '*</em>' + post;
    });

    // 段落处理
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = '<p>' + html + '</p>';

    return html;
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  return {
    init: init,
    toggle: toggle,
    switchToGame: switchToGame,
    switchToChat: switchToChat,
    isActive: isActive,
    displayParsedReply: displayParsedReply,
    renderOptions: renderOptions,
    createOptionButton: createOptionButton,
    handleOptionClick: handleOptionClick,
    setOptionHandler: setOptionHandler,
    renderThinking: renderThinking,
    setThinkingMode: setThinkingMode,
    formatNarrativeText: formatNarrativeText,
  };
})();
