/**
 * Variable system utilities — extract <var> and <vars> tags from text.
 *
 * @namespace ST.Variables
 */
window.ST = window.ST || {};

ST.Variables = (function () {
  'use strict';

  /**
   * Extract variable declarations from text.
   *
   * Supports two syntaxes:
   *   1. `<var name="key" value="val" />` — single variable declaration
   *   2. `<vars>{"key": value, ...}</vars>` — JSON block declaration
   *
   * Both tag types are removed from the returned cleanedText.
   *
   * @param {string} text - raw text possibly containing variable tags
   * @returns {{cleanedText: string, updates: Object<string, (string|number)>}}
   */
  function extractVariables(text) {
    var updates = {};

    // 1. Parse <var name="key" value="val" /> syntax
    //    Supports both self-closing <var ... /> and <var ...></var>
    var varRegex = /<var\s+name="([^"]+)"\s+value="([^"]*?)"\s*(?:\/)?>/gi;
    var match;
    while ((match = varRegex.exec(text)) !== null) {
      var name = match[1];
      var rawValue = match[2];
      var num = Number(rawValue);
      updates[name] = isNaN(num) ? rawValue : num;
    }

    // 2. Parse <vars>...</vars> JSON block syntax
    var varsRegex = /<vars>([\s\S]*?)<\/vars>/gi;
    while ((match = varsRegex.exec(text)) !== null) {
      var blockContent = match[1];
      if (ST.VarsMerger && ST.VarsMerger.parseVarsBlock) {
        var patch = ST.VarsMerger.parseVarsBlock(blockContent);
        if (patch && patch.merge) {
          var mergeKeys = Object.keys(patch.merge);
          for (var i = 0; i < mergeKeys.length; i++) {
            updates[mergeKeys[i]] = patch.merge[mergeKeys[i]];
          }
        }
      }
    }

    // 3. Remove all variable tags from text
    var cleanedText = text
      .replace(/<var\s+name="[^"]+"\s+value="[^"]*?"\s*(?:\/)?>/gi, '')
      .replace(/<vars>[\s\S]*?<\/vars>/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { cleanedText: cleanedText, updates: updates };
  }

  /**
   * Merge a base variables object with updates (shallow overwrite).
   * For deep merge with relative numbers, use ST.VarsMerger.mergeVariables().
   *
   * @param {Object<string, *>} [base]
   * @param {Object<string, *>} [updates]
   * @returns {Object<string, *>}
   */
  function mergeVariables(base, updates) {
    base = base || {};
    updates = updates || {};
    var out = {};
    var keys = Object.keys(base);
    for (var i = 0; i < keys.length; i++) {
      out[keys[i]] = base[keys[i]];
    }
    var upKeys = Object.keys(updates);
    for (var j = 0; j < upKeys.length; j++) {
      out[upKeys[j]] = updates[upKeys[j]];
    }
    return out;
  }

  /**
   * Format variables as a prompt preamble string.
   * @param {Object<string, (string|number)>} variables
   * @returns {string}
   */
  function formatVariablesForPrompt(variables) {
    var entries = Object.entries(variables);
    if (entries.length === 0) return '';
    var lines = entries.map(function (e) { return e[0] + ': ' + e[1]; });
    return '[当前状态]\n' + lines.join('\n');
  }

  return {
    extractVariables: extractVariables,
    mergeVariables: mergeVariables,
    formatVariablesForPrompt: formatVariablesForPrompt
  };
})();
