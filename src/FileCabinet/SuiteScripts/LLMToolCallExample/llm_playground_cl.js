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
    // Preserve existing chat history if any
    const existingHistory = fullChatHistory.slice(1); // everything except system prompt

    fullChatHistory = [
      {
        role: constants.ChatRole.USER, // Changed from CHATBOT to SYSTEM
        text:
          constants.DEFAULT_SYSTEM_PROMPT +
          "\n\nAvailable tools: " +
          Object.keys(llmTools.TOOL_DEFINITIONS)
            .filter((tool) => availableTools[tool])
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
            .join("\n"),
      },
      ...existingHistory, // Add back the rest of the history
    ];
    console.log("Initialized system prompt in chat history");
    console.log("Full chat history:", fullChatHistory);
  }

  /**
   * Get the current chat history, preserving system prompt and image context
   * @returns {Array} The current chat history
   */
  function getCurrentChatHistory() {
    const maxHistory = parseInt(jQuery("#maxHistory").val());
    // Always keep the system prompt as the first message
    const systemPrompt = fullChatHistory[0];
    // Get the most recent messages within the limit, excluding the system prompt
    const recentMessages = fullChatHistory.slice(-maxHistory + 1);
    // Combine system prompt with recent messages
    return [systemPrompt, ...recentMessages];
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

    const prompt = jQuery("#chatInput").val().trim();
    if (!prompt && !currentAttachedImage) return;

    // Add user message to chat UI immediately for better UX
    appendMessage(prompt, "user", currentAttachedImage?.data);

    // Store image temporarily
    const imageToSend = currentAttachedImage;

    // Prepare the message text with image context if present
    const messageText = currentAttachedImage
      ? `${prompt}\n[User shared an image: ${currentAttachedImage.name} (${currentAttachedImage.type})]`
      : prompt;

    // Clear input and image
    jQuery("#chatInput").val("").trigger("input");
    if (currentAttachedImage) {
      jQuery("#imagePreviewArea").addClass("d-none");
      jQuery("#attachedImagePreview").attr("src", "");
      jQuery("#imageInput").val("");
      currentAttachedImage = null;
    }

    // Get model settings and check if streaming is enabled
    const isStreaming = jQuery("#streamOutput").val() === "stream";
    const modelSettings = {
      modelFamily: !!imageToSend
        ? constants.ModelFamily.META_LLAMA_VISION
        : jQuery("#modelFamily").val(),
      isStreaming: isStreaming,
      modelParameters: {
        temperature: parseFloat(jQuery("#temperature").val()),
        maxTokens: parseInt(jQuery("#maxTokens").val()),
        topK: parseInt(jQuery("#topK").val()),
        topP: parseFloat(jQuery("#topP").val()),
        frequencyPenalty: parseFloat(jQuery("#frequencyPenalty").val()),
        presencePenalty: parseFloat(jQuery("#presencePenalty").val()),
      },
    };

    // Start loading state
    isRequestInProgress = true;
    updateUIState();

    try {
      // Send the message to the server
      const response = await llmApi.generateChat(
        prompt,
        getCurrentChatHistory(),
        {
          ...modelSettings,
          image: imageToSend,
        }
      );

      if (response.success) {
        if (isStreaming && response.tokens) {
          // Create a chat bubble for streaming
          const chatBubble = jQuery("<div>").addClass("message bot");
          const textElement = jQuery("<div>").addClass("message-text");
          const iconElement = jQuery("<div>")
            .addClass("message-icon")
            .append(jQuery("<i>").addClass("fas fa-robot"));

          chatBubble.append(textElement);
          if (response.remainingUsage !== undefined) {
            const usageElement = jQuery("<div>")
              .addClass("usage-info")
              .html(
                `<small class="text-muted"><i class="fas fa-bolt"></i> Remaining usage: ${response.remainingUsage}</small>`
              );
            chatBubble.append(usageElement);
          }
          chatBubble.append(iconElement);
          jQuery("#chatMessages").append(chatBubble);

          // Stream the tokens
          let streamedText = "";
          for (const token of response.tokens) {
            streamedText += token;
            textElement.text(streamedText);
            chatBubble[0].scrollIntoView({ behavior: "smooth" });
            // Small delay for smooth streaming
            await new Promise((resolve) => setTimeout(resolve, 30));
          }
        } else {
          appendMessage(response.text, "bot", null, response.remainingUsage);
        }

        // Update chat history with server's version
        if (response.chatHistory) {
          fullChatHistory = response.chatHistory;
        }
      } else {
        appendMessage(response.message || "Unknown error occurred", "error");
      }
    } catch (error) {
      console.error("Chat Error:", error);
      appendMessage(error.message || "An error occurred", "error");
    } finally {
      isRequestInProgress = false;
      updateUIState();
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
    usageInfo = null
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

  return {
    pageInit: pageInit,
  };
});
