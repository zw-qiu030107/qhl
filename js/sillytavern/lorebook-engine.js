/**
 * Lorebook Matching Engine — Vanilla JavaScript
 *
 * Keyword-based matching engine that scans user input against lorebook
 * entries and returns scored, deduplicated match results. Supports:
 * - Case-insensitive and whole-word matching
 * - Selective (primary + secondary) keyword logic
 * - Constant (always-match) entries
 * - Probability-based activation
 * - Recursive scanning (re-feed matched content)
 *
 * @module sillytavern/lorebook-engine
 */
(function () {
  'use strict';

  // Ensure namespace
  window.ST = window.ST || {};

  // =========================================================================
  // LorebookEngine Constructor
  // =========================================================================

  /**
   * Creates a lorebook matching engine for a single lorebook.
   *
   * @constructor
   * @param {Object} lorebook — A lorebook object with the following keys:
   *   {Object[]} entries — array of lorebook entry objects
   *   {boolean}  caseSensitive — whether keyword matching is case-sensitive
   *   {boolean}  matchWholeWords — whether keywords must match whole words
   *   {boolean}  recursiveScanning — whether to recursively re-scan matched content
   */
  function LorebookEngine(lorebook) {
    this.lorebook = lorebook;
  }

  // =========================================================================
  // Public Methods
  // =========================================================================

  /**
   * Scan text against all entries in the lorebook.
   *
   * @param {string} text — The primary text to scan (typically user input)
   * @param {string} [additionalContext] — Extra text to scan against for
   *   secondary keyword matching in selective mode. Defaults to `text`.
   * @returns {Array<{entry: Object, score: number, matchedKeywords: string[]}>}
   *   Array of match results sorted by score ascending.
   */
  LorebookEngine.prototype.scan = function (text, additionalContext) {
    var self = this;
    var normalizedText = self.lorebook.caseSensitive ? text : text.toLowerCase();
    var normalizedContext = additionalContext
      ? (self.lorebook.caseSensitive ? additionalContext : additionalContext.toLowerCase())
      : normalizedText;

    var matched = [];

    for (var i = 0; i < self.lorebook.entries.length; i++) {
      var entry = self.lorebook.entries[i];

      // Constant entries always match (assigned a sentinel score of -9999)
      if (entry.constant) {
        matched.push({ entry: entry, score: -9999, matchedKeywords: ['constant'] });
        continue;
      }

      // Probability check
      if (entry.useProbability) {
        if (Math.random() * 100 >= (entry.probability != null ? entry.probability : 100)) {
          continue;
        }
      }

      // Keyword match check
      var isMatch = self._checkEntryMatch(entry, normalizedText, normalizedContext);
      if (!isMatch) {
        continue;
      }

      // Collect matched keyword names for reporting
      var matchedKeywords = entry.keys.filter(function (k) {
        return self._containsKeyword(normalizedText, self._normalizeKeyword(k));
      });

      matched.push({
        entry: entry,
        score: entry.order != null ? entry.order : 100,
        matchedKeywords: matchedKeywords,
      });
    }

    // Sort by score ascending — lower order number = higher display priority
    matched.sort(function (a, b) { return a.score - b.score; });

    return matched;
  };

  /**
   * Recursive scan — re-scans accumulated text up to `maxDepth` times,
   * appending matched entry content to the search string each round.
   * This allows "chain reaction" matching where one matched entry's
   * content triggers additional matches.
   *
   * @param {string} initialText — The starting text to scan
   * @param {number} [maxDepth=3] — Maximum recursion depth (clamped to 3)
   * @param {string} [additionalContext] — Secondary context for selective matching
   * @returns {Array<{entry: Object, score: number, matchedKeywords: string[]}>}
   */
  LorebookEngine.prototype.recursiveScan = function (initialText, maxDepth, additionalContext) {
    if (maxDepth === undefined) {
      maxDepth = 3;
    }

    // If recursive scanning is disabled or depth exhausted, do a single pass
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

      // Stop early if no new entries were matched this round
      if (!hasNewMatches) {
        break;
      }

      depth++;
    }

    var result = Array.from(allMatched.values());
    result.sort(function (a, b) { return a.score - b.score; });

    return result;
  };

  /**
   * Group matched entries by their `position` field for injection into
   * different parts of the prompt assembly pipeline.
   *
   * @param {Array<{entry: Object, score: number, matchedKeywords: string[]}>} matched
   * @returns {Object<string, Array>} An object with position keys mapped to
   *   arrays of matched entries.
   */
  LorebookEngine.prototype.groupByPosition = function (matched) {
    var grouped = {
      before_char: [],
      after_char: [],
      before_example: [],
      after_example: [],
      at_depth: [],
      example_msg_top: [],
      example_msg_bottom: [],
      outlet: [],
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
   * Format the content strings of a list of matched entries into a single
   * text block, with entries separated by double newlines.
   *
   * @param {Array<{entry: Object}>} entries
   * @returns {string} Concatenated content string (empty string if no entries)
   */
  LorebookEngine.prototype.formatEntriesContent = function (entries) {
    if (!entries || entries.length === 0) {
      return '';
    }

    var contents = [];
    for (var i = 0; i < entries.length; i++) {
      contents.push(entries[i].entry.content);
    }

    return contents.join('\n\n');
  };

  // =========================================================================
  // Private Methods
  // =========================================================================

  /**
   * Check whether a single entry matches the given text and context.
   * Evaluates primary keys, selective logic, and secondary keys.
   *
   * @param {Object} entry — The lorebook entry to check
   * @param {string} text — Normalized primary text
   * @param {string} context — Normalized secondary context
   * @returns {boolean} True if the entry matches
   * @private
   */
  LorebookEngine.prototype._checkEntryMatch = function (entry, text, context) {
    var self = this;
    var keys = entry.keys || [];
    var secondaryKeys = entry.secondaryKeys || [];
    var selective = entry.selective || false;
    var selectiveLogic = entry.selectiveLogic || 'and_any';

    // Entries with no primary keys never match
    if (keys.length === 0) {
      return false;
    }

    // Evaluate primary keyword matches
    var primaryResults = keys.map(function (k) {
      return self._containsKeyword(text, self._normalizeKeyword(k));
    });

    var allPrimary = primaryResults.every(function (m) { return m; });
    var anyPrimary = primaryResults.some(function (m) { return m; });

    // Determine if primary condition is satisfied based on selective logic
    var primaryOk = false;
    switch (selectiveLogic) {
      case 'and_all':
      case 'and_any':
        // In frontend-integration mode, both and_any/and_all use OR semantics
        // for the primary trigger
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

    if (!primaryOk) {
      return false;
    }

    // If not selective or no secondary keys, primary result is sufficient
    if (!selective || secondaryKeys.length === 0) {
      return primaryOk;
    }

    // Selective mode: verify secondary keys against the context text
    var secondaryResults = secondaryKeys.map(function (k) {
      return self._containsKeyword(context, self._normalizeKeyword(k));
    });

    var allSecondary = secondaryResults.every(function (m) { return m; });
    var anySecondary = secondaryResults.some(function (m) { return m; });

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
   *
   * @param {string} keyword
   * @returns {string} Normalized keyword
   * @private
   */
  LorebookEngine.prototype._normalizeKeyword = function (keyword) {
    return this.lorebook.caseSensitive ? keyword : keyword.toLowerCase();
  };

  /**
   * Check whether `text` contains `keyword`, respecting the whole-word
   * matching setting.
   *
   * @param {string} text — The text to search within
   * @param {string} keyword — The keyword to search for
   * @returns {boolean} True if the keyword is found
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
   * Escape special regex characters in a string so it can be used
   * as a literal in a RegExp constructor.
   *
   * @param {string} str — The raw string
   * @returns {string} Regex-escaped string
   * @private
   */
  LorebookEngine.prototype._escapeRegex = function (str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // =========================================================================
  // Public API — ST Namespace
  // =========================================================================

  /**
   * Match multiple lorebooks against user input.
   * This is the primary entry point for external callers (e.g. prompt-assembler).
   *
   * @param {string} userInput — The user's latest message text
   * @param {Object[]} lorebooks — Array of lorebook objects to scan
   * @param {Object} [options] — Matching options
   * @param {number} [options.maxDepth=3] — Maximum recursion depth per lorebook
   * @param {string} [options.additionalContext] — Extra text to scan against
   * @param {boolean} [options.deduplicate=true] — Whether to remove duplicate
   *   entries (by id) across lorebooks
   * @returns {Array<{entry: Object, score: number, matchedKeywords: string[]}>}
   *   Sorted, deduplicated array of match results
   */
  ST.matchLorebooks = function (userInput, lorebooks, options) {
    options = options || {};
    var maxDepth = options.maxDepth != null ? options.maxDepth : 3;
    var additionalContext = options.additionalContext || undefined;
    var deduplicate = options.deduplicate !== false;

    if (!lorebooks || lorebooks.length === 0) {
      return [];
    }

    var allMatched = [];

    // Scan each lorebook independently
    for (var i = 0; i < lorebooks.length; i++) {
      var engine = new LorebookEngine(lorebooks[i]);
      var matches = engine.recursiveScan(userInput, maxDepth, additionalContext);
      allMatched = allMatched.concat(matches);
    }

    // Deduplicate entries by id (keep first occurrence)
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
   * Convenience factory for cases where a caller needs to work with
   * one lorebook directly.
   *
   * @param {Object} lorebook
   * @returns {LorebookEngine}
   */
  ST.createLorebookEngine = function (lorebook) {
    return new LorebookEngine(lorebook);
  };

  /**
   * Expose the LorebookEngine constructor for direct reference.
   * @type {Function}
   */
  ST.LorebookEngine = LorebookEngine;

  // =========================================================================
  // Init
  // =========================================================================

  console.log('[ST.lorebook-engine] Lorebook matching engine initialized');
})();
