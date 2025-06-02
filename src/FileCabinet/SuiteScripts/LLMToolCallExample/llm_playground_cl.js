/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @description Client script for LLM Playground
 */
define([
  "N/currentRecord",
  "N/ui/message",
  "./constants",
  "./llm_client_api",
], /**
 * @param {import('N/currentRecord')} currentRecord
 * @param {import('N/ui/message')} message
 * @param {Object} constants
 * @param {Object} llmApi
 */ function (currentRecord, message, constants, llmApi) {
  /**
   * Function to be executed after page is initialized.
   * @param {Object} scriptContext
   */
  function pageInit(scriptContext) {
    updateFieldVisibility(scriptContext.currentRecord);
  }

  /**
   * Function to be executed when field is changed.
   * @param {Object} scriptContext
   */
  function fieldChanged(scriptContext) {
    const fieldName = scriptContext.fieldId;

    if (fieldName === "custpage_action") {
      updateFieldVisibility(scriptContext.currentRecord);
    }
  }

  /**
   * Updates field visibility based on selected action
   * @param {Record} record - Current form record
   */
  function updateFieldVisibility(record) {
    const action = record.getValue("custpage_action");

    // Model fields
    const isEmbedding = action === constants.Actions.GENERATE_EMBEDDINGS;
    setFieldVisibility(record, "custpage_model", !isEmbedding);
    setFieldVisibility(record, "custpage_embed_model", isEmbedding);

    // Model parameters
    const showModelParams = !isEmbedding;
    setFieldVisibility(record, "custpage_temperature", showModelParams);
    setFieldVisibility(record, "custpage_max_tokens", showModelParams);
    setFieldVisibility(record, "custpage_top_k", showModelParams);
    setFieldVisibility(record, "custpage_top_p", showModelParams);
    setFieldVisibility(record, "custpage_freq_penalty", showModelParams);
    setFieldVisibility(record, "custpage_pres_penalty", showModelParams);

    // Embedding options
    setFieldVisibility(record, "custpage_truncate", isEmbedding);

    // Content fields
    setFieldVisibility(record, "custpage_preamble", !isEmbedding);
    setFieldVisibility(
      record,
      "custpage_documents",
      action === constants.Actions.GENERATE_TEXT_WITH_DOCS
    );
    setFieldVisibility(
      record,
      "custpage_chat_history",
      action === constants.Actions.GENERATE_CHAT
    );

    // Update prompt label
    const promptField = record.getField("custpage_prompt");
    if (promptField) {
      promptField.label = isEmbedding ? "Inputs (one per line)" : "Prompt";
    }
  }

  /**
   * Helper to set field visibility
   * @param {Record} record - Current form record
   * @param {string} fieldId - Field ID to update
   * @param {boolean} visible - Whether field should be visible
   */
  function setFieldVisibility(record, fieldId, visible) {
    try {
      const field = record.getField(fieldId);
      if (field) {
        field.isDisplay = visible;
      }
    } catch (e) {
      console.error(`Error setting visibility for field ${fieldId}:`, e);
    }
  }

  /**
   * Handle Execute button click
   */
  function executeLLM() {
    try {
      const record = currentRecord.get();

      // Get all field values
      const action = record.getValue("custpage_action");
      const prompt = record.getValue("custpage_prompt");
      const modelFamily = record.getValue("custpage_model");
      const embedModelFamily = record.getValue("custpage_embed_model");
      const preamble = record.getValue("custpage_preamble");
      const truncate = record.getValue("custpage_truncate");

      const modelParameters = {
        temperature: parseFloat(record.getValue("custpage_temperature")),
        maxTokens: parseInt(record.getValue("custpage_max_tokens")),
        topK: parseInt(record.getValue("custpage_top_k")),
        topP: parseFloat(record.getValue("custpage_top_p")),
        frequencyPenalty: parseFloat(record.getValue("custpage_freq_penalty")),
        presencePenalty: parseFloat(record.getValue("custpage_pres_penalty")),
      };

      // Update response field to show loading
      record.setValue({
        fieldId: "custpage_response",
        value: "Processing request...",
      });

      // Call appropriate API method based on action
      let response;
      try {
        console.log("LLM Request - Action:", action);
        switch (action) {
          case constants.Actions.GENERATE_TEXT:
            response = llmApi.generateText(prompt, {
              modelFamily,
              modelParameters,
              preamble,
            });
            break;

          case constants.Actions.GENERATE_TEXT_STREAMED:
            response = llmApi.generateTextStreamed(prompt, {
              modelFamily,
              modelParameters,
              preamble,
            });
            break;

          case constants.Actions.GENERATE_TEXT_WITH_DOCS:
            const documents = JSON.parse(
              record.getValue("custpage_documents") || "[]"
            );
            response = llmApi.generateTextWithDocs(prompt, documents, {
              modelFamily,
              modelParameters,
              preamble,
            });
            break;

          case constants.Actions.GENERATE_CHAT:
            const chatHistory = JSON.parse(
              record.getValue("custpage_chat_history") || "[]"
            );
            response = llmApi.generateChat(prompt, chatHistory, {
              modelFamily,
              modelParameters,
              preamble,
            });
            break;

          case constants.Actions.GENERATE_EMBEDDINGS:
            const inputs = prompt.split("\n").filter((input) => input.trim());
            response = llmApi.generateEmbeddings(inputs, {
              embedModelFamily,
              truncate,
            });
            break;

          default:
            throw new Error(`Unknown action: ${action}`);
        }

        console.log("LLM Response:", response);

        // Update response field with formatted response
        record.setValue({
          fieldId: "custpage_response",
          value: JSON.stringify(response, null, 2),
        });
      } catch (error) {
        console.error("LLM Error:", error);
        // Update response field with error
        record.setValue({
          fieldId: "custpage_response",
          value: `Error: ${error.message}`,
        });
      }
    } catch (error) {
      console.error("Client Error:", error);
      // Update response field with error
      record.setValue({
        fieldId: "custpage_response",
        value: `Error: ${error.message}`,
      });
    }
  }

  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    executeLLM: executeLLM,
  };
});
