/**
 * Streaming XML tag parser for AI responses.
 *
 * State machine:
 *   NORMAL      — outside any registered tag; chars emit as `raw`.
 *   BUFFER_TAG  — saw `<`; accumulating tag name until `>` (or overflow).
 *   TAGGED      — inside a transparent tag; chars emit as `tag-chunk`,
 *                 nested `<` re-enters BUFFER_TAG so closing tag can be detected.
 *   OPAQUE      — inside `thinking`/`think`-style tag; chars emit as `tag-chunk`
 *                 but inner `<...>` is NOT parsed; we only watch for `</tagname>`.
 *
 * @namespace ST.StreamParser
 */
window.ST = window.ST || {};

ST.StreamParser = (function () {
  'use strict';

  var PARTIAL_LIMIT = 64;

  var STATE_NORMAL = 0;
  var STATE_BUFFER_TAG = 1;
  var STATE_TAGGED = 2;
  var STATE_OPAQUE = 3;

  /**
   * Internal parser class — state machine for one complete stream.
   * @constructor
   * @param {string[]} tags - registered tag names
   * @param {string[]} opaqueTags - tags whose content is not parsed for nested tags
   */
  function StreamParser(tags, opaqueTags) {
    this.tags = tags || [];
    this.opaqueTags = opaqueTags || [];
    this.state = STATE_NORMAL;
    this.partial = '';
    this.currentTag = '';
    this.currentBuf = '';
    this.optionBuf = '';
    this.events = [];
  }

  /**
   * Feed a chunk of text to the parser.
   * @param {string} chunk
   * @returns {Array<{type:string, tag?:string, chunk?:string, full?:string, line?:string}>}
   */
  StreamParser.prototype.feed = function (chunk) {
    this.events = [];
    for (var i = 0; i < chunk.length; i++) {
      this._consumeChar(chunk.charAt(i));
    }
    return this.events;
  };

  /**
   * Finish parsing — close any open state, return remaining events.
   * @returns {Array<{type:string, tag?:string, chunk?:string, full?:string, line?:string}>}
   */
  StreamParser.prototype.finish = function () {
    this.events = [];
    if (this.state === STATE_BUFFER_TAG && this.partial) {
      this.events.push({ type: 'raw', chunk: '<' + this.partial });
      this.partial = '';
    }
    if (this.state === STATE_TAGGED || this.state === STATE_OPAQUE) {
      if (this.state === STATE_TAGGED && this.currentTag === 'option' && this.optionBuf) {
        this.events.push({ type: 'option-line', line: this.optionBuf });
        this.optionBuf = '';
      }
      this.events.push({ type: 'tag-close', tag: this.currentTag, full: this.currentBuf });
      this.currentBuf = '';
      this.currentTag = '';
    }
    this.state = STATE_NORMAL;
    return this.events;
  };

  /**
   * @private
   * @param {string} ch - single character
   */
  StreamParser.prototype._consumeChar = function (ch) {
    if (this.state === STATE_NORMAL) {
      if (ch === '<') {
        this.state = STATE_BUFFER_TAG;
        this.partial = '';
      } else {
        this.events.push({ type: 'raw', chunk: ch });
      }
      return;
    }
    if (this.state === STATE_BUFFER_TAG) {
      if (ch === '>') {
        this._flushTagBuffer();
        return;
      }
      if (this.partial.length >= PARTIAL_LIMIT) {
        // Overflow: this is not a tag, dump partial back as raw.
        this.events.push({ type: 'raw', chunk: '<' + this.partial + ch });
        this.partial = '';
        this.state = STATE_NORMAL;
        return;
      }
      this.partial += ch;
      return;
    }
    if (this.state === STATE_OPAQUE) {
      this.currentBuf += ch;
      var closeMarker = '</' + this.currentTag + '>';
      if (this.currentBuf.length >= closeMarker.length &&
          this.currentBuf.substring(this.currentBuf.length - closeMarker.length) === closeMarker) {
        var full = this.currentBuf.slice(0, -closeMarker.length);
        this.events.push({ type: 'tag-chunk', tag: this.currentTag, chunk: ch });
        this.events.push({ type: 'tag-close', tag: this.currentTag, full: full });
        this.state = STATE_NORMAL;
        this.currentBuf = '';
        this.currentTag = '';
      } else {
        this.events.push({ type: 'tag-chunk', tag: this.currentTag, chunk: ch });
      }
      return;
    }
    if (this.state === STATE_TAGGED) {
      if (ch === '<') {
        this.state = STATE_BUFFER_TAG;
        this.partial = '';
        return;
      }
      if (this.currentTag === 'option' && ch === '\n') {
        this.events.push({ type: 'option-line', line: this.optionBuf });
        this.optionBuf = '';
      } else if (this.currentTag === 'option') {
        this.optionBuf += ch;
      }
      this.currentBuf += ch;
      this.events.push({ type: 'tag-chunk', tag: this.currentTag, chunk: ch });
      return;
    }
  };

  /**
   * @private
   */
  StreamParser.prototype._flushTagBuffer = function () {
    var tagText = this.partial;
    this.partial = '';
    var isClose = tagText.charAt(0) === '/';
    var name = isClose ? tagText.slice(1) : tagText;

    // Strip attributes from opening tag name (e.g. "var name=\"x\"" → "var")
    var spaceIdx = name.indexOf(' ');
    if (spaceIdx !== -1 && !isClose) {
      name = name.substring(0, spaceIdx);
    }

    if (isClose) {
      if (this.currentTag && this.currentTag === name) {
        // Matching close for the open TAGGED/OPAQUE tag we were inside.
        if (this.currentTag === 'option' && this.optionBuf) {
          this.events.push({ type: 'option-line', line: this.optionBuf });
          this.optionBuf = '';
        }
        this.events.push({ type: 'tag-close', tag: this.currentTag, full: this.currentBuf });
        this.currentBuf = '';
        this.currentTag = '';
        this.state = STATE_NORMAL;
      } else {
        // Stray close for an unrelated tag; pass through as raw.
        this.events.push({ type: 'raw', chunk: '</' + name + '>' });
        this.state = STATE_NORMAL;
      }
      return;
    }

    if (this.tags.indexOf(name) === -1) {
      this.events.push({ type: 'raw', chunk: '<' + name + '>' });
      this.state = STATE_NORMAL;
      return;
    }

    this.currentTag = name;
    this.currentBuf = '';
    this.optionBuf = '';
    this.events.push({ type: 'tag-open', tag: name });
    this.state = (this.opaqueTags.indexOf(name) !== -1) ? STATE_OPAQUE : STATE_TAGGED;
  };

  // ==================================================================
  // Public API — convenience wrappers
  // ==================================================================

  /** Default registered tags (case-insensitive matching) */
  var DEFAULT_TAGS = ['thinking', 'think', 'maintext', 'option', 'sum', 'vars', 'var'];

  /** Default opaque tags — content inside these is NOT parsed for other tags */
  var DEFAULT_OPAQUE_TAGS = ['thinking', 'think'];

  /**
   * Create an empty ParsedTags object.
   * @returns {Object}
   */
  function emptyParsed() {
    return {
      thinking: '',
      maintext: '',
      options: [],
      sum: '',
      varsRaw: '',
      varsCommands: { merge: {} },
      unknown: {}
    };
  }

  /**
   * Aggregate a list of finish events into a ParsedTags object.
   * @param {Array} events
   * @returns {Object} ParsedTags
   */
  function aggregateEvents(events) {
    var parsed = emptyParsed();
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev.type === 'tag-close') {
        if (ev.tag === 'thinking' || ev.tag === 'think') {
          parsed.thinking = ev.full;
        } else if (ev.tag === 'maintext') {
          parsed.maintext = ev.full;
        } else if (ev.tag === 'sum') {
          parsed.sum = ev.full;
        } else if (ev.tag === 'vars') {
          parsed.varsRaw = ev.full;
          if (ST.VarsMerger && ST.VarsMerger.parseVarsBlock) {
            parsed.varsCommands = ST.VarsMerger.parseVarsBlock(ev.full);
          }
        } else if (ev.tag === 'option') {
          // option-line events accumulate options below
        } else {
          parsed.unknown[ev.tag] = ev.full;
        }
      } else if (ev.type === 'option-line') {
        parsed.options.push(ev.line);
      }
    }
    return parsed;
  }

  /**
   * Accumulate streaming events into an existing ParsedTags object.
   * During streaming we append tag-chunk content; tag-close replaces with final full.
   * @param {Object} parsed - ParsedTags object to mutate
   * @param {Array} events
   */
  function accumulateEvents(parsed, events) {
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev.type === 'tag-chunk') {
        if (ev.tag === 'thinking' || ev.tag === 'think') {
          parsed.thinking += ev.chunk;
        } else if (ev.tag === 'maintext') {
          parsed.maintext += ev.chunk;
        } else if (ev.tag === 'sum') {
          parsed.sum += ev.chunk;
        } else if (ev.tag === 'vars') {
          parsed.varsRaw += ev.chunk;
        } else if (ev.tag === 'option') {
          // option content is line-based, handled by option-line events
        } else {
          if (!parsed.unknown[ev.tag]) parsed.unknown[ev.tag] = '';
          parsed.unknown[ev.tag] += ev.chunk;
        }
      } else if (ev.type === 'tag-close') {
        if (ev.tag === 'thinking' || ev.tag === 'think') {
          parsed.thinking = ev.full;
        } else if (ev.tag === 'maintext') {
          parsed.maintext = ev.full;
        } else if (ev.tag === 'sum') {
          parsed.sum = ev.full;
        } else if (ev.tag === 'vars') {
          parsed.varsRaw = ev.full;
          if (ST.VarsMerger && ST.VarsMerger.parseVarsBlock) {
            parsed.varsCommands = ST.VarsMerger.parseVarsBlock(ev.full);
          }
        } else if (ev.tag === 'option') {
          // option-line already handled
        } else {
          parsed.unknown[ev.tag] = ev.full;
        }
      } else if (ev.type === 'option-line') {
        parsed.options.push(ev.line);
      }
    }
  }

  // ==================================================================
  // Exported namespace
  // ==================================================================

  return {
    /** @type {string[]} Custom tags that can be set by settings */
    tags: DEFAULT_TAGS.slice(),

    /** @type {string[]} Custom opaque tags that can be set by settings */
    opaqueTags: DEFAULT_OPAQUE_TAGS.slice(),

    /**
     * Parse a complete text — convenience wrapper that creates a parser,
     * feeds all text, finishes, and returns aggregated ParsedTags.
     *
     * @param {string} text - complete AI reply text to parse
     * @param {Object} [options]
     * @param {string[]} [options.tags] - override registered tags
     * @param {string[]} [options.opaqueTags] - override opaque tags
     * @returns {Object} ParsedTags with { thinking, maintext, options[], sum, varsRaw, varsCommands, unknown }
     */
    parse: function (text, options) {
      var tags = (options && options.tags) ? options.tags : this.tags;
      var opaqueTags = (options && options.opaqueTags) ? options.opaqueTags : this.opaqueTags;
      var parser = new StreamParser(tags, opaqueTags);
      // Convert tag names to lowercase for case-insensitive matching
      parser.tags = tags.map(function (t) { return t.toLowerCase(); });
      parser.opaqueTags = opaqueTags.map(function (t) { return t.toLowerCase(); });
      parser.feed(text);
      var events = parser.finish();
      return aggregateEvents(events);
    },

    /**
     * Feed a chunk for incremental / streaming parse.
     * Call this repeatedly as chunks arrive. The state object tracks
     * the internal parser and accumulated results.
     *
     * @param {string} chunk - incoming text chunk
     * @param {Object} state - mutable state object (create via `{}` on first call)
     * @returns {Object} the same state object, now updated with new `parsed` results
     *
     * @example
     * var state = {};
     * while (chunksArrive) {
     *   ST.StreamParser.parseChunk(nextChunk, state);
     *   console.log(state.parsed.maintext); // partial
     * }
     * // When done:
     * ST.StreamParser.finishChunk(state);
     * console.log(state.parsed); // final
     */
    parseChunk: function (chunk, state) {
      if (!state._parser) {
        var tags = (state._tags || this.tags).map(function (t) { return t.toLowerCase(); });
        var opaqueTags = (state._opaqueTags || this.opaqueTags).map(function (t) { return t.toLowerCase(); });
        state._parser = new StreamParser(tags, opaqueTags);
        state.parsed = emptyParsed();
      }
      var events = state._parser.feed(chunk);
      accumulateEvents(state.parsed, events);
      return state;
    },

    /**
     * Finish a streaming parse — flushes any open tag and finalizes results.
     * @param {Object} state - same object passed to parseChunk()
     * @returns {Object} the final ParsedTags
     */
    finishChunk: function (state) {
      if (!state._parser) {
        state.parsed = emptyParsed();
        return state.parsed;
      }
      var events = state._parser.finish();
      accumulateEvents(state.parsed, events);
      return state.parsed;
    },

    /**
     * Reset a streaming parse state so it can be reused.
     * @param {Object} state
     */
    resetChunk: function (state) {
      delete state._parser;
      state.parsed = emptyParsed();
    },

    /**
     * Internal parser constructor, exposed for advanced use.
     * @type {Function}
     */
    _Parser: StreamParser,

    /**
     * @private Aggregate finish events → ParsedTags
     */
    _aggregateEvents: aggregateEvents
  };
})();
