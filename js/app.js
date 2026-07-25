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
    await loadCharacterCard();

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

    console.log('[App] 初始化完成');
  }

  /**
   * 加载角色卡
   *
   * 加载顺序：
   * 1. 优先从 localStorage 读取已保存的角色卡
   * 2. 若不存在，尝试 fetch('data/qhl.json')
   * 3. 应用角色卡到 UI（左侧面板、右侧设定表单）
   * 4. 提取 character_book 并导入为世界书
   *
   * @returns {Promise<void>}
   */
  async function loadCharacterCard() {
    try {
      var card = null;

      // 尝试从 storage 加载
      if (typeof window.storage !== 'undefined') {
        card = window.storage.get('character_card');
      }

      // 不存在则从 JSON 文件加载
      if (!card) {
        try {
          var resp = await fetch('data/qhl.json');
          if (resp.ok) {
            card = await resp.json();
            if (typeof window.storage !== 'undefined') {
              window.storage.set('character_card', card);
            }
            console.log('[App] 从 data/qhl.json 加载了默认角色卡');
          }
        } catch (e) {
          console.warn('[App] 无法加载默认角色卡:', e.message);
          return;
        }
      }

      if (!card) return;

      // 应用角色卡到 UI
      if (window.ST && ST.Importer && typeof ST.Importer.applyCharacterCard === 'function') {
        try {
          ST.Importer.applyCharacterCard(card);
        } catch (e) {
          console.warn('[App] 应用角色卡失败:', e.message);
        }
      }

      // 提取 character_book 并导入为世界书
      _importCharacterBook(card);

    } catch (e) {
      console.warn('[App] loadCharacterCard 失败:', e.message);
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
   * 从角色卡数据中提取 character_book 并导入到世界书
   *
   * SillyTavern 角色卡支持在 data.character_book 中包含世界书条目，
   * 此函数将其提取并导入到 WorldBook 模块中。
   *
   * @param {Object} card — 角色卡对象
   * @private
   */
  function _importCharacterBook(card) {
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

      // 提取 entries（可能是数组或对象）
      var rawEntries;
      if (Array.isArray(charBook.entries)) {
        rawEntries = charBook.entries;
      } else if (charBook.entries && typeof charBook.entries === 'object') {
        rawEntries = Object.values(charBook.entries);
      } else {
        return;
      }

      if (!rawEntries || rawEntries.length === 0) return;

      // 转换为 WorldBook 条目格式
      var convertedEntries = [];
      for (var i = 0; i < rawEntries.length; i++) {
        var e = rawEntries[i];
        // 跳过禁用或排除的条目
        if (e.disable || e.excluded) continue;

        convertedEntries.push({
          name: e.comment || e.key ? e.key.join(', ') : '导入条目 ' + (i + 1),
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

      // 合并到现有世界书条目
      if (typeof WorldBook !== 'undefined' && WorldBook.entries) {
        // 避免重复导入
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

      // 同时保存到 ST IndexedDB
      if (window.ST && typeof ST.saveLorebook === 'function') {
        var lorebook = {
          id: 'wb_character_book',
          name: (card.data && card.data.name || card.name || '角色') + '的世界书',
          description: '从角色卡导入的世界书',
          entries: convertedEntries,
          recursiveScanning: false,
          caseSensitive: false,
          matchWholeWords: false,
          updatedAt: Date.now(),
          createdAt: Date.now(),
        };
        ST.saveLorebook(lorebook).catch(function (err) {
          console.warn('[App] 保存角色卡世界书到 ST 失败:', err.message);
        });
      }

    } catch (e) {
      console.warn('[App] 导入 character_book 失败:', e.message);
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
