/**
 * SillyTavern Core Types — Vanilla JavaScript
 * Type constants, factory functions, and default configurations
 * for the SillyTavern runtime system.
 *
 * @module sillytavern/types
 */
(function () {
  'use strict';

  // Ensure namespace
  window.ST = window.ST || {};

  // =========================================================================
  // XML Tag Constants
  // =========================================================================

  /**
   * Default XML tags extracted from assistant output.
   * @type {string[]}
   */
  ST.DEFAULT_TAGS = ['maintext', 'option', 'sum', 'vars', 'thinking', 'think'];

  /**
   * Tags whose inner content is treated as opaque (not parsed for nested tags).
   * @type {string[]}
   */
  ST.DEFAULT_OPAQUE_TAGS = ['thinking', 'think'];

  /**
   * Default format prompt — instructs the model how to structure its XML output.
   * @type {string}
   */
  ST.DEFAULT_FORMAT_PROMPT =
    '你必须严格按照以下 XML 标签格式输出回复，不要使用 Markdown 包裹：\n' +
    '<thinking>……</thinking>     ← 可选；内部任何字符都视为思考过程，不被解析\n' +
    '<maintext>……</maintext>     ← 必填；本回合的剧情正文，可多段，保留换行\n' +
    '<option>选项 A\n选项 B\n选项 C</option>              ← 必填；至少 2 项，每行一个\n' +
    '<sum>……</sum>               ← 必填；本回合一句话总结\n' +
    '<vars>{ "金钱": +10, "HP": 38 }</vars>   ← 选填；JSON 深合并';

  // =========================================================================
  // Default Settings Factory
  // =========================================================================

  /**
   * Build the default application settings object.
   * Optionally inherits API configuration from a global Settings singleton
   * when available (for vanilla integration scenarios).
   *
   * @returns {Object} Default settings object
   */
  ST.getDefaultSettings = function () {
    var api = {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      timeout: 60000,
    };

    if (typeof Settings !== 'undefined' && Settings.getApiConfig) {
      var cfg = Settings.getApiConfig();
      if (cfg.url)   { api.baseUrl = cfg.url; }
      if (cfg.key)   { api.apiKey = cfg.key; }
      if (cfg.model) { api.model = cfg.model; }
    }

    return {
      api: api,
      apiMode: 'single',
      activePresetId: null,
      activeLorebookIds: [],
      userName: '用户',
      characterName: 'AI',
      theme: 'dark',
      language: 'zh',
      autoSave: true,
      autoSaveInterval: 30,
      uiMode: 'game',
      customTags: ST.DEFAULT_TAGS.slice(),
      formatPromptTemplate: ST.DEFAULT_FORMAT_PROMPT,
      thinkingDisplay: 'fold',
    };
  };

  /**
   * Frozen snapshot of the default settings (cached at module load).
   * @type {Object}
   */
  ST.DEFAULT_SETTINGS = ST.getDefaultSettings();

  // =========================================================================
  // Prompt Order
  // =========================================================================

  /**
   * Standard prompt_order identifiers for OpenAI-compatible presets.
   * Each item defines where and how a piece of context is injected into
   * the assembled messages array.
   *
   * @type {Array<{identifier: string, name: string, role: string}>}
   */
  ST.DEFAULT_PROMPT_ORDER = [
    { identifier: 'main',               name: 'Main Prompt',             role: 'system' },
    { identifier: 'worldInfoBefore',     name: 'World Info (Before)',     role: 'system' },
    { identifier: 'charDescription',     name: 'Character Description',   role: 'system' },
    { identifier: 'charPersonality',     name: 'Character Personality',   role: 'system' },
    { identifier: 'scenario',            name: 'Scenario',                role: 'system' },
    { identifier: 'personaDescription',  name: 'Persona Description',     role: 'system' },
    { identifier: 'dialogueExamples',    name: 'Dialogue Examples',       role: 'system' },
    { identifier: 'chatHistory',         name: 'Chat History',            role: 'system' },
    { identifier: 'worldInfoAfter',      name: 'World Info (After)',      role: 'system' },
    { identifier: 'groupNudge',          name: 'Group Nudge',             role: 'system' },
  ];

  // =========================================================================
  // Preset Factory
  // =========================================================================

  /**
   * Create a default OpenAI-compatible chat completion preset.
   * The returned object does NOT include id or timestamps — those are
   * assigned by the database layer on first save.
   *
   * @returns {Object} Default preset object
   */
  ST.createDefaultPreset = function () {
    var promptOrder = ST.DEFAULT_PROMPT_ORDER.map(function (p) {
      return {
        identifier: p.identifier,
        name: p.name,
        role: p.role,
        enabled: true,
      };
    });

    return {
      name: '默认预设',
      description: 'SillyTavern 兼容的默认 OpenAI 预设',
      settings: {
        temp_openai: 0.8,
        freq_pen_openai: 0,
        pres_pen_openai: 0,
        top_p_openai: 0.9,
        top_k_openai: 0,
        top_a_openai: 0,
        min_p_openai: 0,
        repetition_penalty_openai: 1,
        openai_max_context: 4096,
        openai_max_tokens: 2048,
        stream_openai: false,
        max_context_unlocked: false,
        chat_completion_source: 'openai',
        openai_model: 'gpt-3.5-turbo',
        main: 'Write {{char}}\'s next reply in a fictional chat between {{char}} and {{user}}.',
        nsfw: '',
        jailbreak: '',
        enhanceDefinitions: '',
        impersonation_prompt: '',
        new_chat_prompt: '',
        new_group_chat_prompt: '',
        new_example_chat_prompt: '',
        continue_nudge_prompt: '',
        wi_format: '',
        group_nudge_prompt: '',
        scenario_format: '',
        personality_format: '',
        prompts: [],
        prompt_order: promptOrder,
      },
    };
  };

  // =========================================================================
  // Lorebook Constants
  // =========================================================================

  /**
   * Lorebook entry insertion positions (string form).
   * Numeric equivalents: 0=before_char, 1=after_char, 2=before_example,
   * 3=after_example, 4=at_depth, 5=example_msg_top, 6=example_msg_bottom,
   * 7=outlet.
   *
   * @type {string[]}
   */
  ST.LOREBOOK_POSITIONS = [
    'before_char',
    'after_char',
    'before_example',
    'after_example',
    'at_depth',
    'example_msg_top',
    'example_msg_bottom',
    'outlet',
  ];

  /**
   * Selective logic modes for multi-keyword matching.
   * @type {string[]}
   */
  ST.SELECTIVE_LOGICS = ['and_any', 'not_all', 'not_any', 'and_all'];

  /**
   * Supported macro placeholders for prompt templates.
   * Each entry describes a token that gets replaced at assembly time.
   *
   * @type {Array<{name: string, description: string}>}
   */
  ST.SUPPORTED_MACROS = [
    { name: '{{user}}',     description: '用户名' },
    { name: '{{char}}',     description: 'AI角色名' },
    { name: '{{original}}', description: '用户原始输入' },
    { name: '{{变量名}}',   description: '自定义变量（例如 {{hp}}）' },
  ];

  // =========================================================================
  // Factory Functions — Data Objects
  // =========================================================================

  /**
   * Create a new lorebook entry with all defaults populated.
   *
   * @param {Object} [overrides={}] — properties to override defaults
   * @returns {Object} New lorebook entry object
   */
  ST.createLorebookEntry = function (overrides) {
    var base = {
      id: '',
      keys: [],
      secondaryKeys: [],
      content: '',
      comment: '',
      order: 100,
      position: 'before_char',
      depth: undefined,
      role: undefined,
      selective: false,
      selectiveLogic: 'and_any',
      constant: false,
      probability: 100,
      useProbability: false,
      addMemo: false,
      sticky: undefined,
      cooldown: undefined,
      delay: undefined,
      weight: undefined,
      scanDepth: undefined,
      caseSensitive: false,
      matchWholeWords: false,
      excludeRecursion: false,
      preventRecursion: false,
      useGroupScoring: false,
      matchPersonaDescription: false,
      matchCharacterDescription: false,
      matchCharacterPersonality: false,
      matchCharacterDepthPrompt: false,
      matchScenario: false,
      matchCreatorNotes: false,
      group: '',
      decorators: [],
      characterFilter: undefined,
    };
    return Object.assign(base, overrides || {});
  };

  /**
   * Create a new lorebook object with all defaults populated.
   *
   * @param {Object} [overrides={}] — properties to override defaults
   * @returns {Object} New lorebook object
   */
  ST.createLorebook = function (overrides) {
    var base = {
      id: '',
      name: '',
      description: '',
      entries: [],
      recursiveScanning: false,
      caseSensitive: false,
      matchWholeWords: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return Object.assign(base, overrides || {});
  };

  /**
   * Create a new chat message object with all defaults populated.
   *
   * @param {Object} [overrides={}] — properties to override defaults
   * @returns {Object} New chat message object
   */
  ST.createChatMessage = function (overrides) {
    var base = {
      id: '',
      role: 'user',
      content: '',
      timestamp: Date.now(),
      variables: undefined,
      metadata: undefined,
      parsed: undefined,
      variablesAfter: undefined,
      apiUsed: undefined,
    };
    return Object.assign(base, overrides || {});
  };

  /**
   * Create a new chat session object with all defaults populated.
   *
   * @param {Object} [overrides={}] — properties to override defaults
   * @returns {Object} New chat session object
   */
  ST.createChatSession = function (overrides) {
    var base = {
      id: '',
      name: '',
      messages: [],
      characterName: '',
      userName: '',
      presetId: null,
      lorebookIds: [],
      variables: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return Object.assign(base, overrides || {});
  };

  /**
   * Create a default ParsedTags result object used after stream-parsing
   * assistant output. Represents the structured content extracted from XML tags.
   *
   * @returns {Object} Empty ParsedTags object
   */
  ST.createParsedTags = function () {
    return {
      thinking: '',
      maintext: '',
      options: [],
      sum: '',
      varsRaw: '',
      varsCommands: { merge: {} },
      unknown: {},
    };
  };

  // =========================================================================
  // Enum Constants
  // =========================================================================

  /** Available API modes. @type {string[]} */
  ST.API_MODES = ['single', 'dual'];

  /** Available UI themes. @type {string[]} */
  ST.THEMES = ['dark', 'light'];

  /** Available interface languages. @type {string[]} */
  ST.LANGUAGES = ['zh', 'en'];

  /** Available UI modes (game layout vs. chat layout). @type {string[]} */
  ST.UI_MODES = ['game', 'chat'];

  /** Available thinking content display modes. @type {string[]} */
  ST.THINKING_DISPLAY_MODES = ['fold', 'hide', 'inline'];

  /** Valid chat message roles. @type {string[]} */
  ST.MESSAGE_ROLES = ['system', 'user', 'assistant'];

  /** Task names used for dual-API split routing. @type {string[]} */
  ST.TASKS = ['story', 'summary', 'vars'];

  /** API target designations for dual-API mode. @type {string[]} */
  ST.API_TARGETS = ['primary', 'secondary'];

  // =========================================================================
  // Database Constants
  // =========================================================================

  /** Current database schema version. @type {number} */
  ST.DB_VERSION = 3;

  /** IndexedDB database name. @type {string} */
  ST.DB_NAME = 'SillyTavernWebDB';

  // =========================================================================
  // Init
  // =========================================================================

  console.log('[ST.types] SillyTavern core types initialized');
})();
