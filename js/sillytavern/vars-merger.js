/**
 * Variable merge utilities — deep merge with relative-number support.
 *
 * @namespace ST.VarsMerger
 */
window.ST = window.ST || {};

ST.VarsMerger = (function () {
  'use strict';

  /**
   * Parse a raw vars block (JSON string inside <vars>...</vars>) into a VarsPatch.
   * @param {string} raw - raw JSON string
   * @returns {{merge: Object}} vars patch
   */
  function parseVarsBlock(raw) {
    var trimmed = raw.trim();
    if (!trimmed) return { merge: {} };
    try {
      var parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { merge: parsed };
      }
      return { merge: {} };
    } catch (e) {
      return { merge: {} };
    }
  }

  /**
   * Apply a vars patch to existing variables.
   * @param {Object} existing - current variables
   * @param {{merge:Object}} patch - vars patch
   * @returns {Object} new merged variables
   */
  function applyVarsPatch(existing, patch) {
    return mergeVariables(existing, patch.merge);
  }

  /**
   * Deep-merge `patch` into `current`, with support for relative numeric values.
   *
   * Rules:
   * - If the patch value is a string starting with "+" or "-" AND the existing
   *   value is a number, the result is a relative update: existing +/- parsed value.
   *   Example: current { hp: 100 } + patch { hp: "+10" } → { hp: 110 }
   * - String values replace directly (plain overwrite).
   * - Objects are deep-merged recursively.
   * - Arrays replace directly (no concatenation).
   * - Null/undefined patch values remove the key from the result.
   *
   * @param {Object<string, (string|number)>} current - current variables
   * @param {Object<string, (string|number)>} [patch] - updates to apply
   * @returns {Object<string, (string|number)>} new merged object (does not mutate inputs)
   */
  function mergeVariables(current, patch) {
    if (!patch || typeof patch !== 'object') {
      return shallowCopy(current || {});
    }
    var out = shallowCopy(current || {});
    var keys = Object.keys(patch);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var sv = patch[key];
      var tv = out[key];

      // Null/undefined removes the key
      if (sv === null || sv === undefined) {
        delete out[key];
        continue;
      }

      // Relative number: patch is string like "+10" or "-5"
      if (typeof sv === 'string' && (sv.charAt(0) === '+' || sv.charAt(0) === '-') && typeof tv === 'number') {
        var delta = Number(sv);
        if (!isNaN(delta)) {
          out[key] = tv + delta;
          continue;
        }
      }

      // String → direct replace (even if current is number)
      if (typeof sv === 'string') {
        out[key] = sv;
        continue;
      }

      // Number → direct replace
      if (typeof sv === 'number') {
        out[key] = sv;
        continue;
      }

      // Array → direct replace
      if (Array.isArray(sv)) {
        out[key] = sv.slice();
        continue;
      }

      // Object → deep merge
      if (sv && typeof sv === 'object') {
        if (tv && typeof tv === 'object' && !Array.isArray(tv)) {
          out[key] = mergeVariables(tv, sv);
        } else {
          out[key] = deepCopy(sv);
        }
        continue;
      }

      // Fallback: direct assignment
      out[key] = sv;
    }
    return out;
  }

  /**
   * Shallow copy of an object.
   * @param {Object} obj
   * @returns {Object}
   */
  function shallowCopy(obj) {
    var out = {};
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      out[keys[i]] = obj[keys[i]];
    }
    return out;
  }

  /**
   * Deep copy of a JSON-compatible value.
   * @param {*} val
   * @returns {*}
   */
  function deepCopy(val) {
    return JSON.parse(JSON.stringify(val));
  }

  return {
    parseVarsBlock: parseVarsBlock,
    applyVarsPatch: applyVarsPatch,
    mergeVariables: mergeVariables
  };
})();
