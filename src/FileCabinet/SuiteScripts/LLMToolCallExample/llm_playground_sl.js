/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @description Playground for testing LLM utility API
 */
define(["N/ui/serverWidget", "./llm_client_api", "./constants", "./llm_tools"], /**
 * @param {import('N/ui/serverWidget')} serverWidget
 * @param {Object} llmApi
 * @param {Object} constants
 * @param {Object} llmTools
 */ function (serverWidget, llmApi, constants, llmTools) {
  const MAX_FIELD_LENGTH = 3900; // Leaving some buffer from the 4000 limit

  /**
   * Split long text into chunks that fit within field limits
   * @param {string} text - Text to split
   * @returns {string[]} Array of text chunks
   */
  function splitLongText(text) {
    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
      chunks.push(remaining.substring(0, MAX_FIELD_LENGTH));
      remaining = remaining.substring(MAX_FIELD_LENGTH);
    }

    return chunks;
  }

  /**
   * Create response fields based on response size
   * @param {serverWidget.Form} form - Form to add fields to
   * @param {string} responseText - Response text to display
   */
  function createResponseFields(form, responseText) {
    const chunks = splitLongText(responseText);

    if (chunks.length === 1) {
      // Single response field for small responses
      const responseField = form.addField({
        id: "custpage_response",
        type: serverWidget.FieldType.TEXTAREA,
        label: "Response",
        container: "custpage_content_group",
      });
      responseField.defaultValue = chunks[0];
      responseField.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE,
      });
    } else {
      // Multiple fields for large responses
      chunks.forEach((chunk, index) => {
        const responseField = form.addField({
          id: `custpage_response_${index}`,
          type: serverWidget.FieldType.TEXTAREA,
          label: `Response (Part ${index + 1} of ${chunks.length})`,
          container: "custpage_content_group",
        });
        responseField.defaultValue = chunk;
        responseField.updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        });
      });
    }
  }

  /**
   * Create the playground form
   * @param {Object} context
   * @returns {Object} form
   */
  function createForm(context) {
    const form = serverWidget.createForm({
      title: "LLM API Playground",
    });

    // Add CSS styling
    form.addField({
      id: "custpage_css",
      type: serverWidget.FieldType.INLINEHTML,
      label: "CSS",
    }).defaultValue = `
      <style>
        .tools-doc {
          font-family: monospace;
          white-space: pre-wrap;
          padding: 10px;
          background-color: #f5f5f5;
          border-radius: 4px;
          border: 1px solid #ddd;
          margin: 10px 0;
        }
      </style>
    `;

    // Tools Documentation Group
    const toolsGroup = form.addFieldGroup({
      id: "custpage_tools_group",
      label: "Available Tools",
      isCollapsed: true,
    });

    // Tools Documentation Field
    const toolsDocField = form.addField({
      id: "custpage_tools_doc",
      type: serverWidget.FieldType.INLINEHTML,
      label: "Tools Documentation",
      container: "custpage_tools_group",
    });

    // Format tool definitions into a readable format
    const toolsDoc = Object.entries(llmTools.TOOL_DEFINITIONS)
      .map(([toolName, tool]) => {
        const args = Object.entries(tool.args.properties)
          .map(([argName, arg]) => {
            const required = tool.args.required?.includes(argName) ? "Required" : "Optional";
            const defaultValue = arg.default ? ` (Default: ${arg.default})` : "";
            return `    ${argName}: ${arg.description} [${required}${defaultValue}]`;
          })
          .join("\n");

        return `${toolName}\n  Description: ${tool.description}\n  Arguments:\n${args}\n`;
      })
      .join("\n\n");

    toolsDocField.defaultValue = `<div class="tools-doc">${toolsDoc}</div>`;

    // Main Field Group
    const mainGroup = form.addFieldGroup({
      id: "custpage_main_group",
      label: "Main Settings",
      isCollapsed: false,
    });

    // Action selection
    const actionField = form.addField({
      id: "custpage_action",
      type: serverWidget.FieldType.SELECT,
      label: "Action",
      container: "custpage_main_group",
    });

    Object.entries(constants.Actions).forEach(([key, value]) => {
      actionField.addSelectOption({
        value: value,
        text: key,
      });
    });

    // Prompt field
    form
      .addField({
        id: "custpage_prompt",
        type: serverWidget.FieldType.TEXTAREA,
        label: "Prompt/Inputs",
        container: "custpage_main_group",
      })
      .updateDisplayType({
        displayType: serverWidget.FieldDisplayType.NORMAL,
      });

    // Model Parameters Group
    const modelGroup = form.addFieldGroup({
      id: "custpage_model_group",
      label: "Model Settings",
      isCollapsed: false,
    });

    // Text Generation Model selection
    const modelField = form.addField({
      id: "custpage_model",
      type: serverWidget.FieldType.SELECT,
      label: "Text Generation Model",
      container: "custpage_model_group",
    });

    Object.entries(constants.ModelFamily).forEach(([key, value]) => {
      modelField.addSelectOption({
        value: value,
        text: key,
      });
    });

    // Embedding Model selection
    const embedModelField = form.addField({
      id: "custpage_embed_model",
      type: serverWidget.FieldType.SELECT,
      label: "Embedding Model",
      container: "custpage_model_group",
    });

    Object.entries(constants.EmbedModelFamily).forEach(([key, value]) => {
      embedModelField.addSelectOption({
        value: value,
        text: key,
      });
    });

    // Model Parameters
    form.addField({
      id: "custpage_temperature",
      type: serverWidget.FieldType.FLOAT,
      label: "Temperature",
      container: "custpage_model_group",
    }).defaultValue = constants.ParameterLimits.temperature.default;

    form.addField({
      id: "custpage_max_tokens",
      type: serverWidget.FieldType.INTEGER,
      label: "Max Tokens",
      container: "custpage_model_group",
    }).defaultValue = constants.ParameterLimits.maxTokens.default;

    form.addField({
      id: "custpage_top_k",
      type: serverWidget.FieldType.INTEGER,
      label: "Top K",
      container: "custpage_model_group",
    }).defaultValue = constants.ParameterLimits.topK.default;

    form.addField({
      id: "custpage_top_p",
      type: serverWidget.FieldType.FLOAT,
      label: "Top P",
      container: "custpage_model_group",
    }).defaultValue = constants.ParameterLimits.topP.default;

    form.addField({
      id: "custpage_freq_penalty",
      type: serverWidget.FieldType.FLOAT,
      label: "Frequency Penalty",
      container: "custpage_model_group",
    }).defaultValue = constants.ParameterLimits.frequencyPenalty.default;

    form.addField({
      id: "custpage_pres_penalty",
      type: serverWidget.FieldType.FLOAT,
      label: "Presence Penalty",
      container: "custpage_model_group",
    }).defaultValue = constants.ParameterLimits.presencePenalty.default;

    // Embedding Options Group
    const embedGroup = form.addFieldGroup({
      id: "custpage_embed_group",
      label: "Embedding Options",
      isCollapsed: false,
    });

    // Truncation Method
    const truncateField = form.addField({
      id: "custpage_truncate",
      type: serverWidget.FieldType.SELECT,
      label: "Truncation Method",
      container: "custpage_embed_group",
    });

    Object.entries(constants.Truncate).forEach(([key, value]) => {
      truncateField.addSelectOption({
        value: value,
        text: key,
      });
    });

    // Content Group
    const contentGroup = form.addFieldGroup({
      id: "custpage_content_group",
      label: "Content",
      isCollapsed: false,
    });

    // Response field (always visible)
    const responseField = form.addField({
      id: "custpage_response",
      type: serverWidget.FieldType.LONGTEXT,
      label: "Response",
      container: "custpage_content_group",
    });
    responseField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.INLINE,
    });
    responseField.defaultValue = "Response will appear here...";
    responseField.updateBreakType({
      breakType: serverWidget.FieldBreakType.STARTROW,
    });

    // Preamble
    form.addField({
      id: "custpage_preamble",
      type: serverWidget.FieldType.TEXTAREA,
      label: "Preamble",
      container: "custpage_content_group",
    });

    // Documents
    form.addField({
      id: "custpage_documents",
      type: serverWidget.FieldType.TEXTAREA,
      label: "Documents (JSON array)",
      container: "custpage_content_group",
    });

    // Chat History
    form.addField({
      id: "custpage_chat_history",
      type: serverWidget.FieldType.TEXTAREA,
      label: "Chat History (JSON array)",
      container: "custpage_content_group",
    });

    form.addButton({
      id: "custpage_execute_btn",
      label: "Execute",
      functionName: "executeLLM",
    });

    // Add client script to handle field visibility based on action
    form.clientScriptModulePath = "./llm_playground_cl.js";

    return form;
  }

  /**
   * Handle form submission and call API
   * @param {Object} context
   * @param {Object} form
   */
  function handleSubmit(context, form) {
    const action = context.request.parameters.custpage_action;
    const prompt = context.request.parameters.custpage_prompt;
    const modelFamily = context.request.parameters.custpage_model;
    const embedModelFamily = context.request.parameters.custpage_embed_model;
    const preamble = context.request.parameters.custpage_preamble;
    const truncate = context.request.parameters.custpage_truncate;

    const modelParameters = {
      temperature: parseFloat(context.request.parameters.custpage_temperature),
      maxTokens: parseInt(context.request.parameters.custpage_max_tokens),
      topK: parseInt(context.request.parameters.custpage_top_k),
      topP: parseFloat(context.request.parameters.custpage_top_p),
      frequencyPenalty: parseFloat(
        context.request.parameters.custpage_freq_penalty
      ),
      presencePenalty: parseFloat(
        context.request.parameters.custpage_pres_penalty
      ),
    };

    let response;
    try {
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
            context.request.parameters.custpage_documents || "[]"
          );
          response = llmApi.generateTextWithDocs(prompt, documents, {
            modelFamily,
            modelParameters,
            preamble,
          });
          break;

        case constants.Actions.GENERATE_CHAT:
          const chatHistory = JSON.parse(
            context.request.parameters.custpage_chat_history || "[]"
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

      log.debug({
        title: "LLM Response",
        details: JSON.stringify(response, null, 2),
      });

      // Create a new form with the response
      const newForm = createForm(context);

      // Set all the original values back
      const originalValues = {
        custpage_action: action,
        custpage_prompt: prompt,
        custpage_model: modelFamily,
        custpage_embed_model: embedModelFamily,
        custpage_preamble: preamble,
        custpage_truncate: truncate,
        custpage_temperature: modelParameters.temperature,
        custpage_max_tokens: modelParameters.maxTokens,
        custpage_top_k: modelParameters.topK,
        custpage_top_p: modelParameters.topP,
        custpage_freq_penalty: modelParameters.frequencyPenalty,
        custpage_pres_penalty: modelParameters.presencePenalty,
        custpage_documents: context.request.parameters.custpage_documents,
        custpage_chat_history: context.request.parameters.custpage_chat_history,
      };

      newForm.updateDefaultValues(originalValues);
      createResponseFields(newForm, JSON.stringify(response, null, 2));

      return newForm;
    } catch (error) {
      // Create a new form with the error
      const newForm = createForm(context);

      // Set all the original values back
      const originalValues = {
        custpage_action: action,
        custpage_prompt: prompt,
        custpage_model: modelFamily,
        custpage_embed_model: embedModelFamily,
        custpage_preamble: preamble,
        custpage_truncate: truncate,
        custpage_temperature: modelParameters.temperature,
        custpage_max_tokens: modelParameters.maxTokens,
        custpage_top_k: modelParameters.topK,
        custpage_top_p: modelParameters.topP,
        custpage_freq_penalty: modelParameters.frequencyPenalty,
        custpage_pres_penalty: modelParameters.presencePenalty,
        custpage_documents: context.request.parameters.custpage_documents,
        custpage_chat_history: context.request.parameters.custpage_chat_history,
      };

      newForm.updateDefaultValues(originalValues);

      // Create response field with the error message
      // Create response fields with the response content
      log.debug({
        title: "LLM Response",
        details: `Error: ${error.message}`,
      });
      createResponseFields(newForm, `Error: ${error.message}`);

      return newForm;
    }
  }

  /**
   * Main entry point
   */
  function onRequest(context) {
    const form = createForm(context);
    context.response.writePage(form);
  }

  return {
    onRequest,
  };
});
