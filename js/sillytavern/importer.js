/**
 * SillyTavern Import/Export Adapter
 *
 * Converts between SillyTavern lorebook/preset JSON formats and the
 * internal representation used by the app.
 *
 * @namespace ST.Importer
 */
window.ST = window.ST || {};

ST.Importer = (function () {
  'use strict';

  // ==================================================================
  // Position maps — ST numeric position ↔ internal string position
  // ==================================================================

  /** @type {Object<number, string>} */
  var POSITION_MAP = {
    0: 'before_char',
    1: 'after_char',
    2: 'before_example',
    3: 'after_example',
    4: 'at_depth',
    5: 'example_msg_top',
    6: 'example_msg_bottom',
    7: 'outlet'
  };

  /** @type {Object<string, number>} */
  var REVERSE_POSITION_MAP = {
    'before_char': 0,
    'after_char': 1,
    'before_example': 2,
    'after_example': 3,
    'at_depth': 4,
    'example_msg_top': 5,
    'example_msg_bottom': 6,
    'outlet': 7
  };

  // ==================================================================
  // Selective logic maps
  // ==================================================================

  /** @type {Object<number, string>} */
  var LOGIC_MAP = {
    0: 'and_any',
    1: 'not_all',
    2: 'not_any',
    3: 'and_all'
  };

  /** @type {Object<string, number>} */
  var REVERSE_LOGIC_MAP = {
    'and_any': 0,
    'not_all': 1,
    'not_any': 2,
    'and_all': 3
  };

  // ==================================================================
  // Lorebook import/export
  // ==================================================================

  /**
   * Import a SillyTavern-format lorebook JSON into the internal format.
   * Supports both v2 and v3 spec formats.
   *
   * @param {Object} data - ST lorebook JSON (with .entries, .name, .description, .settings)
   * @returns {Object} internal lorebook (without id/createdAt/updatedAt)
   */
  function importLorebook(data) {
    var rawEntries = Object.values(data.entries || {});
    var entries = [];

    for (var i = 0; i < rawEntries.length; i++) {
      var e = rawEntries[i];
      // Skip disabled or excluded entries
      if (e.disable || e.excluded) continue;

      entries.push({
        id: crypto.randomUUID ? crypto.randomUUID() : uid(),
        keys: e.key || [],
        secondaryKeys: e.keysecondary || [],
        content: e.content || '',
        comment: typeof e.comment === 'string' ? e.comment : '',
        order: e.order != null ? e.order : 100,
        position: POSITION_MAP[e.position] || POSITION_MAP[e.position != null ? e.position : 1] || 'after_char',
        depth: e.depth != null ? e.depth : null,
        role: e.role != null ? e.role : 0,
        selective: e.selective != null ? e.selective : false,
        selectiveLogic: LOGIC_MAP[e.selectiveLogic] || LOGIC_MAP[e.selectiveLogic != null ? e.selectiveLogic : 1] || 'not_all',
        constant: e.constant != null ? e.constant : false,
        probability: e.useProbability ? (e.probability != null ? e.probability : 100) : 100,
        useProbability: e.useProbability != null ? e.useProbability : false,
        addMemo: e.addMemo != null ? e.addMemo : false,
        sticky: e.sticky != null ? e.sticky : 0,
        cooldown: e.cooldown != null ? e.cooldown : 0,
        delay: e.delay != null ? e.delay : 0,
        weight: e.weight != null ? e.weight : 100,
        scanDepth: e.scanDepth != null ? e.scanDepth : 0,
        caseSensitive: e.caseSensitive != null ? e.caseSensitive : false,
        matchWholeWords: e.matchWholeWords != null ? e.matchWholeWords : false,
        excludeRecursion: e.excludeRecursion != null ? e.excludeRecursion : false,
        preventRecursion: e.preventRecursion != null ? e.preventRecursion : false,
        useGroupScoring: e.useGroupScoring != null ? e.useGroupScoring : false,
        matchPersonaDescription: e.matchPersonaDescription != null ? e.matchPersonaDescription : false,
        matchCharacterDescription: e.matchCharacterDescription != null ? e.matchCharacterDescription : false,
        matchCharacterPersonality: e.matchCharacterPersonality != null ? e.matchCharacterPersonality : false,
        matchCharacterDepthPrompt: e.matchCharacterDepthPrompt != null ? e.matchCharacterDepthPrompt : false,
        matchScenario: e.matchScenario != null ? e.matchScenario : false,
        matchCreatorNotes: e.matchCreatorNotes != null ? e.matchCreatorNotes : false,
        group: e.group || '',
        decorators: e.decorators || [],
        characterFilter: e.characterFilter || { isExclude: false, names: [], tags: [] }
      });
    }

    return {
      name: data.name || '导入的世界书',
      description: typeof data.description === 'string' ? data.description : '',
      entries: entries,
      recursiveScanning: (data.settings && data.settings.recursive_scanning) ? true : false,
      caseSensitive: (data.settings && data.settings.case_sensitive) ? true : false,
      matchWholeWords: (data.settings && data.settings.match_whole_words) ? true : false
    };
  }

  /**
   * Export an internal lorebook to SillyTavern-compatible JSON.
   *
   * @param {Object} lorebook - internal lorebook object
   * @returns {Object} ST-format lorebook JSON
   */
  function exportLorebook(lorebook) {
    var entries = {};

    for (var i = 0; i < lorebook.entries.length; i++) {
      var e = lorebook.entries[i];

      entries[String(i)] = {
        uid: i,
        key: e.keys || [],
        keysecondary: e.secondaryKeys || [],
        comment: e.comment || (e.content ? e.content.slice(0, 50) : ''),
        content: e.content || '',
        constant: e.constant != null ? e.constant : false,
        selective: e.selective != null ? e.selective : false,
        selectiveLogic: (REVERSE_LOGIC_MAP[e.selectiveLogic] != null ? REVERSE_LOGIC_MAP[e.selectiveLogic] : 1),
        addMemo: e.addMemo != null ? e.addMemo : false,
        order: e.order != null ? e.order : 100,
        position: REVERSE_POSITION_MAP[e.position] != null ? REVERSE_POSITION_MAP[e.position] : 1,
        role: e.role != null ? e.role : 0,
        disable: false,
        probability: e.probability != null ? e.probability : 100,
        depth: e.depth != null ? e.depth : 4,
        group: e.group || '',
        useProbability: e.useProbability != null ? e.useProbability : (e.probability < 100),
        excluded: false,
        sticky: e.sticky != null ? e.sticky : 0,
        cooldown: e.cooldown != null ? e.cooldown : 0,
        delay: e.delay != null ? e.delay : 0,
        weight: e.weight != null ? e.weight : 100,
        scanDepth: e.scanDepth != null ? e.scanDepth : 0,
        caseSensitive: e.caseSensitive != null ? e.caseSensitive : false,
        matchWholeWords: e.matchWholeWords != null ? e.matchWholeWords : false,
        excludeRecursion: e.excludeRecursion != null ? e.excludeRecursion : false,
        preventRecursion: e.preventRecursion != null ? e.preventRecursion : false,
        useGroupScoring: e.useGroupScoring != null ? e.useGroupScoring : false,
        matchPersonaDescription: e.matchPersonaDescription != null ? e.matchPersonaDescription : false,
        matchCharacterDescription: e.matchCharacterDescription != null ? e.matchCharacterDescription : false,
        matchCharacterPersonality: e.matchCharacterPersonality != null ? e.matchCharacterPersonality : false,
        matchCharacterDepthPrompt: e.matchCharacterDepthPrompt != null ? e.matchCharacterDepthPrompt : false,
        matchScenario: e.matchScenario != null ? e.matchScenario : false,
        matchCreatorNotes: e.matchCreatorNotes != null ? e.matchCreatorNotes : false,
        decorators: e.decorators || [],
        characterFilter: e.characterFilter || { isExclude: false, names: [], tags: [] }
      };
    }

    return {
      name: lorebook.name || '',
      description: lorebook.description || '',
      entries: entries,
      settings: {
        recursive_scanning: lorebook.recursiveScanning || false,
        case_sensitive: lorebook.caseSensitive || false,
        match_whole_words: lorebook.matchWholeWords || false
      }
    };
  }

  // ==================================================================
  // Preset import/export
  // ==================================================================

  /**
   * Import a SillyTavern-format preset into the internal format.
   *
   * @param {Object} data - ST preset JSON
   * @returns {Object} internal preset (without id/createdAt/updatedAt)
   */
  function importPreset(data) {
    var name = data.preset || data.name || '导入的预设';
    return {
      name: name,
      description: typeof data.description === 'string' ? data.description : '',
      settings: data
    };
  }

  /**
   * Export an internal preset to SillyTavern-compatible JSON.
   *
   * @param {Object} preset - internal preset object
   * @returns {Object} ST-format preset JSON
   */
  function exportPreset(preset) {
    var out = {};
    var keys = Object.keys(preset.settings || {});
    for (var i = 0; i < keys.length; i++) {
      out[keys[i]] = preset.settings[keys[i]];
    }
    out.name = preset.name || '';
    out.description = preset.description || '';
    return out;
  }

  // ==================================================================
  // Multi-import
  // ==================================================================

  /**
   * Import multiple lorebook JSON objects at once.
   *
   * @param {Array<{fileName: string, json: Object}>} inputs
   * @returns {{successes: Array<{fileName:string, lorebook:Object}>, failures: Array<{fileName:string, error:string}>}}
   */
  function importMultipleLorebooks(inputs) {
    var successes = [];
    var failures = [];

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

  /**
   * Rename a lorebook (returns new object).
   * @param {Object} lb
   * @param {string} newName
   * @returns {Object}
   */
  function renameLorebook(lb, newName) {
    var copy = {};
    var keys = Object.keys(lb);
    for (var i = 0; i < keys.length; i++) {
      copy[keys[i]] = lb[keys[i]];
    }
    copy.name = newName;
    copy.updatedAt = Date.now();
    return copy;
  }

  // ==================================================================
  // File helpers
  // ==================================================================

  /**
   * Open a file picker dialog and return the parsed JSON content.
   * @returns {Promise<Object|null>}
   */
  function importJsonFile() {
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = function (e) {
        var file = e.target.files ? e.target.files[0] : null;
        if (!file) { resolve(null); return; }
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
   * @param {*} data
   * @param {string} filename
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

  // ==================================================================
  // Helpers
  // ==================================================================

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ==================================================================
  // Character Card Import/Export (SillyTavern v2/v3 spec)
  // ==================================================================

  /**
   * Import a SillyTavern character card JSON (v2/v3 spec).
   * Reads spec version, normalizes to internal format.
   * @param {Object} json - Raw character card JSON
   * @returns {Object} Normalized character card object
   */
  function importCharacterCard(json) {
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
      // Raw v3 data block
      raw: data,
    };
  }

  /**
   * Export an internal character card to ST v3 JSON.
   * @param {Object} card - Internal card object
   * @returns {Object} ST v3 spec JSON
   */
  function exportCharacterCard(card) {
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

  /**
   * Extract character card JSON from a PNG file (SillyTavern PNG embedding).
   * ST embeds base64-encoded JSON in the tEXt chunk with keyword "chara".
   * @param {File} file - PNG file
   * @returns {Promise<Object>} Parsed character card
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

          // Scan for tEXt "chara" chunk in PNG binary
          var offset = 8; // skip PNG signature
          while (offset < bytes.length) {
            var length = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
            var type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
            if (type === 'tEXt') {
              var dataStart = offset + 8;
              var nullIdx = -1;
              for (var i = dataStart; i < dataStart + length; i++) {
                if (bytes[i] === 0) { nullIdx = i; break; }
              }
              if (nullIdx > dataStart) {
                var keyword = '';
                for (var k = dataStart; k < nullIdx; k++) {
                  keyword += String.fromCharCode(bytes[k]);
                }
                if (keyword === 'chara') {
                  var contentStart = nullIdx + 1;
                  var content = '';
                  for (var c = contentStart; c < dataStart + length; c++) {
                    content += String.fromCharCode(bytes[c]);
                  }
                  // Try base64 decode
                  try {
                    var decoded = atob(content);
                    json = JSON.parse(decoded);
                    break;
                  } catch (e) {
                    // maybe raw JSON
                    try { json = JSON.parse(content); break; } catch (e2) {}
                  }
                }
              }
            }
            offset += 12 + length;
          }

          if (json) {
            resolve(importCharacterCard(json));
          } else {
            reject(new Error('PNG 中未找到角色卡数据（chara 块）'));
          }
        } catch (e) {
          reject(new Error('解析 PNG 失败: ' + e.message));
        }
      };
      reader.onerror = function () { reject(new Error('读取文件失败')); };
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Apply a character card to the UI: left panel, right panel character settings, and storage.
   * @param {Object} card - Parsed character card (from importCharacterCard)
   */
  function applyCharacterCard(card) {
    // 左侧状态栏
    var el = function (id) { return document.getElementById(id); };
    if (el('char-name-display')) el('char-name-display').textContent = card.name;
    if (el('s-name')) el('s-name').textContent = card.name;

    // 右侧角色设定表单
    if (el('cs-name')) el('cs-name').value = card.name;
    if (el('cs-nickname')) el('cs-nickname').value = card.description;
    if (el('cs-personality')) el('cs-personality').value = card.personality;
    if (el('cs-background')) el('cs-background').value = card.scenario;

    // 保存到 localStorage
    if (window.storage) {
      window.storage.set('character_card', card);
    }
    // 同步到 ST 数据库
    if (ST.getSettings && ST.saveSettings) {
      ST.getSettings().then(function (s) {
        if (s) {
          s.characterName = card.name;
          ST.saveSettings(s);
        }
      }).catch(function () {});
    }

    window.notifications?.show('success', '角色卡已加载', '已应用: ' + card.name);
  }

  // ==================================================================
  // Exported namespace
  // ==================================================================

  return {
    // Character cards
    importCharacterCard: importCharacterCard,
    exportCharacterCard: exportCharacterCard,
    extractCardFromPng: extractCardFromPng,
    applyCharacterCard: applyCharacterCard,
    // Lorebooks
    importLorebook: importLorebook,
    exportLorebook: exportLorebook,
    importPreset: importPreset,
    exportPreset: exportPreset,
    importMultipleLorebooks: importMultipleLorebooks,
    renameLorebook: renameLorebook,
    importJsonFile: importJsonFile,
    exportToJson: exportToJson,
    /** Position number → string map */
    POSITION_MAP: POSITION_MAP,
    /** Position string → number map */
    REVERSE_POSITION_MAP: REVERSE_POSITION_MAP,
    /** Selective logic number → string map */
    LOGIC_MAP: LOGIC_MAP,
    /** Selective logic string → number map */
    REVERSE_LOGIC_MAP: REVERSE_LOGIC_MAP
  };
})();
