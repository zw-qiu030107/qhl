/**
 * js/app.js — 应用初始化入口
 *
 * 负责按依赖顺序初始化所有模块：
 * 1. 基础组件（notifications、ModalManager、Settings）
 * 2. ST 数据库（IndexedDB）
 * 3. 角色卡加载
 * 4. 业务模块（ChatRenderer、ChatInput、WorldBook、CharacterManager 等）
 * 5. 全局状态初始化
 *
 * 所有初始化步骤都有 try/catch 保护，单点失败不会阻塞其它模块。
 *
 * @namespace App
 */

const App = (function () {
  'use strict';

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * 应用主初始化入口
   *
   * 在 DOMContentLoaded 时自动调用。
   *
   * @returns {Promise<void>}
   */
  async function init() {
    console.log('[App] 开始初始化...');

    // ---- 1. 基础组件 ----
    _safeInit('notifications', function () {
      if (typeof notifications !== 'undefined') notifications.init();
    });

    _safeInit('ModalManager', function () {
      if (typeof ModalManager !== 'undefined') ModalManager.init();
    });

    _safeInit('Settings', function () {
      if (typeof Settings !== 'undefined') Settings.init();
    });

    // ---- 2. ST IndexedDB ----
    if (window.ST && typeof ST.dbInit === 'function') {
      try {
        await ST.dbInit();
        console.log('[App] ST 数据库已初始化');
      } catch (e) {
        console.warn('[App] ST.dbInit 失败:', e.message);
      }
    } else {
      console.log('[App] ST 数据库模块不可用，跳过 IndexedDB 初始化');
    }

    // ---- 3. 加载角色卡 ----
    // 先加载并应用 UI，character_book 导入延迟到 WorldBook 初始化之后
    var pendingCharBookCard = await loadCharacterCard();

    // ---- 4. 业务模块 ----
    _safeInit('ChatRenderer', function () {
      if (typeof ChatRenderer !== 'undefined') ChatRenderer.init();
    });

    _safeInit('ChatInput', function () {
      if (typeof ChatInput !== 'undefined') ChatInput.init();
    });

    _safeInit('CharacterSettings', function () {
      if (typeof CharacterSettings !== 'undefined') CharacterSettings.init();
    });

    _safeInit('WorldBook', function () {
      if (typeof WorldBook !== 'undefined') WorldBook.init();
    });

    // WorldBook 初始化后再导入 character_book
    if (pendingCharBookCard) {
      _importCharacterBookDelayed(pendingCharBookCard);
    }

    // Regex 引擎 UI 初始化（右面板第4个 tab）
    _safeInit('RegexEngine UI', function () {
      if (window.ST && ST.RegexEngine && typeof ST.RegexEngine.initUI === 'function') {
        ST.RegexEngine.initUI();
      }
    });

    _safeInit('CharacterManager', function () {
      if (typeof CharacterManager !== 'undefined') CharacterManager.init();
    });

    _safeInit('CharacterEditor', function () {
      if (typeof CharacterEditor !== 'undefined') CharacterEditor.init();
    });

    // ---- 5. 全局状态默认值 ----
    if (typeof state !== 'undefined') {
      try {
        state.init({
          messages: [],
          showLeftPanel: true,
          showRightPanel: true,
          gameVariables: {},
        });
      } catch (e) {
        console.warn('[App] state.init 失败:', e.message);
      }
    }

    // ---- 6. 游戏模式 ----
    if (window.ST && ST.GameMode && typeof ST.GameMode.init === 'function') {
      try {
        ST.GameMode.init();
        console.log('[App] ST.GameMode 已初始化');
      } catch (e) {
        console.warn('[App] ST.GameMode.init 失败:', e.message);
      }
    }

    // ---- 7. 插件系统 onInit 钩子 ----
    if (window.ST && ST.Plugins && typeof ST.Plugins.call === 'function') {
      try {
        ST.Plugins.call('onInit');
        console.log('[App] 插件 onInit 钩子已调用');
      } catch (e) {
        console.warn('[App] 插件 onInit 失败:', e.message);
      }
    }

    console.log('[App] 初始化完成');
  }

  /**
   * 加载角色卡
   *
   * 加载顺序：
   * 1. 优先从 localStorage 读取已保存的角色卡
   * 2. 若不存在，尝试 fetch('data/qhl.json')
   * 3. 通过 importCharacterCard 规范化为内部格式
   * 4. 应用角色卡到 UI（左侧面板、右侧设定表单）
   * 5. 返回原始 card 对象供后续 character_book 导入
   *
   * @returns {Promise<Object|null>} 返回原始 card 对象（含 character_book 数据），供延迟导入
   */
  async function loadCharacterCard() {
    try {
      var rawCard = null;

      // 尝试从 storage 加载
      if (typeof window.storage !== 'undefined') {
        rawCard = window.storage.get('character_card');
      }

      // 不从文件自动加载 — 用户自行导入角色卡

      if (!rawCard) return null;

      // 通过 importCharacterCard 规范化为内部格式
      var card;
      if (window.ST && ST.Importer && typeof ST.Importer.importCharacterCard === 'function') {
        card = ST.Importer.importCharacterCard(rawCard);
      } else {
        card = rawCard;
      }

      // 应用角色卡到 UI（使用规范化后的 card）
      if (window.ST && ST.Importer && typeof ST.Importer.applyCharacterCard === 'function') {
        try {
          ST.Importer.applyCharacterCard(card);
        } catch (e) {
          console.warn('[App] 应用角色卡失败:', e.message);
        }
      }

      // 返回原始数据供后续 character_book 导入
      return rawCard;

    } catch (e) {
      console.warn('[App] loadCharacterCard 失败:', e.message);
      return null;
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * 安全初始化 — 包装在 try/catch 中
   * @param {string} name — 模块名称（用于日志）
   * @param {Function} fn — 初始化函数
   * @private
   */
  function _safeInit(name, fn) {
    try {
      fn();
    } catch (e) {
      console.warn('[App] ' + name + '.init 失败:', e.message);
    }
  }

  /**
   * 从角色卡数据中提取 character_book 并导入到世界书（延迟导入版本）
   *
   * 仅在应用初始化时调用 — WorldBook 模块尚未就绪。
   * 后续角色卡导入由 ST.Importer.applyCharacterCard 直接处理。
   *
   * @param {Object} card — 角色卡原始 JSON 对象
   * @private
   */
  function _importCharacterBookDelayed(card) {
    try {
      // 提取 character_book
      var data = card.data || card;
      var charBook;

      if (data.character_book && typeof data.character_book === 'object') {
        charBook = data.character_book;
      } else if (card.character_book && typeof card.character_book === 'object') {
        charBook = card.character_book;
      }

      if (!charBook) return;

      // 委托给 ST.Importer.importCardWorldBook（如果可用）
      if (window.ST && ST.Importer && typeof ST.Importer.importCardWorldBook === 'function') {
        var charName = data.name || card.name || '角色';
        ST.Importer.importCardWorldBook(charBook, charName);
        return;
      }

      // 回退: 使用旧的内联转换逻辑（ST.Importer 不可用时）
      _importCharacterBookFallback(card);

    } catch (e) {
      console.warn('[App] 导入 character_book 失败:', e.message);
    }
  }

  /**
   * 回退逻辑：当 ST.Importer 不可用时，使用内联方式导入 world book。
   * @param {Object} card
   * @private
   */
  function _importCharacterBookFallback(card) {
    var data = card.data || card;
    var charBook = data.character_book || card.character_book;
    if (!charBook) return;

    var rawEntries;
    if (Array.isArray(charBook.entries)) {
      rawEntries = charBook.entries;
    } else if (charBook.entries && typeof charBook.entries === 'object') {
      rawEntries = Object.values(charBook.entries);
    } else {
      return;
    }
    if (!rawEntries || rawEntries.length === 0) return;

    var convertedEntries = [];
    for (var i = 0; i < rawEntries.length; i++) {
      var e = rawEntries[i];
      if (e.disable || e.excluded) continue;

      convertedEntries.push({
        name: e.comment || (e.key ? e.key.join(', ') : '导入条目 ' + (i + 1)),
        keywords: e.key || e.keys || e.keywords || [],
        content: e.content || '',
        weight: e.weight || 50,
        insertPosition: _mapPosition(e.position, e.insertPosition),
        depth: e.depth || 0,
        outletName: e.outletName || '',
        triggerCondition: e.constant ? 'always' :
          (e.useProbability ? 'probability' : 'keyword'),
        enabled: true,
        order: i,
      });
    }

    if (convertedEntries.length === 0) return;

    if (typeof WorldBook !== 'undefined' && WorldBook.entries) {
      var existingNames = new Set();
      WorldBook.entries.forEach(function (e) { existingNames.add(e.name); });

      var addedCount = 0;
      convertedEntries.forEach(function (e) {
        if (!existingNames.has(e.name)) {
          WorldBook.entries.push(e);
          addedCount++;
        }
      });

      if (addedCount > 0) {
        WorldBook.save();
        WorldBook.render();
        console.log('[App] 导入了 ' + addedCount + ' 条角色卡世界书条目');
      }
    }
  }

  /**
   * 映射位置值（兼容 numeric 和 string 形式）
   * @param {number|string} position
   * @param {string} [fallback]
   * @returns {string}
   * @private
   */
  function _mapPosition(position, fallback) {
    var numToStr = {
      0: 'before_char',
      1: 'after_char',
      2: 'before_example',
      3: 'after_example',
      4: 'at_depth',
      5: 'example_msg_top',
      6: 'example_msg_bottom',
      7: 'outlet',
    };

    if (typeof position === 'number') return numToStr[position] || 'before_char';
    if (typeof position === 'string') return position;
    if (typeof fallback === 'string') return fallback;
    return 'before_char';
  }

  // ===========================================================================
  // Export
  // ===========================================================================

  return {
    init: init,
    loadCharacterCard: loadCharacterCard,
  };
})();

// =============================================================================
// 自动启动 — DOMContentLoaded
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {
  App.init().catch(function (e) {
    console.error('[App] 初始化失败:', e.message);
  });
});
