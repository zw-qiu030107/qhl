/**
 * Variable System Utilities — Vanilla JavaScript
 *
 * Extracts variable declarations from text using two supported syntaxes:
 *   1. Single <var name="key" value="val" /> tags
 *   2. Block <vars>{"key": value, ...}</vars> JSON blocks
 *
 * Also provides shallow merge and prompt formatting helpers for the
 * extracted variables.
 *
 * @namespace ST.Variables
 * @module sillytavern/variables
 */
(function () {
  'use strict';

  // Ensure namespace
  window.ST = window.ST || {};

  // =========================================================================
  // Private Helpers
  // =========================================================================

  /**
   * Regex for matching <var name="..." value="..." /> tags.
   * Supports both self-closing and <var...></var> syntax.
   * @type {RegExp}
   */
  var VAR_TAG_REGEX = /<var\s+name="([^"]+)"\s+value="([^"]*?)"\s*(?:\/)?>/gi;

  /**
   * Regex for matching <vars>...</vars> JSON block tags.
   * @type {RegExp}
   */
  var VARS_BLOCK_REGEX = /<vars>([\s\S]*?)<\/vars>/gi;

  // =========================================================================
  // Public Methods
  // =========================================================================

  /**
   * Extract variable declarations from text.
   *
   * Scans for both `<var name="k" value="v" />` single tags and
   * `<vars>{...}</vars>` JSON blocks. Both tag types are removed from
   * the returned `cleanedText`.
   *
   * Numeric values are automatically converted to numbers; non-numeric
   * strings are kept as strings.
   *
   * @param {string} text — Raw text possibly containing variable tags
   * @returns {{ cleanedText: string, updates: Object<string, (string|number)> }}
   *
   * @example
   * var result = ST.Variables.extractVariables(
   *   'Hello <var name="hp" value="100"/> World <vars>{"gold": 50}</vars>'
   * );
   * // result.cleanedText === 'Hello  World '
   * // result.updates === { hp: 100, gold: 50 }
   */
  function extractVariables(text) {
    if (!text) {
      return { cleanedText: '', updates: {} };
    }

    var updates = {};

    // ---- Step 1: Parse <var name="key" value="val" /> single tags ----
    var varMatch;
    while ((varMatch = VAR_TAG_REGEX.exec(text)) !== null) {
      var varName = varMatch[1];
      var rawValue = varMatch[2];
      var num = Number(rawValue);
      updates[varName] = isNaN(num) ? rawValue : num;
    }

    // ---- Step 2: Parse <vars>...</vars> JSON blocks ----
    // Reset lastIndex since we're reusing global regex
    VARS_BLOCK_REGEX.lastIndex = 0;

    var blockMatch;
    while ((blockMatch = VARS_BLOCK_REGEX.exec(text)) !== null) {
      var blockContent = blockMatch[1];
      if (ST.VarsMerger && typeof ST.VarsMerger.parseVarsBlock === 'function') {
        var patch = ST.VarsMerger.parseVarsBlock(blockContent);
        if (patch && patch.merge) {
          var mergeKeys = Object.keys(patch.merge);
          for (var i = 0; i < mergeKeys.length; i++) {
            updates[mergeKeys[i]] = patch.merge[mergeKeys[i]];
          }
        }
      }
    }

    // ---- Step 3: Remove all variable tags from the text ----
    var cleanedText = text
      .replace(/<var\s+name="[^"]+"\s+value="[^"]*?"\s*(?:\/)?>/gi, '')
      .replace(/<vars>[\s\S]*?<\/vars>/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { cleanedText: cleanedText, updates: updates };
  }

  /**
   * Shallow-merge a base variables object with updates.
   *
   * For deep merge with relative-number support (e.g. "+10" / "-5"),
   * use `ST.VarsMerger.mergeVariables()` instead.
   *
   * Neither input object is mutated; a new object is returned.
   *
   * @param {Object<string, *>} [base] — Base variables object
   * @param {Object<string, *>} [updates] — Updates to apply
   * @returns {Object<string, *>} New merged variables object
   *
   * @example
   * var result = ST.Variables.mergeVariables(
   *   { hp: 100, mp: 50 },
   *   { hp: 80, exp: 200 }
   * );
   * // result === { hp: 80, mp: 50, exp: 200 }
   */
  function mergeVariables(base, updates) {
    base = base || {};
    updates = updates || {};

    var out = {};

    // Copy base values
    var baseKeys = Object.keys(base);
    for (var i = 0; i < baseKeys.length; i++) {
      out[baseKeys[i]] = base[baseKeys[i]];
    }

    // Overwrite with update values
    var updateKeys = Object.keys(updates);
    for (var j = 0; j < updateKeys.length; j++) {
      out[updateKeys[j]] = updates[updateKeys[j]];
    }

    return out;
  }

  /**
   * Format a variables object as a human-readable prompt preamble.
   *
   * @param {Object<string, (string|number)>} variables — Key-value pairs
   * @returns {string} Formatted string like "[当前状态]\nk: v\n..."
   *   Returns empty string if the variables object is empty.
   *
   * @example
   * var text = ST.Variables.formatVariablesForPrompt({ hp: 100, gold: 50 });
   * // text === '[当前状态]\nhp: 100\ngold: 50'
   */
  function formatVariablesForPrompt(variables) {
    if (!variables) {
      return '';
    }

    var entries = Object.entries(variables);
    if (entries.length === 0) {
      return '';
    }

    var lines = entries.map(function (e) {
      return e[0] + ': ' + e[1];
    });

    return '[当前状态]\n' + lines.join('\n');
  }

  // =========================================================================
  // Namespace Export
  // =========================================================================

  ST.Variables = {
    extractVariables: extractVariables,
    mergeVariables: mergeVariables,
    formatVariablesForPrompt: formatVariablesForPrompt,
  };

  // =========================================================================
  // Init
  // =========================================================================

  console.log('[ST.variables] Variable extraction utilities initialized');
})();
