/**
 * Game Mode — interactive fiction / choose-your-own-adventure UI.
 *
 * When game mode is active, LLM replies are parsed for structured tags
 * (maintext, options, thinking, sum, vars) and rendered as a game interface
 * instead of standard chat bubbles.
 *
 * @namespace ST.GameMode
 */
window.ST = window.ST || {};

ST.GameMode = (function () {
  'use strict';

  /** @type {boolean} Whether game mode is currently active */
  var _active = false;

  /** @type {string} Thinking display mode: 'fold' | 'hide' | 'inline' */
  var _thinkingMode = 'fold';

  // Cached DOM refs
  var _gameArea = null;
  var _chatArea = null;
  var _gameMaintext = null;
  var _gameOptions = null;
  var _gameThinking = null;
  var _gameVars = null;
  var _toggleBtn = null;
  var _optionHandler = null; // callback for when user clicks an option

  /**
   * Initialize game mode — bind DOM elements, set up event listeners.
   * Call once after DOM is ready.
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

    // Bind thinking fold toggle
    var thinkingSummary = document.querySelector('#game-thinking summary');
    if (thinkingSummary) {
      thinkingSummary.addEventListener('click', function () {
        // CSS details element handles open/close natively
      });
    }

    // Initially hidden
    if (_gameArea) {
      _gameArea.style.display = 'none';
    }
  }

  /**
   * Toggle game mode on/off.
   */
  function toggle() {
    if (_active) {
      switchToChat();
    } else {
      switchToGame();
    }
  }

  /**
   * Switch to game mode — show game UI, hide chat UI.
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
    // Disable normal input bar? Could add a game-specific input.
    var inputBar = document.getElementById('input-bar');
    if (inputBar) {
      // Keep input bar visible for free-text input in game mode
    }
  }

  /**
   * Switch back to chat mode — show chat UI, hide game UI.
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
   * Check whether game mode is active.
   * @returns {boolean}
   */
  function isActive() {
    return _active;
  }

  /**
   * Display a parsed reply in the game UI.
   *
   * @param {Object} parsed - ParsedTags from ST.StreamParser.parse()
   * @param {string} parsed.maintext - main narrative text
   * @param {string[]} parsed.options - list of option strings
   * @param {string} parsed.thinking - AI thinking/chain-of-thought
   * @param {string} parsed.sum - summary
   * @param {Object} parsed.varsCommands - variables commands { merge: {...} }
   */
  function displayParsedReply(parsed) {
    if (!_gameArea) return;

    // Render main text
    if (_gameMaintext) {
      _gameMaintext.innerHTML = formatNarrativeText(parsed.maintext || '');
      _gameMaintext.scrollTop = 0;
    }

    // Render options
    renderOptions(parsed.options || []);

    // Render thinking section
    renderThinking(parsed.thinking || '');

    // Render variables
    if (parsed.varsRaw && _gameVars) {
      _gameVars.textContent = parsed.varsRaw;
      _gameVars.style.display = 'block';
    } else if (_gameVars) {
      _gameVars.style.display = 'none';
    }

    // Scroll maintext to top
    if (_gameMaintext) {
      _gameMaintext.scrollTop = 0;
    }
  }

  /**
   * Render option buttons.
   * @param {string[]} options - list of option text strings
   */
  function renderOptions(options) {
    if (!_gameOptions) return;

    _gameOptions.innerHTML = '';

    if (!options.length) {
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
   * Create a single option button card.
   * @param {string} optionText
   * @param {number} index
   * @returns {HTMLElement}
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
   * Handle clicking an option — send it as a user message.
   * @param {string} optionText
   */
  function handleOptionClick(optionText) {
    // Set the input text and trigger send
    var input = document.getElementById('msg-input');
    if (input) {
      input.value = optionText;
      // Trigger the send logic from ChatInput
      if (typeof ChatInput !== 'undefined' && ChatInput.send) {
        ChatInput.send();
      }
    }

    // Clear options after click (prevent double-click)
    if (_gameOptions) {
      _gameOptions.innerHTML = '';
    }
  }

  /**
   * Set a custom option click handler (for overriding default behavior).
   * @param {function(string):void} handler
   */
  function setOptionHandler(handler) {
    _optionHandler = handler;
  }

  /**
   * Render the thinking section.
   * @param {string} thinkingText
   */
  function renderThinking(thinkingText) {
    if (!_gameThinking) return;

    var body = _gameThinking.querySelector('.game-thinking-body');
    if (!body) return;

    if (!thinkingText.trim()) {
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
        _gameThinking.removeAttribute('open');
        body.textContent = thinkingText;
        // Force open for inline mode
        _gameThinking.setAttribute('open', '');
        break;
      case 'fold':
      default:
        _gameThinking.style.display = 'block';
        body.textContent = thinkingText;
        // Default is closed (collapsed)
        _gameThinking.removeAttribute('open');
        break;
    }
  }

  /**
   * Set the thinking display mode.
   * @param {'fold'|'hide'|'inline'} mode
   */
  function setThinkingMode(mode) {
    _thinkingMode = mode;
  }

  /**
   * Format narrative text with basic markdown-like styling.
   * @param {string} text
   * @returns {string} HTML string
   */
  function formatNarrativeText(text) {
    if (!text) return '';

    // Escape HTML first (use the global utils if available)
    var html = text;
    if (typeof utils !== 'undefined' && utils.escapeHTML) {
      html = utils.escapeHTML(text);
    } else {
      html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Bold: **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic: *text* (but not already inside **)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Newlines → <br> or <p> for double newlines
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = '<p>' + html + '</p>';

    return html;
  }

  // ==================================================================
  // Exported namespace
  // ==================================================================

  return {
    init: init,
    toggle: toggle,
    switchToGame: switchToGame,
    switchToChat: switchToChat,
    isActive: isActive,
    displayParsedReply: displayParsedReply,
    renderOptions: renderOptions,
    handleOptionClick: handleOptionClick,
    setOptionHandler: setOptionHandler,
    setThinkingMode: setThinkingMode,
    renderThinking: renderThinking
  };
})();
