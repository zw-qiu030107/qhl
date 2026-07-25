/**
 * SillyTavern Import / Export Adapter — Vanilla JavaScript
 *
 * Converts between SillyTavern file formats (lorebook v2/v3, preset JSON,
 * character cards v2/v3, PNG-embedded cards) and the internal application
 * data model.
 *
 * @namespace ST.Importer
 * @module sillytavern/importer
 */
(function () {
  'use strict';

  // Ensure namespace
  window.ST = window.ST || {};

  // =========================================================================
  // Position Maps (numeric <-> string)
  // =========================================================================

  /**
   * SillyTavern numeric position values mapped to internal string positions.
   * @type {Object<number, string>}
   */
  var POSITION_MAP = {
    0: 'before_char',
    1: 'after_char',
    2: 'before_example',
    3: 'after_example',
    4: 'at_depth',
    5: 'example_msg_top',
    6: 'example_msg_bottom',
    7: 'outlet',
  };

  /**
   * Reverse lookup: internal string position to ST numeric position.
   * @type {Object<string, number>}
   */
  var REVERSE_POSITION_MAP = {
    'before_char': 0,
    'after_char': 1,
    'before_example': 2,
    'after_example': 3,
    'at_depth': 4,
    'example_msg_top': 5,
    'example_msg_bottom': 6,
    'outlet': 7,
  };

  // =========================================================================
  // Selective Logic Maps (numeric <-> string)
  // =========================================================================

  /**
   * ST numeric selective logic values mapped to internal string values.
   * @type {Object<number, string>}
   */
  var LOGIC_MAP = {
    0: 'and_any',
    1: 'not_all',
    2: 'not_any',
    3: 'and_all',
  };

  /**
   * Reverse lookup: internal string logic to ST numeric logic.
   * @type {Object<string, number>}
   */
  var REVERSE_LOGIC_MAP = {
    'and_any': 0,
    'not_all': 1,
    'not_any': 2,
    'and_all': 3,
  };

  // =========================================================================
  // Internal Helpers
  // =========================================================================

  /**
   * Generate a short unique ID string.
   * Uses timestamp + random for collision resistance.
   *
   * @returns {string}
   */
  function generateUID() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Generate a UUID v4 string (prefers crypto.randomUUID).
   *
   * @returns {string}
   */
  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Convert a ST-format lorebook entry to an internal entry.
   *
   * @param {Object} rawEntry — Entry from ST lorebook JSON
   * @returns {Object} Internal entry object
   * @private
   */
  function _convertEntry(rawEntry) {
    return {
      id: generateUUID(),
      keys: rawEntry.key || [],
      secondaryKeys: rawEntry.keysecondary || [],
      content: rawEntry.content || '',
      comment: typeof rawEntry.comment === 'string' ? rawEntry.comment : '',
      order: rawEntry.order != null ? rawEntry.order : 100,
      position: POSITION_MAP[rawEntry.position] || POSITION_MAP[1] || 'after_char',
      depth: rawEntry.depth != null ? rawEntry.depth : null,
      role: rawEntry.role != null ? rawEntry.role : 0,
      selective: rawEntry.selective != null ? rawEntry.selective : false,
      selectiveLogic: LOGIC_MAP[rawEntry.selectiveLogic] || LOGIC_MAP[1] || 'not_all',
      constant: rawEntry.constant != null ? rawEntry.constant : false,
      probability: rawEntry.useProbability ? (rawEntry.probability != null ? rawEntry.probability : 100) : 100,
      useProbability: rawEntry.useProbability != null ? rawEntry.useProbability : false,
      addMemo: rawEntry.addMemo != null ? rawEntry.addMemo : false,
      sticky: rawEntry.sticky != null ? rawEntry.sticky : 0,
      cooldown: rawEntry.cooldown != null ? rawEntry.cooldown : 0,
      delay: rawEntry.delay != null ? rawEntry.delay : 0,
      weight: rawEntry.weight != null ? rawEntry.weight : 100,
      scanDepth: rawEntry.scanDepth != null ? rawEntry.scanDepth : 0,
      caseSensitive: rawEntry.caseSensitive != null ? rawEntry.caseSensitive : false,
      matchWholeWords: rawEntry.matchWholeWords != null ? rawEntry.matchWholeWords : false,
      excludeRecursion: rawEntry.excludeRecursion != null ? rawEntry.excludeRecursion : false,
      preventRecursion: rawEntry.preventRecursion != null ? rawEntry.preventRecursion : false,
      useGroupScoring: rawEntry.useGroupScoring != null ? rawEntry.useGroupScoring : false,
      matchPersonaDescription: rawEntry.matchPersonaDescription != null ? rawEntry.matchPersonaDescription : false,
      matchCharacterDescription: rawEntry.matchCharacterDescription != null ? rawEntry.matchCharacterDescription : false,
      matchCharacterPersonality: rawEntry.matchCharacterPersonality != null ? rawEntry.matchCharacterPersonality : false,
      matchCharacterDepthPrompt: rawEntry.matchCharacterDepthPrompt != null ? rawEntry.matchCharacterDepthPrompt : false,
      matchScenario: rawEntry.matchScenario != null ? rawEntry.matchScenario : false,
      matchCreatorNotes: rawEntry.matchCreatorNotes != null ? rawEntry.matchCreatorNotes : false,
      group: rawEntry.group || '',
      decorators: rawEntry.decorators || [],
      characterFilter: rawEntry.characterFilter || { isExclude: false, names: [], tags: [] },
    };
  }

  /**
   * Convert an internal entry to ST-format entry.
   *
   * @param {Object} entry — Internal entry
   * @param {number} index — Index for uid assignment
   * @returns {Object} ST-format entry
   * @private
   */
  function _reverseConvertEntry(entry, index) {
    return {
      uid: index,
      key: entry.keys || [],
      keysecondary: entry.secondaryKeys || [],
      comment: entry.comment || (entry.content ? entry.content.slice(0, 50) : ''),
      content: entry.content || '',
      constant: entry.constant != null ? entry.constant : false,
      selective: entry.selective != null ? entry.selective : false,
      selectiveLogic: (REVERSE_LOGIC_MAP[entry.selectiveLogic] != null ? REVERSE_LOGIC_MAP[entry.selectiveLogic] : 1),
      addMemo: entry.addMemo != null ? entry.addMemo : false,
      order: entry.order != null ? entry.order : 100,
      position: REVERSE_POSITION_MAP[entry.position] != null ? REVERSE_POSITION_MAP[entry.position] : 1,
      role: entry.role != null ? entry.role : 0,
      disable: false,
      probability: entry.probability != null ? entry.probability : 100,
      depth: entry.depth != null ? entry.depth : 4,
      group: entry.group || '',
      useProbability: entry.useProbability != null ? entry.useProbability : (entry.probability < 100),
      excluded: false,
      sticky: entry.sticky != null ? entry.sticky : 0,
      cooldown: entry.cooldown != null ? entry.cooldown : 0,
      delay: entry.delay != null ? entry.delay : 0,
      weight: entry.weight != null ? entry.weight : 100,
      scanDepth: entry.scanDepth != null ? entry.scanDepth : 0,
      caseSensitive: entry.caseSensitive != null ? entry.caseSensitive : false,
      matchWholeWords: entry.matchWholeWords != null ? entry.matchWholeWords : false,
      excludeRecursion: entry.excludeRecursion != null ? entry.excludeRecursion : false,
      preventRecursion: entry.preventRecursion != null ? entry.preventRecursion : false,
      useGroupScoring: entry.useGroupScoring != null ? entry.useGroupScoring : false,
      matchPersonaDescription: entry.matchPersonaDescription != null ? entry.matchPersonaDescription : false,
      matchCharacterDescription: entry.matchCharacterDescription != null ? entry.matchCharacterDescription : false,
      matchCharacterPersonality: entry.matchCharacterPersonality != null ? entry.matchCharacterPersonality : false,
      matchCharacterDepthPrompt: entry.matchCharacterDepthPrompt != null ? entry.matchCharacterDepthPrompt : false,
      matchScenario: entry.matchScenario != null ? entry.matchScenario : false,
      matchCreatorNotes: entry.matchCreatorNotes != null ? entry.matchCreatorNotes : false,
      decorators: entry.decorators || [],
      characterFilter: entry.characterFilter || { isExclude: false, names: [], tags: [] },
    };
  }

  // =========================================================================
  // Lorebook Import / Export
  // =========================================================================

  /**
   * Import a SillyTavern-format lorebook JSON into the internal format.
   * Supports both v2 and v3 spec lorebook structures.
   *
   * @param {Object} data — ST lorebook JSON (with .entries, .name,
   *   .description, .settings)
   * @returns {Object} Internal lorebook object (without id/createdAt/updatedAt
   *   — those are assigned by the database layer)
   *
   * @example
   * var internalLb = ST.Importer.importLorebook(stLorebookJson);
   * // internalLb.entries[i].position is a string like 'before_char'
   * // internalLb.entries[i].selectiveLogic is a string like 'and_any'
   */
  function importLorebook(data) {
    if (!data || !data.entries) {
      return {
        name: '导入的世界书',
        description: '',
        entries: [],
        recursiveScanning: false,
        caseSensitive: false,
        matchWholeWords: false,
      };
    }

    var rawEntries = Object.values(data.entries || {});
    var entries = [];

    for (var i = 0; i < rawEntries.length; i++) {
      var e = rawEntries[i];

      // Skip disabled or excluded entries
      if (e.disable || e.excluded) {
        continue;
      }

      entries.push(_convertEntry(e));
    }

    return {
      name: data.name || '导入的世界书',
      description: typeof data.description === 'string' ? data.description : '',
      entries: entries,
      recursiveScanning: !!(data.settings && data.settings.recursive_scanning),
      caseSensitive: !!(data.settings && data.settings.case_sensitive),
      matchWholeWords: !!(data.settings && data.settings.match_whole_words),
    };
  }

  /**
   * Export an internal lorebook to SillyTavern-compatible JSON.
   *
   * @param {Object} lorebook — Internal lorebook object
   * @returns {Object} ST-format lorebook JSON ready for file export
   */
  function exportLorebook(lorebook) {
    if (!lorebook) {
      return { name: '', description: '', entries: {}, settings: {} };
    }

    var entries = {};

    for (var i = 0; i < lorebook.entries.length; i++) {
      entries[String(i)] = _reverseConvertEntry(lorebook.entries[i], i);
    }

    return {
      name: lorebook.name || '',
      description: lorebook.description || '',
      entries: entries,
      settings: {
        recursive_scanning: lorebook.recursiveScanning || false,
        case_sensitive: lorebook.caseSensitive || false,
        match_whole_words: lorebook.matchWholeWords || false,
      },
    };
  }

  // =========================================================================
  // Preset Import / Export
  // =========================================================================

  /**
   * Import a SillyTavern-format preset into the internal format.
   *
   * @param {Object} data — ST preset JSON
   * @returns {Object} Internal preset object (without id/createdAt/updatedAt)
   */
  function importPreset(data) {
    if (!data) {
      return { name: '导入的预设', description: '', settings: {} };
    }

    var name = data.preset || data.name || '导入的预设';
    return {
      name: name,
      description: typeof data.description === 'string' ? data.description : '',
      settings: data,
    };
  }

  /**
   * Export an internal preset to SillyTavern-compatible JSON.
   *
   * @param {Object} preset — Internal preset object
   * @returns {Object} ST-format preset JSON
   */
  function exportPreset(preset) {
    if (!preset) {
      return {};
    }

    var out = {};
    var keys = Object.keys(preset.settings || {});
    for (var i = 0; i < keys.length; i++) {
      out[keys[i]] = preset.settings[keys[i]];
    }
    out.name = preset.name || '';
    out.description = preset.description || '';
    return out;
  }

  // =========================================================================
  // Multi-Import
  // =========================================================================

  /**
   * Import multiple lorebook JSON objects at once.
   * Each input is an object with a `fileName` and a `json` property.
   *
   * @param {Array<{fileName: string, json: Object}>} inputs
   * @returns {{
   *   successes: Array<{fileName: string, lorebook: Object}>,
   *   failures: Array<{fileName: string, error: string}>
   * }}
   */
  function importMultipleLorebooks(inputs) {
    var successes = [];
    var failures = [];

    if (!Array.isArray(inputs)) {
      return { successes: successes, failures: failures };
    }

    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      try {
        if (!input.json || typeof input.json !== 'object' || Array.isArray(input.json)) {
          throw new Error('Invalid lorebook JSON: expected an object');
        }
        var lb = importLorebook(input.json);
        successes.push({ fileName: input.fileName, lorebook: lb });
      } catch (e) {
        failures.push({ fileName: input.fileName, error: String(e.message || e) });
      }
    }

    return { successes: successes, failures: failures };
  }

  // =========================================================================
  // Lorebook Rename
  // =========================================================================

  /**
   * Create a copy of a lorebook with a new name.
   * The original object is not mutated.
   *
   * @param {Object} lb — Internal lorebook object
   * @param {string} newName — New name for the lorebook
   * @returns {Object} New lorebook object with updated name and timestamp
   */
  function renameLorebook(lb, newName) {
    if (!lb) {
      return null;
    }

    var copy = {};
    var keys = Object.keys(lb);
    for (var i = 0; i < keys.length; i++) {
      copy[keys[i]] = lb[keys[i]];
    }
    copy.name = newName;
    copy.updatedAt = Date.now();
    return copy;
  }

  // =========================================================================
  // File Helpers
  // =========================================================================

  /**
   * Open a file picker dialog and return the parsed JSON content.
   * The user is prompted to select a .json file.
   *
   * @returns {Promise<Object|null>} Parsed JSON content, or null if the
   *   user cancelled or the file could not be parsed
   */
  function importJsonFile() {
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';

      input.onchange = function (e) {
        var file = e.target.files ? e.target.files[0] : null;
        if (!file) {
          resolve(null);
          return;
        }

        var reader = new FileReader();
        reader.onload = function () {
          try {
            resolve(JSON.parse(reader.result));
          } catch (err) {
            resolve(null);
          }
        };
        reader.onerror = function () {
          resolve(null);
        };
        reader.readAsText(file);
      };

      input.click();
    });
  }

  /**
   * Trigger a file download of JSON data.
   *
   * @param {*} data — Data to serialize as JSON
   * @param {string} filename — Suggested download filename
   */
  function exportToJson(data, filename) {
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  // =========================================================================
  // Character Card Import / Export
  // =========================================================================

  /**
   * Import a SillyTavern character card JSON (v2 or v3 spec).
   * Normalizes the card to the internal representation regardless of
   * spec version.
   *
   * @param {Object} json — Raw character card JSON
   * @returns {Object} Normalized character card object with keys:
   *   spec, specVersion, name, description, personality, scenario,
   *   firstMes, mesExample, creatorNotes, systemPrompt,
   *   postHistoryInstructions, alternateGreetings, tags, creator,
   *   characterVersion, extensions, raw
   *
   * @example
   * var card = ST.Importer.importCharacterCard(v3CardJson);
   * console.log(card.name);          // Character name
   * console.log(card.personality);   // Personality description
   */
  function importCharacterCard(json) {
    if (!json) {
      return createEmptyCard();
    }

    var spec = json.spec || 'chara_card_v2';
    var data = json.data || json; // v3 wraps in .data, v2 is flat

    return {
      spec: spec,
      specVersion: json.spec_version || '2.0',
      name: data.name || json.name || '',
      description: data.description || json.description || '',
      personality: data.personality || json.personality || '',
      scenario: data.scenario || json.scenario || '',
      firstMes: data.first_mes || json.first_mes || '',
      mesExample: data.mes_example || json.mes_example || '',
      creatorNotes: data.creator_notes || json.creatorcomment || '',
      systemPrompt: data.system_prompt || '',
      postHistoryInstructions: data.post_history_instructions || '',
      alternateGreetings: data.alternate_greetings || [],
      tags: data.tags || json.tags || [],
      creator: data.creator || json.creator || '',
      characterVersion: data.character_version || '',
      extensions: data.extensions || json.extensions || {},
      // Raw v3 data block (for round-trip preservation)
      raw: data,
    };
  }

  /**
   * Create an empty character card with all fields defaulted.
   *
   * @returns {Object} Empty character card
   * @private
   */
  function createEmptyCard() {
    return {
      spec: 'chara_card_v3',
      specVersion: '3.0',
      name: '',
      description: '',
      personality: '',
      scenario: '',
      firstMes: '',
      mesExample: '',
      creatorNotes: '',
      systemPrompt: '',
      postHistoryInstructions: '',
      alternateGreetings: [],
      tags: [],
      creator: '',
      characterVersion: '',
      extensions: {},
      raw: {},
    };
  }

  /**
   * Export an internal character card to ST v3 spec JSON.
   *
   * @param {Object} card — Internal card object
   * @returns {Object} ST v3 spec JSON ready for file export
   */
  function exportCharacterCard(card) {
    if (!card) {
      return { spec: 'chara_card_v3', spec_version: '3.0', data: {} };
    }

    return {
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: {
        name: card.name || '',
        description: card.description || '',
        personality: card.personality || '',
        scenario: card.scenario || '',
        first_mes: card.firstMes || '',
        mes_example: card.mesExample || '',
        creator_notes: card.creatorNotes || '',
        system_prompt: card.systemPrompt || '',
        post_history_instructions: card.postHistoryInstructions || '',
        alternate_greetings: card.alternateGreetings || [],
        tags: card.tags || [],
        creator: card.creator || '',
        character_version: card.characterVersion || '',
        extensions: card.extensions || {},
      },
    };
  }

  // =========================================================================
  // PNG Character Card Extraction
  // =========================================================================

  /**
   * Extract a character card JSON from a PNG file using the SillyTavern
   * PNG embedding convention (tEXt chunk with keyword "chara").
   *
   * The embedded data may be base64-encoded JSON or raw JSON text.
   *
   * @param {File} file — PNG file from a file input or drop event
   * @returns {Promise<Object>} Normalized character card object
   * @throws {Error} If the file is not a PNG, contains no chara data,
   *   or cannot be parsed
   *
   * @example
   * var file = event.target.files[0];
   * ST.Importer.extractCardFromPng(file)
   *   .then(function (card) { console.log(card.name); })
   *   .catch(function (err) { console.error(err.message); });
   */
  function extractCardFromPng(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type.includes('png')) {
        reject(new Error('仅支持 PNG 格式的角色卡图片'));
        return;
      }

      var reader = new FileReader();

      reader.onload = function () {
        try {
          var bytes = new Uint8Array(reader.result);
          var json = null;

          // Walk PNG chunks — skip 8-byte PNG signature
          var offset = 8;
          while (offset < bytes.length) {
            // Chunk length is a 4-byte big-endian integer
            var length = (bytes[offset] << 24)
                       | (bytes[offset + 1] << 16)
                       | (bytes[offset + 2] << 8)
                       | bytes[offset + 3];

            // Chunk type is 4 ASCII characters
            var type = String.fromCharCode(
              bytes[offset + 4],
              bytes[offset + 5],
              bytes[offset + 6],
              bytes[offset + 7]
            );

            if (type === 'tEXt') {
              var dataStart = offset + 8;

              // Find the null separator between keyword and content
              var nullIdx = -1;
              for (var j = dataStart; j < dataStart + length; j++) {
                if (bytes[j] === 0) {
                  nullIdx = j;
                  break;
                }
              }

              if (nullIdx > dataStart) {
                // Read keyword
                var keyword = '';
                for (var k = dataStart; k < nullIdx; k++) {
                  keyword += String.fromCharCode(bytes[k]);
                }

                if (keyword === 'chara') {
                  // Read content
                  var contentStart = nullIdx + 1;
                  var content = '';
                  for (var c = contentStart; c < dataStart + length; c++) {
                    content += String.fromCharCode(bytes[c]);
                  }

                  // Try base64 decode first, then raw JSON
                  try {
                    var decoded = atob(content);
                    json = JSON.parse(decoded);
                  } catch (e1) {
                    try {
                      json = JSON.parse(content);
                    } catch (e2) {
                      // Both attempts failed
                    }
                  }

                  if (json) {
                    break;
                  }
                }
              }
            }

            // Advance to next chunk: 4 (length) + 4 (type) + length + 4 (CRC)
            offset += 12 + length;
          }

          if (json) {
            resolve(importCharacterCard(json));
          } else {
            reject(new Error('PNG 中未找到角色卡数据（chara 块）'));
          }
        } catch (e) {
          reject(new Error('解析 PNG 失败: ' + (e.message || e)));
        }
      };

      reader.onerror = function () {
        reject(new Error('读取文件失败'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  // =========================================================================
  // Apply Character Card to UI
  // =========================================================================

  /**
   * Apply a character card to the application UI and storage.
   * Updates the left sidebar display, right-panel form fields,
   * localStorage, and the ST database settings.
   *
   * @param {Object} card — Parsed character card (from importCharacterCard)
   *
   * @example
   * var card = ST.Importer.importCharacterCard(json);
   * ST.Importer.applyCharacterCard(card);
   */
  function applyCharacterCard(card) {
    if (!card) {
      return;
    }

    // 如果传入的是原始 JSON（有 .data 包裹），先通过 importCharacterCard 规范化
    if (card.data && typeof card.data === 'object' && !card.raw) {
      card = importCharacterCard(card);
    }

    /**
     * Helper to safely get a DOM element by id.
     * @param {string} id
     * @returns {HTMLElement|null}
     */
    function getEl(id) {
      return document.getElementById(id);
    }

    // 从性格文本中提取信息
    var extracted = _extractPersonalityInfo(card.personality || '');

    // --- Left sidebar display ---
    if (getEl('char-name-display')) {
      getEl('char-name-display').textContent = card.name || '';
    }
    if (getEl('s-name')) {
      getEl('s-name').textContent = card.name || '';
    }
    if (getEl('s-nickname') && extracted.nickname) {
      getEl('s-nickname').textContent = extracted.nickname;
    }
    if (getEl('s-age') && extracted.age) {
      getEl('s-age').textContent = extracted.age;
    }
    if (getEl('s-zodiac') && extracted.zodiac) {
      getEl('s-zodiac').textContent = extracted.zodiac;
    }
    if (getEl('s-gender') && extracted.gender) {
      getEl('s-gender').textContent = extracted.gender;
    }
    if (getEl('s-height') && extracted.height) {
      getEl('s-height').textContent = extracted.height;
    }
    if (getEl('s-weight') && extracted.weight) {
      getEl('s-weight').textContent = extracted.weight;
    }
    if (getEl('s-appearance') && extracted.appearance) {
      getEl('s-appearance').textContent = extracted.appearance;
    }

    // --- Right panel character settings form ---
    if (getEl('cs-name')) {
      getEl('cs-name').value = card.name || '';
    }
    if (getEl('cs-nickname')) {
      // 优先用 description，为空则用提取的昵称
      getEl('cs-nickname').value = card.description || extracted.nickname || '';
    }
    if (getEl('cs-age') && extracted.age) {
      getEl('cs-age').value = extracted.age;
    }
    if (getEl('cs-zodiac') && extracted.zodiac) {
      getEl('cs-zodiac').value = extracted.zodiac;
    }
    if (getEl('cs-personality')) {
      getEl('cs-personality').value = card.personality || '';
    }
    if (getEl('cs-background')) {
      getEl('cs-background').value = card.scenario || '';
    }
    if (getEl('cs-likes') && extracted.likes) {
      getEl('cs-likes').value = extracted.likes;
    }
    if (getEl('cs-relationship') && extracted.relationship) {
      getEl('cs-relationship').value = extracted.relationship;
    }

    // --- Save to localStorage ---
    if (window.storage && typeof window.storage.set === 'function') {
      window.storage.set('character_card', card);
    }

    // --- Sync character name to ST database settings ---
    if (ST.getSettings && ST.saveSettings) {
      ST.getSettings().then(function (s) {
        if (s) {
          s.characterName = card.name;
          return ST.saveSettings(s);
        }
      }).catch(function () {
        // Silently ignore errors during settings sync
      });
    }

    // --- Show notification ---
    if (window.notifications && typeof window.notifications.show === 'function') {
      window.notifications.show('success', '角色卡已加载', '已应用: ' + card.name);
    }
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  /**
   * 从性格文本中提取结构化信息（昵称、年龄、星座等）
   *
   * 解析类似 SillyTavern 角色卡 personality 字段中的结构化文本，
   * 提取可在左右面板显示的基本信息。
   *
   * @param {string} personalityText — 性格描述文本
   * @returns {Object} 提取的信息对象
   * @private
   */
  function _extractPersonalityInfo(personalityText) {
    var info = {};
    if (!personalityText || typeof personalityText !== 'string') return info;

    // 提取昵称: 姓名: XXX (昵称: YYY/ZZZ)
    var nicknameMatch = personalityText.match(/昵称[：:]\s*([^\n\r),，\)]+)/);
    if (nicknameMatch) {
      var nicks = nicknameMatch[1].split('/');
      info.nickname = nicks[0].trim();
    }

    // 提取属性行: 属性: 14岁/女/巨蟹座/初一
    var attrMatch = personalityText.match(/属性[：:]\s*([^\n\r]+)/);
    if (attrMatch) {
      var parts = attrMatch[1].split('/');
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i].trim();
        if (/\d+岁/.test(p) && !info.age) {
          info.age = p;
        }
        if (/^(男|女)$/.test(p) && !info.gender) {
          info.gender = p;
        }
        if (/(座)$/.test(p) && !info.zodiac) {
          info.zodiac = p;
        }
      }
    }

    // 提取体征: 体征: 148cm/38kg/...
    var bodyMatch = personalityText.match(/体征[：:]\s*([^\n\r]+)/);
    if (bodyMatch) {
      var bodyParts = bodyMatch[1].split('/');
      for (var j = 0; j < bodyParts.length; j++) {
        var bp = bodyParts[j].trim();
        if (/\d+cm/.test(bp) && !info.height) {
          info.height = bp;
        }
        if (/\d+kg/.test(bp) && !info.weight) {
          info.weight = bp;
        }
        if (!info.appearance && !/\d+(cm|kg)/.test(bp) && bp.length > 2) {
          info.appearance = bp;
        }
      }
    }

    // 提取外在: 外在: ...
    var extMatch = personalityText.match(/外在[：:]\s*([^\n\r]+)/);
    if (extMatch) {
      if (info.appearance) {
        info.appearance += '; ' + extMatch[1].trim();
      } else {
        info.appearance = extMatch[1].trim();
      }
    }

    // 提取喜好: 喜: ... 厌: ...
    var likesMatch = personalityText.match(/喜[：:]\s*([^\n\r]+)/);
    var dislikesMatch = personalityText.match(/厌[：:]\s*([^\n\r]+)/);
    if (likesMatch || dislikesMatch) {
      var likesText = '';
      if (likesMatch) likesText += '喜欢: ' + likesMatch[1].trim();
      if (dislikesMatch) likesText += (likesText ? '\n' : '') + '讨厌: ' + dislikesMatch[1].trim();
      info.likes = likesText;
    }

    // 提取人物关系
    var relSection = personalityText.match(/人物关系[\s\S]*?(?:\n\n|\n(?=[^\n]*[：:])|$)/);
    if (!relSection) {
      // 尝试匹配 "身份:" 和 "动态:"
      var identityMatch = personalityText.match(/身份[：:]\s*([^\n\r]+)/);
      var dynamicMatch = personalityText.match(/动态[：:]\s*([^\n\r]+)/);
      if (identityMatch || dynamicMatch) {
        var relText = '';
        if (identityMatch) relText += '身份: ' + identityMatch[1].trim();
        if (dynamicMatch) relText += (relText ? '\n' : '') + '动态: ' + dynamicMatch[1].trim();
        info.relationship = relText;
      }
    } else {
      info.relationship = relSection[0].replace(/人物关系[\s\S]*?\n/, '').trim();
    }

    return info;
  }

  // =========================================================================
  // Namespace Export
  // =========================================================================

  ST.Importer = {
    // Character cards
    importCharacterCard: importCharacterCard,
    exportCharacterCard: exportCharacterCard,
    extractCardFromPng: extractCardFromPng,
    applyCharacterCard: applyCharacterCard,

    // Lorebooks
    importLorebook: importLorebook,
    exportLorebook: exportLorebook,

    // Presets
    importPreset: importPreset,
    exportPreset: exportPreset,

    // Multi-import
    importMultipleLorebooks: importMultipleLorebooks,

    // Utilities
    renameLorebook: renameLorebook,
    importJsonFile: importJsonFile,
    exportToJson: exportToJson,

    // Maps
    POSITION_MAP: POSITION_MAP,
    REVERSE_POSITION_MAP: REVERSE_POSITION_MAP,
    LOGIC_MAP: LOGIC_MAP,
    REVERSE_LOGIC_MAP: REVERSE_LOGIC_MAP,
  };

  // =========================================================================
  // Init
  // =========================================================================

  console.log('[ST.importer] Import/export adapter initialized');
})();
