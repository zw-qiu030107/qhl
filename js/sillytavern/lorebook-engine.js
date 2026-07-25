/**
 * Lorebook Matching Engine — Vanilla JavaScript
 * Scans user input against lorebook entries and returns MatchedEntry objects
 * with scores and keyword info.
 *
 * @module silltyavern/lorebook-engine
 */
(function () {
  'use strict';

  // Ensure namespace
  window.ST = window.ST || {};

  // ========================================================================
  // LorebookEngine class (plain constructor + prototype)
  // ========================================================================

  /**
   * @constructor
   * @param {Object} lorebook — a lorebook object with keys: entries[], caseSensitive,
   *   matchWholeWords, recursiveScanning.
   */
  function LorebookEngine(lorebook) {
    this.lorebook = lorebook;
  }

  /**
   * Scan text against all entries in the lorebook.
   * @param {string} text — user input (or accumulated text during recursion)
   * @param {string} [additionalContext] — additional text to search against
   *   (defaults to `text`). Used for secondary key matching in selective mode.
   * @returns {Array<{entry:Object, score:number, matchedKeywords:string[]}>}
   */
  LorebookEngine.prototype.scan = function (text, additionalContext) {
    var self = this;
    var normalizedText   = self.lorebook.caseSensitive ? text : text.toLowerCase();
    var normalizedContext = additionalContext
      ? (self.lorebook.caseSensitive ? additionalContext : additionalContext.toLowerCase())
      : normalizedText;

    var matched = [];

    for (var i = 0; i < self.lorebook.entries.length; i++) {
      var entry = self.lorebook.entries[i];

      // Constant entries always match
      if (entry.constant) {
        matched.push({ entry: entry, score: -9999, matchedKeywords: ['constant'] });
        continue;
      }

      // Probability check
      if (Math.random() * 100 >= (entry.probability != null ? entry.probability : 100)) {
        continue;
      }

      var isMatch = self._checkEntryMatch(entry, normalizedText, normalizedContext);

      if (isMatch) {
        matched.push({
          entry: entry,
          score: entry.order != null ? entry.order : 100,
          matchedKeywords: entry.keys.filter(function (k) {
            return self._containsKeyword(normalizedText, self._normalizeKeyword(k));
          }),
        });
      }
    }

    // Sort by score ascending (lower order = higher priority)
    matched.sort(function (a, b) { return a.score - b.score; });
    return matched;
  };

  /**
   * Recursive scan — re-scans accumulated text up to `maxDepth` times,
   * appending matched entry content to the search string each round.
   * @param {string} initialText
   * @param {number} [maxDepth=3]
   * @param {string} [additionalContext]
   * @returns {Array<{entry:Object, score:number, matchedKeywords:string[]}>}
   */
  LorebookEngine.prototype.recursiveScan = function (initialText, maxDepth, additionalContext) {
    if (maxDepth === undefined) maxDepth = 3;
    if (!this.lorebook.recursiveScanning || maxDepth <= 0) {
      return this.scan(initialText, additionalContext);
    }

    var allMatched = new Map();
    var currentText = initialText;
    var depth = 0;

    while (depth < maxDepth) {
      var newMatches = this.scan(currentText, additionalContext);
      var hasNewMatches = false;

      for (var i = 0; i < newMatches.length; i++) {
        var match = newMatches[i];
        if (!allMatched.has(match.entry.id)) {
          allMatched.set(match.entry.id, match);
          currentText += ' ' + match.entry.content;
          hasNewMatches = true;
        }
      }

      if (!hasNewMatches) break;
      depth++;
    }

    var result = Array.from(allMatched.values());
    result.sort(function (a, b) { return a.score - b.score; });
    return result;
  };

  /**
   * Group matched entries by their position field.
   * @param {Array<{entry:Object, score:number, matchedKeywords:string[]}>} matched
   * @returns {Object<string, Array>}
   */
  LorebookEngine.prototype.groupByPosition = function (matched) {
    var grouped = {
      before_char: [], after_char: [], before_example: [], after_example: [],
      at_depth: [], example_msg_top: [], example_msg_bottom: [], outlet: [],
    };

    for (var i = 0; i < matched.length; i++) {
      var pos = matched[i].entry.position;
      if (grouped[pos]) {
        grouped[pos].push(matched[i]);
      }
    }

    return grouped;
  };

  /**
   * Format matched entry contents into a single string block.
   * @param {Array<{entry:Object}>} entries
   * @returns {string}
   */
  LorebookEngine.prototype.formatEntriesContent = function (entries) {
    if (!entries || entries.length === 0) return '';
    return entries.map(function (e) { return e.entry.content; }).join('\n\n');
  };

  // ----------------------------------------------------------------------
  // Private methods
  // ----------------------------------------------------------------------

  /**
   * Check if a single entry matches the given text.
   * @param {Object} entry
   * @param {string} text — normalized primary text
   * @param {string} context — normalized context (for secondary keys)
   * @returns {boolean}
   * @private
   */
  LorebookEngine.prototype._checkEntryMatch = function (entry, text, context) {
    var self = this;
    var keys = entry.keys || [];
    var secondaryKeys = entry.secondaryKeys || [];
    var selective = entry.selective || false;
    var selectiveLogic = entry.selectiveLogic || 'and_any';

    if (keys.length === 0) return false;

    var primaryMatches = keys.map(function (k) {
      return self._containsKeyword(text, self._normalizeKeyword(k));
    });
    var allPrimary = primaryMatches.every(function (m) { return m; });
    var anyPrimary = primaryMatches.some(function (m) { return m; });

    var primaryOk = false;
    switch (selectiveLogic) {
      case 'and_all':
      case 'and_any':
        // In frontend-integration mode, both and_any/and_all treat primary as OR trigger
        primaryOk = anyPrimary;
        break;
      case 'not_all':
        primaryOk = !allPrimary;
        break;
      case 'not_any':
        primaryOk = !anyPrimary;
        break;
      default:
        primaryOk = anyPrimary;
    }

    if (!primaryOk) return false;

    // If not selective or no secondary keys, primary result is sufficient
    if (!selective || secondaryKeys.length === 0) {
      return primaryOk;
    }

    // Selective: verify secondary keys against context
    var secondaryMatches = secondaryKeys.map(function (k) {
      return self._containsKeyword(context, self._normalizeKeyword(k));
    });
    var allSecondary = secondaryMatches.every(function (m) { return m; });
    var anySecondary = secondaryMatches.some(function (m) { return m; });

    switch (selectiveLogic) {
      case 'and_all':
        return allSecondary;
      case 'not_all':
        return allSecondary;
      case 'and_any':
      case 'not_any':
      default:
        return anySecondary;
    }
  };

  /**
   * Normalize a keyword according to the lorebook's caseSensitive setting.
   * @param {string} keyword
   * @returns {string}
   * @private
   */
  LorebookEngine.prototype._normalizeKeyword = function (keyword) {
    return this.lorebook.caseSensitive ? keyword : keyword.toLowerCase();
  };

  /**
   * Check if `text` contains `keyword`, respecting matchWholeWords.
   * @param {string} text
   * @param {string} keyword
   * @returns {boolean}
   * @private
   */
  LorebookEngine.prototype._containsKeyword = function (text, keyword) {
    if (this.lorebook.matchWholeWords) {
      var regex = new RegExp('\\b' + this._escapeRegex(keyword) + '\\b', 'i');
      return regex.test(text);
    }
    return text.indexOf(keyword) !== -1;
  };

  /**
   * Escape special regex characters in a string.
   * @param {string} str
   * @returns {string}
   * @private
   */
  LorebookEngine.prototype._escapeRegex = function (str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Match lorebooks against user input.
   * This is the primary entry point for external callers.
   *
   * @param {string} userInput — the user's latest message
   * @param {Object[]} lorebooks — array of lorebook objects
   * @param {Object} [options]
   * @param {number} [options.maxDepth=3] — max recursion depth
   * @param {string} [options.additionalContext] — extra text to scan (e.g. persona, scenario)
   * @param {boolean} [options.deduplicate=true] — remove duplicate entries by id
   * @returns {Array<{entry:Object, score:number, matchedKeywords:string[]}>}
   */
  ST.matchLorebooks = function (userInput, lorebooks, options) {
    options = options || {};
    var maxDepth = options.maxDepth != null ? options.maxDepth : 3;
    var additionalContext = options.additionalContext || undefined;
    var deduplicate = options.deduplicate !== false;

    if (!lorebooks || lorebooks.length === 0) return [];

    var allMatched = [];

    for (var i = 0; i < lorebooks.length; i++) {
      var engine = new LorebookEngine(lorebooks[i]);
      var matches = engine.recursiveScan(userInput, maxDepth, additionalContext);
      allMatched = allMatched.concat(matches);
    }

    if (deduplicate) {
      var seen = new Map();
      for (var j = 0; j < allMatched.length; j++) {
        var entry = allMatched[j].entry;
        if (!seen.has(entry.id)) {
          seen.set(entry.id, allMatched[j]);
        }
      }
      allMatched = Array.from(seen.values());
    }

    // Sort by score ascending
    allMatched.sort(function (a, b) { return a.score - b.score; });
    return allMatched;
  };

  /**
   * Create a new LorebookEngine instance for a single lorebook.
   * @param {Object} lorebook
   * @returns {LorebookEngine}
   */
  ST.createLorebookEngine = function (lorebook) {
    return new LorebookEngine(lorebook);
  };

  // Also expose the constructor for direct use
  ST.LorebookEngine = LorebookEngine;

  console.log('[ST.lorebook-engine] Lorebook matching engine initialized');
})();
