/**
 * Prompt Assembler — Vanilla JavaScript
 * Builds an OpenAI-compatible messages array from SillyTavern preset config,
 * chat history, matched lorebook entries, macros, and variables.
 *
 * @module silltyavern/prompt-assembler
 */
(function () {
  'use strict';

  // Ensure namespace
  window.ST = window.ST || {};

  // ========================================================================
  // Utilities (bundled here to avoid cross-file imports)
  // ========================================================================

  /**
   * Format variables as a human-readable prompt block.
   * @param {Object<string, string|number>} variables
   * @returns {string}
   */
  function formatVariablesForPrompt(variables) {
    var entries = Object.entries(variables);
    if (entries.length === 0) return '';
    var lines = entries.map(function (pair) {
      return pair[0] + ': ' + pair[1];
    });
    return '[当前状态]\n' + lines.join('\n');
  }

  // ========================================================================
  // Macro Replacement
  // ========================================================================

  /**
   * Replace {{user}}, {{char}}, {{original}}, and custom variable macros
   * in a template string.
   *
   * @param {string} template
   * @param {{userName:string, characterName:string, userInput:string,
   *   variables?:Object<string,string|number>}} context
   * @returns {string}
   */
  ST.replaceMacros = function (template, context) {
    if (!template) return '';

    var result = template
      .replace(/\{\{user\}\}/g, context.userName || '')
      .replace(/\{\{char\}\}/g, context.characterName || '')
      .replace(/\{\{original\}\}/g, context.userInput || '');

    // Replace {{variableName}} with variable values
    if (context.variables) {
      result = result.replace(/\{\{([^{}]+)\}\}/g, function (match, key) {
        var trimmed = key.trim();
        var value = context.variables[trimmed];
        return value !== undefined ? String(value) : match;
      });
    }

    return result;
  };

  // ========================================================================
  // Main Assembler
  // ========================================================================

  /**
   * Assemble a full prompt into OpenAI-compatible messages.
   *
   * @param {Object} options
   * @param {string} options.userInput — latest user message
   * @param {Object[]} options.history — array of ChatMessage objects {role, content, …}
   * @param {Object} options.preset — ChatPreset with settings.prompt_order, settings.prompts, etc.
   * @param {Object[]} options.lorebooks — array of lorebook objects for matching
   * @param {string} options.userName
   * @param {string} options.characterName
   * @param {Object<string,string|number>} [options.variables]
   * @param {Object<string,*>} [options.extraVariables]
   * @param {string} [options.formatPrompt] — format prompt to append at the end
   * @returns {{messages:Array<{role:string,content:string}>, matchedEntries:Object[],
   *   systemPrompt:string}}
   */
  ST.assemblePrompt = function (options) {
    var userInput      = options.userInput || '';
    var history        = options.history || [];
    var preset         = options.preset || {};
    var lorebooks      = options.lorebooks || [];
    var userName       = options.userName || 'User';
    var characterName  = options.characterName || 'Character';
    var variables      = options.variables || {};
    var extraVariables = options.extraVariables || {};
    var formatPrompt   = options.formatPrompt || '';

    // ---- Lorebook matching ----
    var allMatchedEntries = [];
    if (lorebooks.length > 0 && ST.matchLorebooks) {
      // Build scan text from user input + recent history
      var recentContents = history.slice(-3).map(function (m) { return m.content || ''; }).join(' ');
      var scanText = userInput + ' ' + recentContents;
      allMatchedEntries = ST.matchLorebooks(scanText, lorebooks, { maxDepth: 3 });
    }

    // ---- Context window budgeting ----
    var presetSettings = preset.settings || {};
    var maxContextTokens = presetSettings.openai_max_context
                        || presetSettings.max_length
                        || 4096;
    var currentTokens = 0;

    var recentHistory = [];
    for (var i = history.length - 1; i >= 0; i--) {
      var msg = history[i];
      if (msg.role === 'system') continue;
      var msgTokens = (msg.content ? msg.content.length : 0) / 4; // rough estimate
      if (currentTokens + msgTokens > maxContextTokens * 0.8) break;
      recentHistory.unshift({ role: msg.role, content: msg.content });
      currentTokens += msgTokens;
    }

    // ---- Prompt order & prompts ----
    var promptOrder = presetSettings.prompt_order || [];
    var prompts     = presetSettings.prompts || [];

    /**
     * Resolve the string content for a given prompt_order identifier.
     * @param {string} identifier
     * @returns {string|null}
     */
    function resolvePromptContent(identifier) {
      // world info (lorebook content)
      if (identifier === 'worldInfoBefore' || identifier === 'worldInfoAfter') {
        var content = allMatchedEntries.map(function (e) { return e.entry.content; }).join('\n\n');
        return content || null;
      }
      // Character / persona / scenario fields
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
        return null; // bias is not a text prompt
      }

      // Custom prompts in the prompts array
      for (var p = 0; p < prompts.length; p++) {
        if (prompts[p].identifier === identifier && prompts[p].content) {
          return prompts[p].content;
        }
      }

      // Direct fields on preset.settings (main, nsfw, jailbreak, etc.)
      var direct = presetSettings[identifier];
      if (typeof direct === 'string' && direct.trim()) return direct;

      return null;
    }

    // ---- Assembly ----
    var assembledMessages = [];
    var systemAccumulator = '';
    var hasChatHistory = false;

    for (var o = 0; o < promptOrder.length; o++) {
      var item = promptOrder[o];
      if (item.enabled === false) continue;

      if (item.identifier === 'chatHistory') {
        hasChatHistory = true;
        // Flush accumulated system text
        if (systemAccumulator) {
          assembledMessages.push({ role: 'system', content: systemAccumulator });
          systemAccumulator = '';
        }
        // Inject history messages
        assembledMessages = assembledMessages.concat(recentHistory);
        continue;
      }

      var rawContent = resolvePromptContent(item.identifier);
      if (!rawContent) continue;

      var content = ST.replaceMacros(rawContent, {
        userName: userName,
        characterName: characterName,
        userInput: userInput,
        variables: variables,
      });
      if (!content.trim()) continue;

      var role = item.role || 'system';
      if (role === 'system') {
        systemAccumulator += (systemAccumulator ? '\n\n' : '') + content;
      } else {
        if (systemAccumulator) {
          assembledMessages.push({ role: 'system', content: systemAccumulator });
          systemAccumulator = '';
        }
        assembledMessages.push({ role: role, content: content });
      }
    }

    // ---- Variables block ----
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

    // ---- Format prompt (output instructions) ----
    if (formatPrompt) {
      systemAccumulator += (systemAccumulator ? '\n\n' : '') + formatPrompt;
    }

    // Flush remaining system accumulator
    if (systemAccumulator) {
      // Prepend so system prompt is first
      assembledMessages.unshift({ role: 'system', content: systemAccumulator });
    }

    // ---- Fallback: append history if prompt_order didn't include it ----
    if (!hasChatHistory) {
      assembledMessages = assembledMessages.concat(recentHistory);
    }

    // ---- Always append current user input as final message ----
    assembledMessages.push({ role: 'user', content: userInput });

    // ---- Build combined system prompt string (for display / debugging) ----
    var systemPrompt = assembledMessages
      .filter(function (m) { return m.role === 'system'; })
      .map(function (m) { return m.content; })
      .join('\n\n');

    // ---- Estimate token count (rough) ----
    var totalCharCount = 0;
    for (var a = 0; a < assembledMessages.length; a++) {
      totalCharCount += assembledMessages[a].content ? assembledMessages[a].content.length : 0;
    }
    var promptTokens = Math.ceil(totalCharCount / 4);

    return {
      messages: assembledMessages,
      matchedEntries: allMatchedEntries,
      systemPrompt: systemPrompt,
      promptTokens: promptTokens,
    };
  };

  console.log('[ST.prompt-assembler] Prompt assembler initialized');
})();
