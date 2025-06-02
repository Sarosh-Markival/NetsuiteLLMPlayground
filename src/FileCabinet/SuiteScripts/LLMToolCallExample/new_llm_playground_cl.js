/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @description Client script for modern LLM Playground UI
 */
define(["N/url", "N/currentRecord", "./constants"], function (
  url,
  currentRecord,
  constants
) {
  let chatHistory = [];
  let isRequestInProgress = false;

  /**
   * Initialize the UI
   */
  function pageInit(context) {
    $(document).ready(() => {
      // Populate model family dropdowns
      populateDropdown("#modelFamily", constants.ModelFamily);
      populateDropdown("#embedModelFamily", constants.EmbedModelFamily);
      populateDropdown("#truncate", constants.Truncate);

      // Auto-grow chat input
      $("#chatInput").on("input", function () {
        this.style.height = "0";
        this.style.height = Math.min(this.scrollHeight, 5 * 24) + "px";
      });

      // Send on Ctrl+Enter
      $("#chatInput").on("keydown", function (e) {
        if (e.ctrlKey && e.key === "Enter") {
          e.preventDefault();
          $("#sendButton").click();
        }
      });

      // Send button click
      $("#sendButton").on("click", function () {
        const prompt = $("#chatInput").val().trim();
        if (prompt && !isRequestInProgress) {
          handleChatRequest(prompt);
        }
      });

      // Clear button click
      $("#clearButton").on("click", function () {
        $("#chatMessages").empty();
        chatHistory = [];
      });

      // Generate embeddings button click
      $("#generateEmbeddings").on("click", function () {
        const embedInput = $("#embedInput").val().trim();
        if (embedInput && !isRequestInProgress) {
          handleEmbeddingsRequest(embedInput);
        }
      });
    });
  }

  /**
   * Populate a dropdown with enum values
   */
  function populateDropdown(selector, enumObj) {
    const dropdown = $(selector);
    dropdown.empty();

    Object.entries(enumObj).forEach(([key, value]) => {
      dropdown.append(new Option(key, value));
    });
  }

  /**
   * Add a message bubble to the chat
   */
  function addMessageBubble(text, type = "bot") {
    const messageHtml = `
            <div class="message ${type}">
                ${text}
                <div class="message-icon">
                    <i class="fas fa-${
                      type === "user"
                        ? "user"
                        : type === "bot"
                        ? "robot"
                        : "exclamation-circle"
                    }"></i>
                </div>
            </div>
        `;

    $("#chatMessages").append(messageHtml);
    $("#chatMessages").scrollTop($("#chatMessages")[0].scrollHeight);
  }

  /**
   * Get current model settings
   */
  function getModelSettings() {
    return {
      modelFamily: $("#modelFamily").val(),
      temperature: $("#temperature").val(),
      maxTokens: $("#maxTokens").val(),
      topK: $("#topK").val(),
      topP: $("#topP").val(),
      frequencyPenalty: $("#frequencyPenalty").val(),
      presencePenalty: $("#presencePenalty").val(),
    };
  }

  /**
   * Handle chat API request
   */
  function handleChatRequest(prompt) {
    // Add user message
    addMessageBubble(prompt, "user");

    // Update chat history
    chatHistory.push({ role: "user", content: prompt });

    // Clear input
    $("#chatInput").val("").trigger("input");

    // Disable inputs
    isRequestInProgress = true;
    updateUIState();

    // Make API call
    $.ajax({
      url: url.resolveScript({
        scriptId: constants.Scripts.NEW_LLM_PLAYGROUND.SCRIPT_ID,
        deploymentId: constants.Scripts.NEW_LLM_PLAYGROUND.DEPLOY_ID,
        params: {
          custparam_action: "chat",
        },
      }),
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        prompt,
        chatHistory,
        modelSettings: getModelSettings(),
      }),
      success: function (response) {
        if (response.success) {
          const responseText =
            response.data.text ||
            response.data.choices?.[0]?.text ||
            JSON.stringify(response.data, null, 2);

          addMessageBubble(responseText);
          chatHistory.push({ role: "assistant", content: responseText });
        } else {
          addMessageBubble(response.error || "Unknown error occurred", "error");
        }
      },
      error: function (xhr, status, error) {
        addMessageBubble(error || "Request failed", "error");
      },
      complete: function () {
        isRequestInProgress = false;
        updateUIState();
      },
    });
  }

  /**
   * Handle embeddings API request
   */
  function handleEmbeddingsRequest(input) {
    // Disable inputs
    isRequestInProgress = true;
    updateUIState();

    // Make API call
    $.ajax({
      url: url.resolveScript({
        scriptId: constants.Scripts.NEW_LLM_PLAYGROUND.SCRIPT_ID,
        deploymentId: constants.Scripts.NEW_LLM_PLAYGROUND.DEPLOY_ID,
        params: {
          custparam_action: "embeddings",
        },
      }),
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        embedInput: input,
        embedModelFamily: $("#embedModelFamily").val(),
        truncate: $("#truncate").val(),
      }),
      success: function (response) {
        if (response.success) {
          $("#embedResponse").text(JSON.stringify(response.data, null, 2));
        } else {
          $("#embedResponse").text(
            "Error: " + (response.error || "Unknown error occurred")
          );
        }
      },
      error: function (xhr, status, error) {
        $("#embedResponse").text("Error: " + (error || "Request failed"));
      },
      complete: function () {
        isRequestInProgress = false;
        updateUIState();
      },
    });
  }

  /**
   * Update UI state based on request status
   */
  function updateUIState() {
    const buttons = $("#sendButton, #generateEmbeddings");
    buttons.prop("disabled", isRequestInProgress);
    buttons.find("i").toggleClass("fa-spinner fa-spin", isRequestInProgress);
  }

  return {
    pageInit: pageInit,
  };
});
