/**
 * IndexedDB Database Layer — Vanilla JavaScript
 *
 * Wraps Dexie.js (auto-loaded from CDN) and exposes a singleton database
 * with four object stores: lorebooks, presets, settings, chats.
 *
 * All public API methods live on the ST namespace. The Dexie singleton
 * is also exported as window.__st_db_instance for direct access by
 * other modules that need the raw Dexie instance.
 *
 * @module sillytavern/database
 */
(function () {
  'use strict';

  // Ensure namespace
  window.ST = window.ST || {};

  // =========================================================================
  // Constants
  // =========================================================================

  var DEXIE_CDN = 'https://unpkg.com/dexie@3/dist/dexie.js';
  var DB_NAME = ST.DB_NAME || 'SillyTavernWebDB';
  var DB_VERSION = ST.DB_VERSION || 3;

  // =========================================================================
  // Internal State
  // =========================================================================

  var _dbInstance = null;

  // =========================================================================
  // Dexie Bootstrapping (singleton loader)
  // =========================================================================

  /**
   * Ensure the Dexie library is available on `window`.
   * Loads from CDN if missing; subsequent calls wait for the same promise
   * so the script tag is only ever injected once.
   *
   * @returns {Promise<void>} Resolves when Dexie is ready
   */
  function ensureDexie() {
    if (window.Dexie) {
      return Promise.resolve();
    }

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

  // =========================================================================
  // UUID Generation (fallback)
  // =========================================================================

  /**
   * Generate a version-4 UUID string.
   * Uses crypto.randomUUID() when available; falls back to Math.random().
   *
   * @returns {string} UUID v4 string
   * @private
   */
  function _generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // =========================================================================
  // STDatabase Constructor
  // =========================================================================

  /**
   * Constructs the Dexie-backed database with four object stores.
   * Defines schema versions 1-3 with migration logic for v3 upgrades.
   *
   * @constructor
   */
  function STDatabase() {
    /** @type {Dexie} The raw Dexie database instance */
    this._db = new window.Dexie(DB_NAME);

    // ---- Version 1: initial schema ----
    this._db.version(1).stores({
      lorebooks: 'id, name, updatedAt',
      presets:   'id, name, updatedAt',
      settings:  'key',
      chats:     'id, name, updatedAt',
    });

    // ---- Version 2: same schema (compatibility) ----
    this._db.version(2).stores({
      lorebooks: 'id, name, updatedAt',
      presets:   'id, name, updatedAt',
      settings:  'key',
      chats:     'id, name, updatedAt',
    });

    // ---- Version 3: same schema + upgrade migration ----
    this._db.version(3).stores({
      lorebooks: 'id, name, updatedAt',
      presets:   'id, name, updatedAt',
      settings:  'key',
      chats:     'id, name, updatedAt',
    }).upgrade(async function (tx) {
      var settingsTable = tx.table('settings');
      var settings = await settingsTable.toCollection().toArray();

      for (var i = 0; i < settings.length; i++) {
        var s = settings[i];

        if (s.uiMode === undefined) {
          s.uiMode = 'game';
        }
        if (s.customTags === undefined) {
          s.customTags = ST.DEFAULT_TAGS ? ST.DEFAULT_TAGS.slice() : ['maintext', 'option', 'sum', 'vars', 'thinking', 'think'];
        }
        if (s.thinkingDisplay === undefined) {
          s.thinkingDisplay = 'fold';
        }
        if (s.formatPromptTemplate === undefined) {
          s.formatPromptTemplate = '';
        }
        if (s.api && s.api.secondary === undefined) {
          s.api.secondary = { enabled: false, baseUrl: '', apiKey: '', model: '' };
        }

        await settingsTable.put(s);
      }
    });

    this.ready = true;
  }

  // ---- Table accessor helpers ----

  /** @returns {Dexie.Table} */
  STDatabase.prototype.lorebooks = function () { return this._db.table('lorebooks'); };

  /** @returns {Dexie.Table} */
  STDatabase.prototype.presets = function () { return this._db.table('presets'); };

  /** @returns {Dexie.Table} */
  STDatabase.prototype.settings = function () { return this._db.table('settings'); };

  /** @returns {Dexie.Table} */
  STDatabase.prototype.chats = function () { return this._db.table('chats'); };

  // =========================================================================
  // Singleton Accessor
  // =========================================================================

  /**
   * Get (or lazily create) the singleton STDatabase instance.
   * Ensures Dexie is loaded before constructing.
   *
   * @returns {Promise<STDatabase>}
   */
  function getDatabase() {
    if (_dbInstance) {
      return Promise.resolve(_dbInstance);
    }
    return ensureDexie().then(function () {
      if (!_dbInstance) {
        _dbInstance = new STDatabase();
        // Also export for direct access by other modules
        window.__st_db_instance = _dbInstance;
      }
      return _dbInstance;
    });
  }

  // =========================================================================
  // Initialization
  // =========================================================================

  /**
   * Initialize the database — seeds a default preset and default settings
   * if the corresponding tables are empty.
   *
   * Should be called once during application startup.
   *
   * @returns {Promise<void>}
   */
  ST.dbInit = async function () {
    var db = await getDatabase();

    // Seed default preset
    var presetCount = await db._db.presets.count();
    if (presetCount === 0) {
      var defaultPreset = ST.createDefaultPreset ? ST.createDefaultPreset() : {};
      await db._db.presets.add(Object.assign({}, defaultPreset, {
        id: _generateUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
    }

    // Seed default settings
    var settingsCount = await db._db.settings.count();
    if (settingsCount === 0) {
      var defaults = ST.getDefaultSettings ? ST.getDefaultSettings() : (ST.DEFAULT_SETTINGS || {});
      await db._db.settings.put(Object.assign({}, defaults, { key: 'main' }));
    }
  };

  // =========================================================================
  // CRUD — Lorebooks
  // =========================================================================

  /**
   * Retrieve all lorebooks from the database.
   * @returns {Promise<Object[]>}
   */
  ST.getLorebooks = async function () {
    var db = await getDatabase();
    return db._db.lorebooks.toArray();
  };

  /**
   * Save (insert or update) a lorebook.
   * @param {Object} lorebook — the lorebook object (must include an `id` field)
   * @returns {Promise<string>} The lorebook id
   */
  ST.saveLorebook = async function (lorebook) {
    var db = await getDatabase();
    await db._db.lorebooks.put(lorebook);
    return lorebook.id;
  };

  /**
   * Delete a lorebook by id.
   * @param {string} id
   * @returns {Promise<void>}
   */
  ST.deleteLorebook = async function (id) {
    var db = await getDatabase();
    await db._db.lorebooks.delete(id);
  };

  // =========================================================================
  // CRUD — Presets
  // =========================================================================

  /**
   * Retrieve all presets from the database.
   * @returns {Promise<Object[]>}
   */
  ST.getPresets = async function () {
    var db = await getDatabase();
    return db._db.presets.toArray();
  };

  /**
   * Save (insert or update) a preset.
   * @param {Object} preset — the preset object (must include an `id` field)
   * @returns {Promise<string>} The preset id
   */
  ST.savePreset = async function (preset) {
    var db = await getDatabase();
    await db._db.presets.put(preset);
    return preset.id;
  };

  /**
   * Delete a preset by id.
   * @param {string} id
   * @returns {Promise<void>}
   */
  ST.deletePreset = async function (id) {
    var db = await getDatabase();
    await db._db.presets.delete(id);
  };

  // =========================================================================
  // CRUD — Settings
  // =========================================================================

  /**
   * Retrieve the application settings.
   * Currently stores a single row keyed 'main'.
   *
   * @returns {Promise<Object|undefined>}
   */
  ST.getSettings = async function () {
    var db = await getDatabase();
    return db._db.settings.get('main');
  };

  /**
   * Save application settings.
   * @param {Object} settings — settings object (keyed 'main' automatically)
   * @returns {Promise<void>}
   */
  ST.saveSettings = async function (settings) {
    var db = await getDatabase();
    await db._db.settings.put(Object.assign({}, settings, { key: 'main' }));
  };

  // =========================================================================
  // CRUD — Chats
  // =========================================================================

  /**
   * Retrieve all chat sessions from the database.
   * @returns {Promise<Object[]>}
   */
  ST.getChats = async function () {
    var db = await getDatabase();
    return db._db.chats.toArray();
  };

  /**
   * Save (insert or update) a chat session.
   * @param {Object} chat — the chat session object (must include an `id` field)
   * @returns {Promise<string>} The chat id
   */
  ST.saveChat = async function (chat) {
    var db = await getDatabase();
    await db._db.chats.put(chat);
    return chat.id;
  };

  /**
   * Delete a chat session by id.
   * @param {string} id
   * @returns {Promise<void>}
   */
  ST.deleteChat = async function (id) {
    var db = await getDatabase();
    await db._db.chats.delete(id);
  };

  // =========================================================================
  // Chat Variables
  // =========================================================================

  /**
   * Update the variables object for a specific chat session.
   * Fetches the chat, merges in the new variables, and persists.
   *
   * @param {string} chatId
   * @param {Object<string, *>} variables
   * @returns {Promise<void>}
   */
  ST.setChatVariables = async function (chatId, variables) {
    var db = await getDatabase();
    var chat = await db._db.chats.get(chatId);
    if (!chat) {
      return;
    }
    chat.variables = variables;
    chat.updatedAt = Date.now();
    await db._db.chats.put(chat);
  };

  // =========================================================================
  // Backup / Restore
  // =========================================================================

  /**
   * Export all data as a FullBackup object containing all four tables.
   *
   * @returns {Promise<{
   *   version: number,
   *   exportedAt: number,
   *   lorebooks: Object[],
   *   presets: Object[],
   *   settings: Object[],
   *   chats: Object[]
   * }>}
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
   * Import a FullBackup, replacing ALL current data in the database.
   * This operation runs inside a single Dexie transaction for atomicity.
   *
   * @param {{
   *   version: number,
   *   lorebooks: Object[],
   *   presets: Object[],
   *   settings: Object[],
   *   chats: Object[]
   * }} backup — the backup object to restore
   * @returns {Promise<void>}
   * @throws {Error} If the backup format is invalid
   */
  ST.importAllData = async function (backup) {
    if (!backup || typeof backup !== 'object') {
      throw new Error('备份格式无效');
    }

    var db = await getDatabase();

    await db._db.transaction(
      'rw',
      db._db.lorebooks,
      db._db.presets,
      db._db.settings,
      db._db.chats,
      async function () {
        // Clear all tables
        await db._db.lorebooks.clear();
        await db._db.presets.clear();
        await db._db.settings.clear();
        await db._db.chats.clear();

        // Bulk-write backup data (only if arrays are present)
        if (Array.isArray(backup.lorebooks)) { await db._db.lorebooks.bulkPut(backup.lorebooks); }
        if (Array.isArray(backup.presets))   { await db._db.presets.bulkPut(backup.presets); }
        if (Array.isArray(backup.settings))  { await db._db.settings.bulkPut(backup.settings); }
        if (Array.isArray(backup.chats))     { await db._db.chats.bulkPut(backup.chats); }
      }
    );
  };

  /**
   * Clear all data by deleting and re-creating the database.
   * WARNING: This is destructive and cannot be undone.
   *
   * @returns {Promise<void>}
   */
  ST.clearAllData = async function () {
    var db = await getDatabase();
    await db._db.delete();
    _dbInstance = null;
    window.__st_db_instance = null;
  };

  // =========================================================================
  // Export Singleton References
  // =========================================================================

  /**
   * Expose the STDatabase constructor so other modules can type-check
   * or instantiate (though getDatabase() should be preferred).
   * @type {Function}
   */
  window.STDatabase = STDatabase;

  /**
   * Expose the Dexie singleton getter for direct database access.
   * @type {Function}
   */
  window.getSTDatabase = getDatabase;

  // =========================================================================
  // Init
  // =========================================================================

  console.log('[ST.database] Database layer initialized');
})();
