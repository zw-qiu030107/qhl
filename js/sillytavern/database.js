/**
 * IndexedDB Database Layer — Vanilla JavaScript
 * Wraps Dexie (loaded from CDN if not already present) and exposes
 * CRUD operations for lorebooks, presets, settings, and chats.
 *
 * @module silltyavern/database
 */
(function () {
  'use strict';

  // Ensure namespace
  window.ST = window.ST || {};

  // ========================================================================
  // Dexie Bootstrapping
  // ========================================================================

  var DEXIE_CDN = 'https://unpkg.com/dexie@3/dist/dexie.js';
  var _dbInstance = null;

  /**
   * Ensure Dexie is available on window. Loads from CDN if missing.
   * @returns {Promise<void>}
   */
  async function ensureDexie() {
    if (window.Dexie) return;
    // Already loading — wait for it
    if (ensureDexie._loading) {
      return ensureDexie._loading;
    }
    ensureDexie._loading = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = DEXIE_CDN;
      script.onload = function () {
        if (!window.Dexie) {
          reject(new Error('Dexie failed to initialize after CDN load'));
        } else {
          resolve();
        }
      };
      script.onerror = function () {
        reject(new Error('Failed to load Dexie from CDN: ' + DEXIE_CDN));
      };
      document.head.appendChild(script);
    });
    return ensureDexie._loading;
  }

  // ========================================================================
  // Database Class (plain constructor)
  // ========================================================================

  var DB_NAME = ST.DB_NAME || 'SillyTavernWebDB';
  var DB_VERSION = ST.DB_VERSION || 3;

  /**
   * @constructor
   */
  function STDatabase() {
    var db = new window.Dexie(DB_NAME);

    // v1–v3 use the same store schema; v3 upgrade fills missing defaults
    db.version(1).stores({
      lorebooks: 'id, name, updatedAt',
      presets:   'id, name, updatedAt',
      settings:  'key',
      chats:     'id, name, updatedAt',
    });
    db.version(2).stores({
      lorebooks: 'id, name, updatedAt',
      presets:   'id, name, updatedAt',
      settings:  'key',
      chats:     'id, name, updatedAt',
    });
    db.version(3).stores({
      lorebooks: 'id, name, updatedAt',
      presets:   'id, name, updatedAt',
      settings:  'key',
      chats:     'id, name, updatedAt',
    }).upgrade(async function (tx) {
      var settings = await tx.table('settings').toCollection().toArray();
      for (var i = 0; i < settings.length; i++) {
        var s = settings[i];
        if (s.uiMode === undefined)    s.uiMode = 'game';
        if (s.customTags === undefined) s.customTags = ST.DEFAULT_TAGS ? ST.DEFAULT_TAGS.slice() : ['maintext','option','sum','vars','thinking','think'];
        if (s.thinkingDisplay === undefined) s.thinkingDisplay = 'fold';
        if (s.formatPromptTemplate === undefined) s.formatPromptTemplate = '';
        if (s.api && s.api.secondary === undefined) {
          s.api.secondary = { enabled: false, baseUrl: '', apiKey: '', model: '' };
        }
        await tx.table('settings').put(s);
      }
    });

    this._db = db;
    this.ready = true;
  }

  STDatabase.prototype.lorebooks = function () { return this._db.table('lorebooks'); };
  STDatabase.prototype.presets   = function () { return this._db.table('presets');   };
  STDatabase.prototype.settings  = function () { return this._db.table('settings');  };
  STDatabase.prototype.chats     = function () { return this._db.table('chats');     };

  // ========================================================================
  // Initialization
  // ========================================================================

  /**
   * Get (or create) the singleton database instance.
   * @returns {Promise<STDatabase>}
   */
  async function getDatabase() {
    await ensureDexie();
    if (!_dbInstance) {
      _dbInstance = new STDatabase();
    }
    return _dbInstance;
  }

  /**
   * Initialize the database — seed default preset & settings if empty.
   * @returns {Promise<void>}
   */
  ST.dbInit = async function () {
    var db = await getDatabase();

    // Seed default preset if presets table is empty
    var presetCount = await db._db.presets.count();
    if (presetCount === 0) {
      var defaultPreset = ST.createDefaultPreset ? ST.createDefaultPreset() : {};
      await db._db.presets.add(Object.assign({}, defaultPreset, {
        id: crypto.randomUUID ? crypto.randomUUID() : _uuidv4(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
    }

    // Seed settings if empty
    var settingsCount = await db._db.settings.count();
    if (settingsCount === 0) {
      var defaults = ST.getDefaultSettings ? ST.getDefaultSettings() : ST.DEFAULT_SETTINGS || {};
      await db._db.settings.put(Object.assign({}, defaults, { key: 'main' }));
    }
  };

  // ========================================================================
  // CRUD — Lorebooks
  // ========================================================================

  /** @returns {Promise<Object[]>} */
  ST.getLorebooks = async function () {
    var db = await getDatabase();
    return db._db.lorebooks.toArray();
  };

  /**
   * @param {Object} lorebook
   * @returns {Promise<string>} lorebook id
   */
  ST.saveLorebook = async function (lorebook) {
    var db = await getDatabase();
    await db._db.lorebooks.put(lorebook);
    return lorebook.id;
  };

  /**
   * @param {string} id
   * @returns {Promise<void>}
   */
  ST.deleteLorebook = async function (id) {
    var db = await getDatabase();
    await db._db.lorebooks.delete(id);
  };

  // ========================================================================
  // CRUD — Presets
  // ========================================================================

  /** @returns {Promise<Object[]>} */
  ST.getPresets = async function () {
    var db = await getDatabase();
    return db._db.presets.toArray();
  };

  /**
   * @param {Object} preset
   * @returns {Promise<string>} preset id
   */
  ST.savePreset = async function (preset) {
    var db = await getDatabase();
    await db._db.presets.put(preset);
    return preset.id;
  };

  /**
   * @param {string} id
   * @returns {Promise<void>}
   */
  ST.deletePreset = async function (id) {
    var db = await getDatabase();
    await db._db.presets.delete(id);
  };

  // ========================================================================
  // CRUD — Settings (single row with key='main')
  // ========================================================================

  /** @returns {Promise<Object|undefined>} */
  ST.getSettings = async function () {
    var db = await getDatabase();
    var all = await db._db.settings.toArray();
    return all[0];
  };

  /**
   * @param {Object} settings
   * @returns {Promise<void>}
   */
  ST.saveSettings = async function (settings) {
    var db = await getDatabase();
    await db._db.settings.put(Object.assign({}, settings, { key: 'main' }));
  };

  // ========================================================================
  // CRUD — Chats
  // ========================================================================

  /** @returns {Promise<Object[]>} */
  ST.getChats = async function () {
    var db = await getDatabase();
    return db._db.chats.toArray();
  };

  /**
   * @param {Object} chat
   * @returns {Promise<string>} chat id
   */
  ST.saveChat = async function (chat) {
    var db = await getDatabase();
    await db._db.chats.put(chat);
    return chat.id;
  };

  /**
   * @param {string} id
   * @returns {Promise<void>}
   */
  ST.deleteChat = async function (id) {
    var db = await getDatabase();
    await db._db.chats.delete(id);
  };

  // ========================================================================
  // Chat Variables
  // ========================================================================

  /**
   * Update variables for a specific chat session.
   * @param {string} chatId
   * @param {Object<string,*>} variables
   * @returns {Promise<void>}
   */
  ST.setChatVariables = async function (chatId, variables) {
    var db = await getDatabase();
    var chat = await db._db.chats.get(chatId);
    if (!chat) return;
    chat.variables = variables;
    chat.updatedAt = Date.now();
    await db._db.chats.put(chat);
  };

  // ========================================================================
  // Backup / Restore
  // ========================================================================

  /**
   * Export all data as a FullBackup object.
   * @returns {Promise<{version:number, exportedAt:number, lorebooks:Object[],
   *   presets:Object[], settings:Object[], chats:Object[]}>}
   */
  ST.exportAllData = async function () {
    var db = await getDatabase();
    var results = await Promise.all([
      db._db.lorebooks.toArray(),
      db._db.presets.toArray(),
      db._db.settings.toArray(),
      db._db.chats.toArray(),
    ]);
    return {
      version: DB_VERSION,
      exportedAt: Date.now(),
      lorebooks: results[0],
      presets:   results[1],
      settings:  results[2],
      chats:     results[3],
    };
  };

  /**
   * Import a FullBackup, replacing all current data.
   * @param {{version:number, lorebooks:Object[], presets:Object[],
   *   settings:Object[], chats:Object[]}} backup
   * @returns {Promise<void>}
   */
  ST.importAllData = async function (backup) {
    if (!backup || typeof backup !== 'object') {
      throw new Error('备份格式无效');
    }
    var db = await getDatabase();
    await db._db.transaction('rw',
      db._db.lorebooks, db._db.presets, db._db.settings, db._db.chats,
      async function () {
        await db._db.lorebooks.clear();
        await db._db.presets.clear();
        await db._db.settings.clear();
        await db._db.chats.clear();
        if (Array.isArray(backup.lorebooks)) await db._db.lorebooks.bulkPut(backup.lorebooks);
        if (Array.isArray(backup.presets))   await db._db.presets.bulkPut(backup.presets);
        if (Array.isArray(backup.settings))  await db._db.settings.bulkPut(backup.settings);
        if (Array.isArray(backup.chats))     await db._db.chats.bulkPut(backup.chats);
      }
    );
  };

  /**
   * Clear all data and re-create the database.
   * @returns {Promise<void>}
   */
  ST.clearAllData = async function () {
    var db = await getDatabase();
    await db._db.delete();
    _dbInstance = null;
  };

  // ========================================================================
  // Helpers
  // ========================================================================

  /**
   * Generate a simple UUID v4 (fallback when crypto.randomUUID is unavailable).
   * @returns {string}
   * @private
   */
  function _uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0,
          v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  console.log('[ST.database] Database layer initialized');
})();
