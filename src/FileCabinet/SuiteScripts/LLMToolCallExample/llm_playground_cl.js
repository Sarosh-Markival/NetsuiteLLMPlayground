/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @description Client script for LLM Playground - Modern UI
 */
define([
  "N/currentRecord",
  "N/ui/message",
  "./constants",
  "./llm_client_api",
  "./llm_tools",
], function (currentRecord, message, constants, llmApi, llmTools) {
  let fullChatHistory = []; // Store complete history
  let isRequestInProgress = false;
  let availableTools = { ...constants.DEFAULT_TOOLS_CONFIG }; // Clone the default tools config
  let currentAttachedImage = null; // Store current attached image

  // Initialize system prompt in chat history
  function initializeSystemPrompt() {
    // Preserve existing history if any
    const existingHistory = fullChatHistory.slice(1); // everything except system prompt

    // Get only enabled tools
    const enabledTools = Object.keys(llmTools.TOOL_DEFINITIONS).filter(
      (tool) => availableTools[tool]
    );

    console.log("Enabled tools:", enabledTools);

    // Build tools documentation string only for enabled tools
    const toolsDoc = enabledTools
      .map((tool) => {
        const toolDef = llmTools.TOOL_DEFINITIONS[tool];
        const args = toolDef.args.properties;
        const argDescriptions = Object.entries(args)
          .map(([argName, argDef]) => {
            const required = toolDef.args.required?.includes(argName);
            const defaultValue = argDef.default
              ? ` (default: ${argDef.default})`
              : "";
            return `    - ${argName} (${argDef.type})${
              required ? " (Required)" : " (Optional)"
            }${defaultValue}: ${argDef.description}`;
          })
          .join("\n");

        return `\n- ${tool}: ${toolDef.description}\n  Arguments:\n${argDescriptions}`;
      })
      .join("\n");

    // Create the new chat history with system prompt
    fullChatHistory = [
      {
        role: constants.ChatRole.USER, // Changed to USER role
        text:
          constants.DEFAULT_SYSTEM_PROMPT + "\n\nAvailable tools: " + toolsDoc,
      },
      ...existingHistory,
    ];

    console.log("Initialized system prompt in chat history");
    console.log("Enabled tools:", enabledTools);
    console.log("Full chat history:", fullChatHistory);
  }

  /**
   * Get the current chat history, preserving system prompt and image context
   * @returns {Array} The current chat history
   */
  function getCurrentChatHistory() {
    const maxHistory = parseInt(jQuery("#maxHistory").val());

    // If there's no chat history at all, initialize it once
    if (!fullChatHistory.length) {
      initializeSystemPrompt();
      return fullChatHistory; // Return the newly initialized history
    }

    // Get the first message which should be the system prompt
    const systemPrompt = fullChatHistory[0];

    // Get non-system messages (all messages except system prompts)
    const nonSystemMessages = fullChatHistory.filter(
      (msg) => msg.role !== constants.ChatRole.USER
    );

    // Get the most recent messages within the limit
    const recentMessages = nonSystemMessages.slice(
      -Math.max(0, maxHistory - 1)
    );

    // Combine system prompt with recent messages
    const finalHistory = [systemPrompt, ...recentMessages];

    console.log("Current chat history:", {
      maxHistory,
      totalMessages: finalHistory.length,
      systemPrompt: finalHistory[0].text.substring(0, 50) + "...",
      messageCount: recentMessages.length,
    });

    return finalHistory;
  }

  /**
   * Function to be executed after page is initialized.
   */
  function pageInit(context) {
    jQuery(document).ready(function () {
      try {
        setupEventHandlers();
        setupModelSettings();
        setupImageHandling();
      } catch (e) {
        console.error("Error in pageInit:", e);
        showError(e.message);
      }
    });
  }

  /**
   * Setup all event handlers for the UI
   */
  function setupEventHandlers() {
    // Prevent form submissions
    jQuery("form").on("submit", function (e) {
      e.preventDefault();
    });

    // Chat input auto-grow
    jQuery("#chatInput").on("input", function () {
      this.style.height = "0";
      this.style.height = Math.min(this.scrollHeight, 5 * 24) + "px";
    });

    // Send on Ctrl+Enter
    jQuery("#chatInput").on("keydown", function (e) {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleSendMessage();
      }
    });

    // Send button click
    jQuery("#sendBtn").on("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      handleSendMessage();
      return false;
    });

    // Clear chat
    jQuery("#clearButton").on("click", function (e) {
      e.preventDefault();
      jQuery("#chatMessages").empty();
      initializeSystemPrompt();
    });

    // Generate embeddings
    jQuery("#generateEmbeddings").on("click", function (e) {
      e.preventDefault();
      handleGenerateEmbeddings();
    });

    // View History button
    jQuery("#viewHistoryBtn").on("click", function (e) {
      e.preventDefault();
      updateHistoryPreview();
      jQuery("#historyCollapse").collapse("toggle");
    });

    // Handle saving model settings
    jQuery("#saveSettings").on("click", function () {
      // Update available tools
      Object.keys(llmTools.TOOL_DEFINITIONS).forEach((toolName) => {
        availableTools[toolName] = jQuery(`#tool_${toolName}`).prop("checked");
      });

      // Update system prompt with new tools
      const systemMsg = fullChatHistory.find(
        (msg) => msg.role === constants.ChatRole.SYSTEM
      );
      if (systemMsg) {
        systemMsg.text =
          constants.DEFAULT_SYSTEM_PROMPT +
          "\n\nAvailable tools: " +
          Object.keys(llmTools.TOOL_DEFINITIONS)
            .filter((tool) => availableTools[tool])
            .map(
              (tool) =>
                `\n- ${tool}: ${llmTools.TOOL_DEFINITIONS[tool].description}`
            )
            .join("");
      }

      updateHistoryPreview();
    });

    // History limit change
    jQuery("#maxHistory").on("change", function () {
      updateHistoryPreview();
    });
  }

  /**
   * Setup model settings dropdowns, tools, and default values
   */
  function setupModelSettings() {
    // Populate model family dropdowns
    populateDropdown("#modelFamily", constants.ModelFamily);
    populateDropdown("#embedModelFamily", constants.EmbedModelFamily);
    populateDropdown("#truncate", constants.Truncate);

    // Set default values from ParameterLimits
    jQuery("#temperature").val(constants.ParameterLimits.temperature.default);
    jQuery("#maxTokens").val(constants.ParameterLimits.maxTokens.default);
    jQuery("#topK").val(constants.ParameterLimits.topK.default);
    jQuery("#topP").val(constants.ParameterLimits.topP.default);
    jQuery("#frequencyPenalty").val(
      constants.ParameterLimits.frequencyPenalty.default
    );
    jQuery("#presencePenalty").val(
      constants.ParameterLimits.presencePenalty.default
    );

    // Setup tool checkboxes
    const toolsContainer = jQuery(".tools-container");
    toolsContainer.empty();

    Object.entries(llmTools.TOOL_DEFINITIONS).forEach(([toolName, tool]) => {
      const checkbox = jQuery(`<div class="form-check">
        <input class="form-check-input" type="checkbox" id="tool_${toolName}" 
               ${availableTools[toolName] ? "checked" : ""}>
        <label class="form-check-label" for="tool_${toolName}">${toolName}</label>
        <small class="d-block text-muted">${tool.description}</small>
      </div>`);
      toolsContainer.append(checkbox);

      // Add change handler to update availableTools when checkbox state changes
      jQuery(`#tool_${toolName}`).on("change", function () {
        availableTools[toolName] = this.checked;
        // Update system prompt to reflect new tool availability
        initializeSystemPrompt();
      });
    });

    // Update availableTools based on initial checkbox states
    Object.keys(llmTools.TOOL_DEFINITIONS).forEach((toolName) => {
      availableTools[toolName] = jQuery(`#tool_${toolName}`).prop("checked");
    });

    // Initialize system prompt
    initializeSystemPrompt();
  }

  /**
   * Populate a dropdown with enum values
   */
  function populateDropdown(selector, enumObj) {
    const dropdown = jQuery(selector);
    dropdown.empty();

    Object.entries(enumObj).forEach(([key, value]) => {
      dropdown.append(new Option(key, value));
    });
  }

  /**
   * Update the chat history preview
   */
  function updateHistoryPreview() {
    const currentHistory = getCurrentChatHistory();
    const preview = currentHistory
      .map(
        (msg) =>
          `${msg.role}: ${msg.text.substring(0, 100)}${
            msg.text.length > 100 ? "..." : ""
          }`
      )
      .join("\n");

    const hiddenCount = Math.max(
      0,
      fullChatHistory.length - currentHistory.length
    );
    const previewText = preview || "No chat history yet";
    const hiddenText =
      hiddenCount > 0 ? `\n(${hiddenCount} older messages are hidden)` : "";

    jQuery("#historyPreview").text(previewText + hiddenText);
  }

  /**
   * Handle send message button click
   */
  async function handleSendMessage() {
    if (isRequestInProgress) return;

    const $input = jQuery("#chatInput");
    const rawPrompt = $input.val().trim();
    const hasImage = Boolean(currentAttachedImage);

    // Prevent empty submissions
    if (!rawPrompt && !hasImage) return;

    // Update system prompt with current tool availability before sending message
    initializeSystemPrompt();

    // Add user message to chat history and UI before image gets cleared
    const userMessage = {
      role: constants.ChatRole.USER,
      text: rawPrompt,
    };
    fullChatHistory.push(userMessage);

    // Store image data for the API request
    const imageData = hasImage
      ? {
          data: currentAttachedImage.data,
          type: currentAttachedImage.type,
          name: currentAttachedImage.name,
        }
      : null;

    // Add user message to chat UI with image preview
    appendMessage(rawPrompt, "user", currentAttachedImage?.data);

    // Build message text with image context
    const messageText = hasImage
      ? `${rawPrompt}\n[User shared an image: ${currentAttachedImage.name} (${currentAttachedImage.type})]`
      : rawPrompt;

    /* -------------------------------------------------------------------------- */
    /*                       2. Reset input & image preview                       */
    /* -------------------------------------------------------------------------- */
    resetInput($input);
    resetImagePreview(); // This clears currentAttachedImage, so we stored it above

    /* -------------------------------------------------------------------------- */
    /*                           3. Build model config                            */
    /* -------------------------------------------------------------------------- */
    const modelSettings = buildModelSettings(hasImage);

    /* -------------------------------------------------------------------------- */
    /*                          4. Send request to LLM                            */
    /* -------------------------------------------------------------------------- */
    isRequestInProgress = true;
    updateUIState();

    try {
      const response = await llmApi.generateChat(
        messageText,
        getCurrentChatHistory(),
        {
          ...modelSettings,
          image: imageData, // Use stored image data instead of currentAttachedImage which is now cleared
        }
      );

      if (!response.success) {
        throw new Error(response.message || "Unknown error");
      }

      await handleLLMResponse(response, modelSettings);
    } catch (err) {
      console.error("Chat Error:", err);
      appendMessage(err.message || "An error occurred", "error");
    } finally {
      isRequestInProgress = false;
      updateUIState();
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                  Helpers                                   */
  /* -------------------------------------------------------------------------- */

  function resetInput($input) {
    $input.val("").trigger("input");
  }

  function resetImagePreview() {
    if (!currentAttachedImage) return;
    jQuery("#imagePreviewArea").addClass("d-none");
    jQuery("#attachedImagePreview").attr("src", "");
    jQuery("#imageInput").val("");
    currentAttachedImage = null;
  }

  function buildModelSettings(hasImage) {
    const isStreaming = jQuery("#streamOutput").val() === "stream";
    return {
      modelFamily: hasImage
        ? constants.ModelFamily.META_LLAMA_VISION
        : jQuery("#modelFamily").val(),
      isStreaming,
      modelParameters: {
        temperature: +jQuery("#temperature").val(),
        maxTokens: +jQuery("#maxTokens").val(),
        topK: +jQuery("#topK").val(),
        topP: +jQuery("#topP").val(),
        frequencyPenalty: +jQuery("#frequencyPenalty").val(),
        presencePenalty: +jQuery("#presencePenalty").val(),
      },
    };
  }

  async function handleLLMResponse(response, modelSettings) {
    let botText = response.text;
    fullChatHistory = response.chatHistory || fullChatHistory;

    // Detect tool call
    const parsed = safeJSONParse(botText);
    if (parsed?.isToolCall) {
      await handleToolCall(parsed, modelSettings);
      return;
    }

    if (modelSettings.isStreaming && response.tokens) {
      await streamTokens(response.tokens, response.remainingUsage);
    } else {
      appendMessage(botText, "bot", null, response.remainingUsage);
    }
  }

  async function handleToolCall(toolCall, modelSettings) {
    appendMessage("Calling NetSuite tool...", "system", null, null, {
      toolName: toolCall.toolName,
      args: toolCall.args,
    });

    const toolResult = await simulateToolCall(toolCall);

    appendMessage("Tool execution completed. Processing results...", "system");

    const followUp = await llmApi.generateChat(
      `Tool ${toolCall.toolName} returned: ${JSON.stringify(
        toolResult
      )}. Please interpret these results.`,
      getCurrentChatHistory(),
      modelSettings
    );

    if (!followUp.success) {
      throw new Error("Failed to interpret tool results");
    }

    fullChatHistory = followUp.chatHistory || fullChatHistory;
    appendMessage(followUp.text, "bot", null, followUp.remainingUsage);
  }

  function safeJSONParse(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async function streamTokens(tokens, remainingUsage) {
    const chatBubble = jQuery("<div>").addClass("message bot");
    const textEl = jQuery("<div>").addClass("message-text");
    chatBubble
      .append(textEl)
      .append(
        jQuery("<div>")
          .addClass("message-icon")
          .append(jQuery("<i>").addClass("fas fa-robot"))
      );

    if (remainingUsage !== undefined) {
      chatBubble.append(
        jQuery("<div>")
          .addClass("usage-info")
          .html(
            `<small class="text-muted"><i class="fas fa-bolt"></i> Remaining usage: ${remainingUsage}</small>`
          )
      );
    }

    jQuery("#chatMessages").append(chatBubble);

    let streamed = "";
    for (const token of tokens) {
      streamed += token;
      textEl.text(streamed);
      chatBubble[0].scrollIntoView({ behavior: "smooth" });
      await new Promise((r) => setTimeout(r, 30)); // smooth streaming
    }
  }

  /**
   * Handle generate embeddings button click
   */
  async function handleGenerateEmbeddings() {
    if (isRequestInProgress) return;

    const input = jQuery("#embedInput").val().trim();
    if (!input) return;

    const inputs = input.split("\n").filter((line) => line.trim());
    const options = {
      embedModelFamily: jQuery("#embedModelFamily").val(),
      truncate: jQuery("#truncate").val(),
    };

    // Start loading state
    isRequestInProgress = true;
    updateUIState();

    try {
      // Call LLM API with await
      const response = await llmApi.generateEmbeddings(inputs, options);

      if (response.success) {
        jQuery("#embedResponse").text(JSON.stringify(response, null, 2));
      } else {
        jQuery("#embedResponse").text(
          "Error: " + (response.message || "Unknown error occurred")
        );
      }
    } catch (error) {
      console.error("Embeddings Error:", error);
      jQuery("#embedResponse").text(
        "Error: " + (error.message || "An error occurred")
      );
    } finally {
      isRequestInProgress = false;
      updateUIState();
    }
  }

  /**
   * Append a message to the chat window
   */
  function appendMessage(
    text,
    type = "bot",
    imageUrl = null,
    usageInfo = null,
    toolInfo = null
  ) {
    const messageDiv = jQuery("<div>").addClass(`message ${type}`);

    if (imageUrl) {
      const imgElement = jQuery("<img>")
        .attr({
          src: imageUrl,
          alt: "Attached image",
          class: "message-image rounded mb-2",
        })
        .css({
          maxWidth: "200px",
          maxHeight: "200px",
        });
      messageDiv.append(imgElement);
    }

    // Add tool call info if available
    if (toolInfo) {
      const toolCallDiv = jQuery("<div>").addClass("tool-call-info mb-2").css({
        padding: "8px",
        backgroundColor: "#f8f9fa",
        borderRadius: "4px",
        borderLeft: "3px solid #0d6efd",
      });

      const toolHeader = jQuery("<div>")
        .addClass("d-flex align-items-center mb-1")
        .append(
          jQuery("<i>").addClass("fas fa-tools me-2").css("color", "#0d6efd"),
          jQuery("<strong>")
            .text(`Running Tool: ${toolInfo.toolName}`)
            .css("color", "#0d6efd")
        );

      const toolArgs = jQuery("<pre>")
        .addClass("tool-args mb-0 mt-1")
        .css({
          fontSize: "0.85em",
          backgroundColor: "#ffffff",
          padding: "4px",
          border: "1px solid #dee2e6",
          borderRadius: "3px",
        })
        .text(JSON.stringify(toolInfo.args, null, 2));

      toolCallDiv.append(toolHeader, toolArgs);
      messageDiv.append(toolCallDiv);
    }

    const textElement = jQuery("<div>").addClass("message-text").text(text);
    messageDiv.append(textElement);

    // Add usage info if available and it's a bot message
    if (usageInfo && type === "bot") {
      const usageElement = jQuery("<div>")
        .addClass("usage-info")
        .html(
          `<small class="text-muted"><i class="fas fa-bolt"></i> Remaining usage: ${usageInfo}</small>`
        );
      messageDiv.append(usageElement);
    }

    const iconElement = jQuery("<div>")
      .addClass("message-icon")
      .append(
        jQuery("<i>").addClass(
          `fas fa-${
            type === "user"
              ? "user"
              : type === "bot"
              ? "robot"
              : type === "system"
              ? "cog"
              : "exclamation-circle"
          }`
        )
      );
    messageDiv.append(iconElement);

    jQuery("#chatMessages")
      .append(messageDiv)
      .scrollTop(jQuery("#chatMessages")[0].scrollHeight);
  }

  /**
   * Update UI state based on request status
   */
  function updateUIState() {
    const buttons = jQuery("#sendButton, #generateEmbeddings");
    buttons.prop("disabled", isRequestInProgress);
    buttons.find("i").toggleClass("fa-spinner fa-spin", isRequestInProgress);
  }

  /**
   * Show error message
   */
  function showError(msg) {
    message
      .create({
        title: "Error",
        message: msg,
        type: message.Type.ERROR,
      })
      .show();
  }

  /**
   * Setup image handling functionality
   */
  function setupImageHandling() {
    const attachImageBtn = document.getElementById("attachImageBtn");
    const imageInput = document.getElementById("imageInput");
    const imagePreviewArea = document.getElementById("imagePreviewArea");
    const attachedImagePreview = document.getElementById(
      "attachedImagePreview"
    );
    const removeImageBtn = document.getElementById("removeImage");

    attachImageBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      imageInput.click();
    });

    imageInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachedImagePreview.src = e.target.result;
          imagePreviewArea.classList.remove("d-none");
          currentAttachedImage = {
            data: e.target.result,
            type: file.type,
            name: file.name,
          };
        };
        reader.readAsDataURL(file);
      }
    });

    removeImageBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      imagePreviewArea.classList.add("d-none");
      attachedImagePreview.src = "";
      imageInput.value = "";
      currentAttachedImage = null;
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                              Tool Call Simulation                              */
  /* -------------------------------------------------------------------------- */

  /**
   * Simulates execution of a tool call with mock data
   * @param {Object} toolCall - The tool call configuration
   * @param {string} toolCall.toolName - Name of the tool to execute
   * @param {Object} toolCall.args - Arguments for the tool
   * @returns {Promise<Object>} Simulated result data
   */
  async function simulateToolCall(toolCall) {
    // Validate the tool exists in definitions
    const toolDef = llmTools.TOOL_DEFINITIONS[toolCall.toolName];
    if (!toolDef) {
      throw new Error(`Unknown tool: ${toolCall.toolName}`);
    }

    // Add a small delay to simulate processing
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get current date for mock data
    const today = new Date();
    const mockDate = today.toISOString().split("T")[0];

    // Return mock results based on the tool name
    switch (toolCall.toolName) {
      case "searchTransactions":
        return {
          transactions: [
            {
              id: "TRANS123",
              date: mockDate,
              amount: 1500.0,
              type: toolCall.args.type || "invoice",
              status: "completed",
            },
            {
              id: "TRANS124",
              date: mockDate,
              amount: 2300.5,
              type: toolCall.args.type || "invoice",
              status: "pending",
            },
          ],
          totalCount: 2,
          totalAmount: 3800.5,
        };

      case "analyzeCustomer":
        return {
          customerDetails: {
            id: toolCall.args.customerId,
            totalTransactions: 25,
            totalSpent: 25000.0,
            lastPurchaseDate: mockDate,
            segments: ["frequent", "high-value"],
            riskScore: "low",
            lifetimeValue: 25000.0,
          },
        };

      case "getInventoryLevels":
        return {
          items: [
            {
              itemId: "ITEM001",
              name: "Sample Product 1",
              quantityAvailable: 150,
              reorderPoint: 50,
              lastRestockDate: mockDate,
            },
            {
              itemId: "ITEM002",
              name: "Sample Product 2",
              quantityAvailable: 75,
              reorderPoint: 25,
              lastRestockDate: mockDate,
            },
          ],
          warehouseId: toolCall.args.warehouseId || "WH1",
          totalItems: 2,
        };

      case "generateReport":
        return {
          reportId: "REP" + Date.now(),
          type: toolCall.args.reportType,
          status: "completed",
          generatedDate: mockDate,
          url: "https://example.com/reports/mock-report.pdf",
        };

      default:
        // For unknown tools, return a generic response with the provided args
        return {
          status: "simulated",
          toolName: toolCall.toolName,
          timestamp: mockDate,
          args: toolCall.args,
          message: `Simulated response for tool: ${toolCall.toolName}`,
        };
    }
  }

  return {
    pageInit: pageInit,
  };
});
