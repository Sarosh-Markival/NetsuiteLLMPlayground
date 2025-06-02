/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @description A comprehensive API wrapper for N/llm functionality with streaming and embedding support
 */
define(["N/llm", "N/log", "./constants"]
/**
 * @param {import('N/llm')} llm
 * @param {import('N/log')} log
 * @param {Object} constants
 */, (llm, log, constants) => {
  /**
   * Default model parameters
   */
  const DEFAULT_MODEL_PARAMS = constants.DefaultModelParameters;

  /**
   * Handles simple text generation
   * @param {object} params Request parameters
   * @returns {object} Response with generated text
   */
  function handleGenerateText(params) {
    log.debug({
      title: 'LLM Utility - Generate Text',
      details: {
        params: params
      }
    });

    const { prompt, modelFamily, modelParameters, preamble, ociConfig } =
      params;

    if (!prompt?.trim()) {
      throw new Error("Prompt is required");
    }

    const requestParams = {
      prompt,
      preamble,
      modelFamily: modelFamily || constants.ModelFamily.COHERE_COMMAND_R,
      modelParameters: { ...DEFAULT_MODEL_PARAMS, ...modelParameters },
      ociConfig
    };

    log.debug({
      title: 'LLM Utility - Calling generateText',
      details: requestParams
    });

    const response = llm.generateText(requestParams);

    log.debug({
      title: 'LLM Utility - Generate Text Response',
      details: response
    });

    return {
      success: true,
      text: response.text,
      model: response.model,
    };
  }

  /**
   * Handles streamed text generation
   * @param {object} params Request parameters
   * @returns {object} Response with generated text tokens
   */
  function handleGenerateTextStreamed(params) {
    log.debug({
      title: 'LLM Utility - Generate Text Streamed',
      details: {
        params: params
      }
    });

    const {
      prompt,
      modelFamily,
      modelParameters,
      preamble,
      ociConfig,
      documents,
      chatHistory,
    } = params;

    if (!prompt?.trim()) {
      throw new Error("Prompt is required");
    }

    // Prepare documents if provided
    const llmDocs = documents?.map((doc) =>
      llm.createDocument({
        id: doc.id,
        data: doc.data,
      })
    );

    // Prepare chat history if provided
    const llmChatHistory = chatHistory?.map((msg) =>
      llm.createChatMessage({
        role: msg.role || constants.ChatRole.USER,
        text: msg.text,
      })
    );

    const requestParams = {
      prompt,
      preamble,
      documents: llmDocs,
      chatHistory: llmChatHistory,
      modelFamily: modelFamily || constants.ModelFamily.COHERE_COMMAND_R,
      modelParameters: { ...DEFAULT_MODEL_PARAMS, ...modelParameters },
      ociConfig,
    };

    log.debug({
      title: 'LLM Utility - Calling generateTextStreamed',
      details: requestParams
    });

    const response = llm.generateTextStreamed(requestParams);

    const tokens = [];
    const iter = response.iterator();
    iter.each(function (token) {
      tokens.push(token.value);
      return true;
    });

    log.debug({
      title: 'LLM Utility - Generate Text Streamed Response',
      details: {
        text: response.text,
        model: response.model,
        tokenCount: tokens.length,
        citations: response.citations,
        documents: response.documents,
        chatHistory: response.chatHistory
      }
    });

    return {
      success: true,
      text: response.text,
      model: response.model,
      tokens: tokens,
      citations: response.citations || [],
      documents: response.documents || [],
      chatHistory: response.chatHistory || [],
    };
  }

  /**
   * Handles text generation with documents
   * @param {object} params Request parameters
   * @returns {object} Response with generated text and citations
   */
  function handleGenerateTextWithDocs(params) {
    log.debug({
      title: 'LLM Utility - Generate Text with Docs',
      details: {
        params: params
      }
    });

    const {
      prompt,
      documents,
      modelFamily,
      modelParameters,
      preamble,
      ociConfig,
    } = params;

    if (!prompt?.trim()) {
      throw new Error("Prompt is required");
    }

    if (!Array.isArray(documents)) {
      throw new Error("Documents must be an array");
    }

    // Create Document objects
    const llmDocs = documents.map((doc) =>
      llm.createDocument({
        id: doc.id,
        data: doc.data,
      })
    );

    const requestParams = {
      prompt,
      preamble,
      documents: llmDocs,
      modelFamily: modelFamily || constants.ModelFamily.COHERE_COMMAND_R,
      modelParameters: { ...DEFAULT_MODEL_PARAMS, ...modelParameters },
      ociConfig,
    };

    log.debug({
      title: 'LLM Utility - Calling generateText with Documents',
      details: requestParams
    });

    const response = llm.generateText(requestParams);

    log.debug({
      title: 'LLM Utility - Generate Text with Docs Response',
      details: {
        text: response.text,
        model: response.model,
        citations: response.citations,
        documents: response.documents
      }
    });

    return {
      success: true,
      text: response.text,
      model: response.model,
      citations: response.citations || [],
      documents: response.documents || [],
    };
  }

  /**
   * Handles chat-based text generation
   * @param {object} params Request parameters
   * @returns {object} Response with chat history
   */
  function handleGenerateChat(params) {
    log.debug({
      title: 'LLM Utility - Generate Chat',
      details: {
        params: params
      }
    });

    const {
      prompt,
      chatHistory,
      modelFamily,
      modelParameters,
      preamble,
      ociConfig,
    } = params;

    if (!prompt?.trim()) {
      throw new Error("Prompt is required");
    }

    // Convert chat history to ChatMessage objects
    const llmChatHistory = (chatHistory || []).map((msg) =>
      llm.createChatMessage({
        role: msg.role || llm.ChatRole.USER,
        text: msg.text,
      })
    );

    // Add current prompt as user message
    llmChatHistory.push(
      llm.createChatMessage({
        role: llm.ChatRole.USER,
        text: prompt,
      })
    );

    const requestParams = {
      prompt,
      preamble,
      chatHistory: llmChatHistory,
      modelFamily: modelFamily || constants.ModelFamily.COHERE_COMMAND_R,
      modelParameters: { ...DEFAULT_MODEL_PARAMS, ...modelParameters },
      ociConfig,
    };

    log.debug({
      title: 'LLM Utility - Calling generateText with Chat History',
      details: requestParams
    });

    const response = llm.generateText(requestParams);

    log.debug({
      title: 'LLM Utility - Generate Chat Response',
      details: {
        text: response.text,
        model: response.model,
        chatHistory: response.chatHistory
      }
    });

    return {
      success: true,
      text: response.text,
      model: response.model,
      chatHistory: response.chatHistory || [],
    };
  }

  /**
   * Handles document creation
   * @param {object} params Request parameters
   * @returns {object} Response with created documents
   */
  function handleCreateDocuments(params) {
    const { documents } = params;

    if (!Array.isArray(documents)) {
      throw new Error("Documents must be an array");
    }

    const createdDocs = documents.map((doc) =>
      llm.createDocument({
        id: doc.id,
        data: doc.data,
      })
    );

    return {
      success: true,
      documents: createdDocs,
    };
  }

  /**
   * Handles embedding generation
   * @param {object} params Request parameters
   * @returns {object} Response with embeddings
   */
  function handleGenerateEmbeddings(params) {
    log.debug({
      title: 'LLM Utility - Generate Embeddings',
      details: {
        params: params
      }
    });

    const { inputs, embedModelFamily, ociConfig, timeout, truncate } = params;

    if (!Array.isArray(inputs) || inputs.length === 0) {
      throw new Error("Inputs array is required and must not be empty");
    }

    const requestParams = {
      inputs,
      embedModelFamily:
        embedModelFamily ||
        constants.EmbedModelFamily.COHERE_EMBED_MULTILINGUAL,
      ociConfig,
      timeout,
      truncate: truncate || constants.Truncate.NONE,
    };

    log.debug({
      title: 'LLM Utility - Calling embed',
      details: requestParams
    });

    const response = llm.embed(requestParams);

    log.debug({
      title: 'LLM Utility - Generate Embeddings Response',
      details: {
        embeddingsCount: response.embeddings?.length,
        inputsCount: response.inputs?.length,
        model: response.model
      }
    });

    return {
      success: true,
      embeddings: response.embeddings,
      inputs: response.inputs,
      model: response.model,
    };
  }

  /**
   * Main request handler
   * @param {object} context - Script context
   */
  const onRequest = (context) => {
    try {
      log.debug({
        title: 'LLM Utility - Request Received',
        details: {
          method: context.request.method,
          headers: context.request.headers,
          parameters: context.request.parameters,
          body: context.request.body
        }
      });

      if (context.request.method !== "POST") {
        return respondJSON(context, {
          success: false,
          message:
            'Use POST with JSON body containing "action" and required parameters',
        });
      }

      // Parse request body
      const requestBody = JSON.parse(context.request.body || "{}");
      const { action, ...params } = requestBody;

      log.debug({
        title: 'LLM Utility - Processing Request',
        details: {
          action: action,
          parameters: params
        }
      });

      let response;
      switch (action) {
        case constants.Actions.GENERATE_TEXT:
          response = handleGenerateText(params);
          break;
        case constants.Actions.GENERATE_TEXT_STREAMED:
          response = handleGenerateTextStreamed(params);
          break;
        case constants.Actions.GENERATE_TEXT_WITH_DOCS:
          response = handleGenerateTextWithDocs(params);
          break;
        case constants.Actions.GENERATE_CHAT:
          response = handleGenerateChat(params);
          break;
        case constants.Actions.CREATE_DOCUMENTS:
          response = handleCreateDocuments(params);
          break;
        case constants.Actions.GENERATE_EMBEDDINGS:
          response = handleGenerateEmbeddings(params);
          response.remainingFreeEmbedUsage = llm.getRemainingFreeEmbedUsage();
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Add remaining usage to response if not embeddings
      if (action !== constants.Actions.GENERATE_EMBEDDINGS) {
        response.remainingUsage = llm.getRemainingFreeUsage();
      }

      respondJSON(context, response);
    } catch (err) {
      log.error({
        title: "LLM API Error",
        details: err,
      });
      respondJSON(context, {
        success: false,
        message: err.message || "Error processing request",
        name: err.name,
      });
    }
  };

  /**
   * Helper to respond in JSON format
   */
  function respondJSON(context, payload) {
    context.response.addHeader({
      name: "Content-Type",
      value: "application/json; charset=utf-8",
    });
    context.response.write(JSON.stringify(payload));
  }

  return { onRequest };
});
