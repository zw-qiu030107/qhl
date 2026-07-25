/**
 * Prompt Assembler — Vanilla JavaScript
 *
 * Builds an OpenAI-compatible messages array from SillyTavern preset
 * configuration, chat history, matched lorebook entries, macros, and
 * user variables.
 *
 * The assembly process:
 *   1. Scan user input against lorebooks to find matching entries
 *   2. Truncate chat history to fit within the context window budget
 *   3. Iterate through the preset's prompt_order list, resolving each
 *      identifier to its text content
 *   4. Accumulate system messages, inject chat history at the correct
 *      position, and append the user input as the final message
 *   5. Return the messages array along with metadata
 *
 * @module sillytavern/prompt-assembler
 */
(function () {
  'use strict';

  // Ensure namespace
  window.ST = window.ST || {};

  // =========================================================================
  // Internal Utilities
  // =========================================================================

  /**
   * Format a variables object as a human-readable prompt block.
   *
   * @param {Object<string, (string|number)>} variables — Key-value pairs
   * @returns {string} Formatted string like "[当前状态]\nk: v\n..."
   *   Returns empty string if the variables object is empty.
   */
  function formatVariablesForPrompt(variables) {
    var entries = Object.entries(variables);
    if (entries.length === 0) {
      return '';
    }
    var lines = entries.map(function (pair) {
      return pair[0] + ': ' + pair[1];
    });
    return '[当前状态]\n' + lines.join('\n');
  }

  /**
   * Roughly estimate the token count of a string.
   * Uses the common heuristic of characters / 4.
   *
   * @param {string} text
   * @returns {number} Estimated token count
   */
  function estimateTokens(text) {
    if (!text) {
      return 0;
    }
    return Math.ceil(text.length / 4);
  }

  // =========================================================================
  // Macro Replacement
  // =========================================================================

  /**
   * Replace {{user}}, {{char}}, {{original}}, and custom variable macros
   * in a template string.
   *
   * @param {string} template — The template string containing macros
   * @param {Object} context — Replacement context
   * @param {string} context.userName — Replaces {{user}}
   * @param {string} context.characterName — Replaces {{char}}
   * @param {string} context.userInput — Replaces {{original}}
   * @param {Object<string, (string|number)>} [context.variables] — Custom
   *   variables to replace {{variableName}} patterns
   * @returns {string} Template with all macros replaced
   */
  ST.replaceMacros = function (template, context) {
    if (!template) {
      return '';
    }

    var result = template
      .replace(/\{\{user\}\}/g, context.userName || '')
      .replace(/\{\{char\}\}/g, context.characterName || '')
      .replace(/\{\{original\}\}/g, context.userInput || '');

    // Replace {{variableName}} with variable values from context.variables
    if (context.variables && typeof context.variables === 'object') {
      result = result.replace(/\{\{([^{}]+)\}\}/g, function (match, key) {
        var trimmed = key.trim();
        var value = context.variables[trimmed];
        return value !== undefined ? String(value) : match;
      });
    }

    return result;
  };

  // =========================================================================
  // Main Assembler
  // =========================================================================

  /**
   * Assemble a full prompt into OpenAI-compatible messages.
   *
   * This is the core function that transforms raw input data into a
   * structured messages array ready for API submission.
   *
   * @param {Object} options — Assembly options
   * @param {string} options.userInput — The latest user message text
   * @param {Object[]} options.history — Array of ChatMessage objects
   *   with {role, content} fields
   * @param {Object} options.preset — Chat preset with settings.prompt_order,
   *   settings.prompts, and other text fields
   * @param {Object[]} options.lorebooks — Array of lorebook objects for matching
   * @param {string} options.userName — The user's display name
   * @param {string} options.characterName — The AI character's name
   * @param {Object<string, (string|number)>} [options.variables] — Current
   *   game-state variables
   * @param {Object<string, *>} [options.extraVariables] — Additional variables
   *   to inject
   * @param {string} [options.formatPrompt] — Output format instructions
   *   appended at the end of the system prompt
   * @returns {{
   *   messages: Array<{role: string, content: string}>,
   *   matchedEntries: Object[],
   *   systemPrompt: string,
   *   promptTokens: number
   * }}
   */
  ST.assemblePrompt = function (options) {
    // --- Destructure options with defaults ---
    var userInput      = options.userInput || '';
    var history        = options.history || [];
    var preset         = options.preset || {};
    var lorebooks      = options.lorebooks || [];
    var userName       = options.userName || 'User';
    var characterName  = options.characterName || 'Character';
    var variables      = options.variables || {};
    var extraVariables = options.extraVariables || {};
    var formatPrompt   = options.formatPrompt || '';

    var presetSettings = preset.settings || {};
    var promptOrder    = presetSettings.prompt_order || [];
    var prompts        = presetSettings.prompts || [];

    // =====================================================================
    // Step 1: Lorebook Matching
    // =====================================================================

    var allMatchedEntries = [];

    if (lorebooks.length > 0 && typeof ST.matchLorebooks === 'function') {
      // Build scan text from user input + recent history for context
      var recentContents = history.slice(-3).map(function (m) {
        return m.content || '';
      }).join(' ');

      var scanText = userInput + ' ' + recentContents;

      allMatchedEntries = ST.matchLorebooks(scanText, lorebooks, {
        maxDepth: 3,
      });
    }

    // =====================================================================
    // Step 2: Context Window Budgeting
    // =====================================================================

    var maxContextTokens = presetSettings.openai_max_context
                        || presetSettings.max_length
                        || 4096;

    var currentTokens = 0;
    var recentHistory = [];

    // Walk history backwards, prepending messages that fit in budget
    for (var i = history.length - 1; i >= 0; i--) {
      var msg = history[i];

      // Skip system messages from history (they are regenerated from preset)
      if (msg.role === 'system') {
        continue;
      }

      var msgTokens = estimateTokens(msg.content);

      // Reserve 20% of context for the system prompt and new user input
      if (currentTokens + msgTokens > maxContextTokens * 0.8) {
        break;
      }

      recentHistory.unshift({ role: msg.role, content: msg.content });
      currentTokens += msgTokens;
    }

    // =====================================================================
    // Step 3: Prompt Content Resolution
    // =====================================================================

    /**
     * Resolve the text content for a given prompt_order identifier.
     * Looks up the identifier across lorebook content, preset fields,
     * custom prompts, and direct settings keys.
     *
     * @param {string} identifier — The prompt_order identifier
     * @returns {string|null} The resolved content, or null if not found
     */
    function resolvePromptContent(identifier) {
      // --- Lorebook world info blocks ---
      if (identifier === 'worldInfoBefore' || identifier === 'worldInfoAfter') {
        var content = allMatchedEntries.map(function (e) {
          return e.entry.content;
        }).join('\n\n');
        return content || null;
      }

      // --- Character / persona / scenario fields ---
      if (identifier === 'charDescription') {
        return presetSettings.character_description || null;
      }
      if (identifier === 'charPersonality') {
        return presetSettings.character_personality || null;
      }
      if (identifier === 'scenario') {
        return presetSettings.scenario || presetSettings.scenario_format || null;
      }
      if (identifier === 'personaDescription') {
        return presetSettings.persona_description || null;
      }
      if (identifier === 'dialogueExamples') {
        return presetSettings.dialogue_examples || null;
      }
      if (identifier === 'groupNudge') {
        return presetSettings.group_nudge_prompt || null;
      }
      if (identifier === 'impersonate') {
        return presetSettings.impersonation_prompt || null;
      }
      if (identifier === 'quietPrompt') {
        return presetSettings.quiet_prompt || null;
      }
      if (identifier === 'bias') {
        return null; // bias is a non-text configuration
      }

      // --- Custom prompts in the prompts array ---
      for (var p = 0; p < prompts.length; p++) {
        if (prompts[p].identifier === identifier && prompts[p].content) {
          return prompts[p].content;
        }
      }

      // --- Direct fields on preset.settings (main, nsfw, jailbreak, etc.) ---
      var direct = presetSettings[identifier];
      if (typeof direct === 'string' && direct.trim()) {
        return direct;
      }

      return null;
    }

    // =====================================================================
    // Step 4: Assemble Messages Array
    // =====================================================================

    var assembledMessages = [];
    var systemAccumulator = '';
    var hasChatHistory = false;

    for (var o = 0; o < promptOrder.length; o++) {
      var item = promptOrder[o];

      // Skip disabled prompt order entries
      if (item.enabled === false) {
        continue;
      }

      // Handle chatHistory injection point
      if (item.identifier === 'chatHistory') {
        hasChatHistory = true;

        // Flush accumulated system text before injecting history
        if (systemAccumulator) {
          assembledMessages.push({ role: 'system', content: systemAccumulator });
          systemAccumulator = '';
        }

        // Inject the recent history messages
        assembledMessages = assembledMessages.concat(recentHistory);
        continue;
      }

      // Resolve and process the content for this identifier
      var rawContent = resolvePromptContent(item.identifier);
      if (!rawContent) {
        continue;
      }

      // Replace macros with current context
      var content = ST.replaceMacros(rawContent, {
        userName: userName,
        characterName: characterName,
        userInput: userInput,
        variables: variables,
      });

      if (!content.trim()) {
        continue;
      }

      var role = item.role || 'system';

      if (role === 'system') {
        // Accumulate consecutive system messages to reduce API message count
        systemAccumulator += (systemAccumulator ? '\n\n' : '') + content;
      } else {
        // Non-system messages flush the accumulator and are added directly
        if (systemAccumulator) {
          assembledMessages.push({ role: 'system', content: systemAccumulator });
          systemAccumulator = '';
        }
        assembledMessages.push({ role: role, content: content });
      }
    }

    // =====================================================================
    // Step 5: Variables Block
    // =====================================================================

    var varsBlock = formatVariablesForPrompt(variables);
    if (varsBlock) {
      systemAccumulator += (systemAccumulator ? '\n\n' : '') + varsBlock;
    }

    if (extraVariables && Object.keys(extraVariables).length > 0) {
      var extraBlock = formatVariablesForPrompt(extraVariables);
      if (extraBlock) {
        systemAccumulator += (systemAccumulator ? '\n\n' : '') + extraBlock;
      }
    }

    // =====================================================================
    // Step 6: Format Prompt (Output Instructions)
    // =====================================================================

    if (formatPrompt) {
      systemAccumulator += (systemAccumulator ? '\n\n' : '') + formatPrompt;
    }

    // =====================================================================
    // Step 7: Finalize Messages
    // =====================================================================

    // Flush remaining system accumulator — prepend so system prompt is first
    if (systemAccumulator) {
      assembledMessages.unshift({ role: 'system', content: systemAccumulator });
    }

    // Fallback: append history if prompt_order didn't include it
    if (!hasChatHistory) {
      assembledMessages = assembledMessages.concat(recentHistory);
    }

    // Always append current user input as the final message
    assembledMessages.push({ role: 'user', content: userInput });

    // =====================================================================
    // Step 8: Build Metadata
    // =====================================================================

    // Combined system prompt string (for display / debugging)
    var systemPrompt = assembledMessages
      .filter(function (m) { return m.role === 'system'; })
      .map(function (m) { return m.content; })
      .join('\n\n');

    // Estimate total token count
    var totalCharCount = 0;
    for (var a = 0; a < assembledMessages.length; a++) {
      if (assembledMessages[a].content) {
        totalCharCount += assembledMessages[a].content.length;
      }
    }
    var promptTokens = estimateTokens(String(totalCharCount));

    return {
      messages: assembledMessages,
      matchedEntries: allMatchedEntries,
      systemPrompt: systemPrompt,
      promptTokens: promptTokens,
    };
  };

  // =========================================================================
  // Init
  // =========================================================================

  console.log('[ST.prompt-assembler] Prompt assembler initialized');
})();
