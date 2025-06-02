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

  // Initialize system prompt in chat history
  function initializeSystemPrompt() {
    fullChatHistory = [
      {
        role: constants.ChatRole.CHATBOT,
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
    ];
    console.log("Initialized system prompt in chat history");
    console.log("Full chat history:", fullChatHistory);
  }

  /**
   * Get the current limited chat history based on maxHistory setting
   */
  function getCurrentChatHistory() {
    const maxHistory = parseInt(jQuery("#maxHistory").val());
    return fullChatHistory.slice(-maxHistory);
  }

  /**
   * Function to be executed after page is initialized.
   */
  function pageInit(context) {
    jQuery(document).ready(function () {
      try {
        setupEventHandlers();
        setupModelSettings();
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
    jQuery("#sendButton").on("click", function (e) {
      e.preventDefault();
      handleSendMessage();
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
    if (!prompt) return;

    // Add user message to chat
    appendMessage(prompt, "user");

    // Update chat history
    fullChatHistory.push({
      role: constants.ChatRole.USER,
      text: prompt,
    });

    // Clear input
    jQuery("#chatInput").val("").trigger("input");

    // Get model settings
    const modelSettings = {
      modelFamily: jQuery("#modelFamily").val(),
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
      // Call LLM API with await, using limited history
      const response = await llmApi.generateChat(
        prompt,
        getCurrentChatHistory(),
        modelSettings
      );

      if (response.success) {
        const responseText = response.text;

        // Check if the response is valid JSON
        let isValidJSON = false;
        let parsedResponse;
        try {
          // First try to parse and validate JSON structure
          parsedResponse = JSON.parse(responseText);
          isValidJSON = true;
        } catch (e) {
          // Not a JSON response, will handle as regular chat response
          isValidJSON = false;
        }

        if (isValidJSON && parsedResponse.isToolCall) {
          // Show tool processing message
          appendMessage(
            `Processing tool call: ${parsedResponse.toolName}...`,
            "system"
          );

          // Simulate tool processing time
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Generate dummy tool response based on the tool
          let toolResponse;
          switch (parsedResponse.toolName) {
            case "searchTransactions":
              toolResponse = {
                success: true,
                count: 3,
                results: [
                  { date: "2025-06-03", type: "invoice", amount: 1500.0 },
                  { date: "2025-06-02", type: "salesorder", amount: 2750.0 },
                  { date: "2025-06-01", type: "payment", amount: -1500.0 },
                ],
              };
              break;
            case "analyzeCustomer":
              toolResponse = {
                success: true,
                analysis: {
                  basic: {
                    name: "Sample Customer",
                    balance: 4750.0,
                    status: "Good Standing",
                  },
                },
              };
              break;
            default:
              toolResponse = {
                success: true,
                message: "Tool operation completed successfully",
                data: { timestamp: new Date().toISOString() },
              };
          }

          // Show tool response to user
          appendMessage(JSON.stringify(toolResponse, null, 2), "system");

          // Update chat history with tool call and response
          fullChatHistory.push({
            role: constants.ChatRole.CHATBOT,
            text: `Tool ${parsedResponse.toolName} returned: ${JSON.stringify(
              toolResponse,
              null,
              2
            )}`,
          });

          // Make follow-up call to LLM to interpret the tool response
          const interpretResponse = await llmApi.generateChat(
            `Please interpret and explain the results of the tool ${
              parsedResponse.toolName
            }:
             ${JSON.stringify(toolResponse, null, 2)}`,
            getCurrentChatHistory(),
            modelSettings
          );

          if (interpretResponse.success) {
            appendMessage(interpretResponse.text, "bot");
            fullChatHistory.push({
              role: constants.ChatRole.CHATBOT,
              text: interpretResponse.text,
            });
          } else {
            appendMessage(
              "Error interpreting tool response: " +
                (interpretResponse.message || "Unknown error"),
              "error"
            );
          }
        } else {
          // Regular chat response
          appendMessage(responseText, "bot");
          fullChatHistory.push({
            role: constants.ChatRole.CHATBOT,
            text: responseText,
          });
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
  function appendMessage(text, type = "bot") {
    const messageHtml = `
      <div class="message ${type}">
        ${text}
        <div class="message-icon">
          <i class="fas fa-${
            type === "user"
              ? "user"
              : type === "bot"
              ? "robot"
              : type === "system"
              ? "cog"
              : "exclamation-circle"
          }"></i>
        </div>
      </div>
    `;

    jQuery("#chatMessages")
      .append(messageHtml)
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
   * Show a message popup
   */
  function showMessage(msg, type = "error") {
    message
      .create({
        title: type.charAt(0).toUpperCase() + type.slice(1),
        message: msg,
        type:
          type === "error"
            ? message.Type.ERROR
            : type === "warning"
            ? message.Type.WARNING
            : message.Type.INFORMATION,
      })
      .show({
        duration: 5000,
      });
  }

  /**
   * Simulate tool response for demo purposes
   */
  function simulateToolResponse(toolName, args) {
    // Validate tool arguments
    if (!toolName || typeof toolName !== "string") {
      return "Error: Invalid tool name";
    }

    if (!args || typeof args !== "object") {
      return "Error: Invalid tool arguments";
    }

    // Get tool config for validation
    const toolConfig = constants.DEFAULT_TOOLS_CONFIG.find(
      (tool) => tool.name === toolName
    );
    if (!toolConfig) {
      return `Error: Unknown tool "${toolName}"`;
    }

    // For demo purposes, return a simple response based on the tool
    switch (toolName) {
      case "readFile":
        return `Reading file: ${args.path}... [Demo Response]`;
      case "listDirectory":
        return `Listing directory: ${args.path}... [Demo Response]`;
      case "executeCommand":
        return `Executing command: ${args.command}... [Demo Response]`;
      default:
        return `Tool ${toolName} executed with args: ${JSON.stringify(
          args
        )} [Demo Response]`;
    }
  }

  return {
    pageInit: pageInit,
  };
});
