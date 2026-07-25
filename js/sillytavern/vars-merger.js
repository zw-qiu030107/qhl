/**
 * Variable Deep-Merge Utilities — Vanilla JavaScript
 *
 * Deep-merges variable patches with support for relative numeric values.
 * This is the engine behind the <vars> tag system, enabling game-state
 * tracking with relative deltas (e.g. "+10", "-5").
 *
 * Merge rules:
 *   - String starting with "+" or "-" + existing number => relative update
 *   - String value => direct replace
 *   - Number value => direct replace
 *   - Object value => deep merge recursively
 *   - Array value => direct replace (no concatenation)
 *   - null / undefined => remove the key
 *
 * @namespace ST.VarsMerger
 * @module sillytavern/vars-merger
 */
(function () {
  'use strict';

  // Ensure namespace
  window.ST = window.ST || {};

  // =========================================================================
  // Private Helpers
  // =========================================================================

  /**
   * Create a shallow copy of an object.
   *
   * @param {Object} obj — Source object
   * @returns {Object} Shallow copy (no prototype chain)
   */
  function shallowCopy(obj) {
    if (!obj || typeof obj !== 'object') {
      return {};
    }

    var out = {};
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      out[key] = obj[key];
    }
    return out;
  }

  /**
   * Create a deep copy of a JSON-compatible value via serialization.
   *
   * @param {*} val — Value to deep copy
   * @returns {*} Deep copy of the value
   */
  function deepCopy(val) {
    try {
      return JSON.parse(JSON.stringify(val));
    } catch (e) {
      // If the value cannot be serialized (e.g. circular references),
      // fall back to returning the original value.
      return val;
    }
  }

  /**
   * Check if a value is a plain object (not null, not array, typeof 'object').
   *
   * @param {*} val
   * @returns {boolean}
   */
  function isPlainObject(val) {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }

  // =========================================================================
  // Public Methods
  // =========================================================================

  /**
   * Parse a raw vars block content (the text inside <vars>...</vars>)
   * into a VarsPatch object.
   *
   * @param {string} raw — Raw JSON string from inside a <vars> block
   * @returns {{ merge: Object }} A vars patch with a `merge` key holding
   *   the parsed variables. Returns `{ merge: {} }` on parse failure.
   *
   * @example
   * var patch = ST.VarsMerger.parseVarsBlock('{ "金钱": "+10", "HP": 38 }');
   * // patch === { merge: { "金钱": "+10", "HP": 38 } }
   */
  function parseVarsBlock(raw) {
    if (!raw) {
      return { merge: {} };
    }

    var trimmed = raw.trim();
    if (!trimmed) {
      return { merge: {} };
    }

    try {
      var parsed = JSON.parse(trimmed);
      if (isPlainObject(parsed)) {
        return { merge: parsed };
      }
      return { merge: {} };
    } catch (e) {
      // Invalid JSON — return empty patch silently
      return { merge: {} };
    }
  }

  /**
   * Apply a VarsPatch to an existing variables object.
   * Convenience wrapper around mergeVariables().
   *
   * @param {Object<string, *>} existing — Current variables
   * @param {{ merge: Object }} patch — Vars patch from parseVarsBlock()
   * @returns {Object<string, *>} New merged variables object
   */
  function applyVarsPatch(existing, patch) {
    if (!patch || !patch.merge) {
      return shallowCopy(existing || {});
    }
    return mergeVariables(existing || {}, patch.merge);
  }

  /**
   * Deep-merge a `patch` object into a `current` object with support
   * for relative numeric values.
   *
   * Neither input object is mutated; a new object is returned.
   *
   * Relative number syntax:
   *   - If the patch value is a string matching /^[+-]\d+/ AND the
   *     existing value is a number, the result is current + delta.
   *     Example: current { hp: 100 } + patch { hp: "+10" } => { hp: 110 }
   *   - If the patch value is a string matching /^[+-]\d+/ but the
   *     existing value is NOT a number, the string replaces directly.
   *
   * @param {Object<string, *>} current — Current variables (source of truth)
   * @param {Object<string, *>} [patch] — Updates to apply
   * @returns {Object<string, *>} New merged object
   *
   * @example
   * var result = ST.VarsMerger.mergeVariables(
   *   { hp: 100, gold: 50, name: 'Hero', tags: ['a'] },
   *   { hp: '+10', gold: -30, name: 'Warrior', tags: ['b'], extra: null }
   * );
   * // result === { hp: 110, gold: 20, name: 'Warrior', tags: ['b'] }
   * // Note: 'extra' was removed because patch value is null
   */
  function mergeVariables(current, patch) {
    if (!patch || typeof patch !== 'object') {
      return shallowCopy(current || {});
    }

    var out = shallowCopy(current || {});
    var keys = Object.keys(patch);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var patchValue = patch[key];
      var existingValue = out[key];

      // ---- null / undefined => remove key ----
      if (patchValue === null || patchValue === undefined) {
        delete out[key];
        continue;
      }

      var patchType = typeof patchValue;

      // ---- Relative number string: "+10" or "-5" ----
      if (patchType === 'string' && /^[+-]/.test(patchValue) && typeof existingValue === 'number') {
        var delta = Number(patchValue);
        if (!isNaN(delta)) {
          out[key] = existingValue + delta;
          continue;
        }
      }

      // ---- String => direct replace (even if existing is a number) ----
      if (patchType === 'string') {
        out[key] = patchValue;
        continue;
      }

      // ---- Number => direct replace ----
      if (patchType === 'number') {
        out[key] = patchValue;
        continue;
      }

      // ---- Array => direct replace (copy) ----
      if (Array.isArray(patchValue)) {
        out[key] = patchValue.slice();
        continue;
      }

      // ---- Object => deep merge ----
      if (isPlainObject(patchValue)) {
        if (isPlainObject(existingValue)) {
          out[key] = mergeVariables(existingValue, patchValue);
        } else {
          out[key] = deepCopy(patchValue);
        }
        continue;
      }

      // ---- Fallback: direct assignment (functions, symbols, etc.) ----
      out[key] = patchValue;
    }

    return out;
  }

  // =========================================================================
  // Namespace Export
  // =========================================================================

  ST.VarsMerger = {
    parseVarsBlock: parseVarsBlock,
    applyVarsPatch: applyVarsPatch,
    mergeVariables: mergeVariables,
  };

  // =========================================================================
  // Init
  // =========================================================================

  console.log('[ST.vars-merger] Variable deep-merge utilities initialized');
})();
