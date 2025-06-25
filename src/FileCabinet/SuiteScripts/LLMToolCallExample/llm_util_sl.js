/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @description A comprehensive API wrapper for N/llm functionality with streaming and embedding support
 */
define(["N/llm", "N/log", "N/file", "./constants"], /**
 * @param {import('N/llm')} llm
 * @param {import('N/log')} log
 * @param {import('N/file')} file
 * @param {Object} constants
 */ (llm, log, file, constants) => {
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
      title: "LLM Utility - Generate Text",
      details: {
        params: params,
      },
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
      ociConfig,
    };

    log.debug({
      title: "LLM Utility - Calling generateText",
      details: requestParams,
    });

    const response = llm.generateText(requestParams);

    log.debug({
      title: "LLM Utility - Generate Text Response",
      details: response,
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
      title: "LLM Utility - Generate Text Streamed",
      details: {
        params: params,
      },
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
      title: "LLM Utility - Calling generateTextStreamed",
      details: requestParams,
    });

    const response = llm.generateTextStreamed(requestParams);

    const tokens = [];
    const iter = response.iterator();
    iter.each(function (token) {
      tokens.push(token.value);
      return true;
    });

    log.debug({
      title: "LLM Utility - Generate Text Streamed Response",
      details: {
        text: response.text,
        model: response.model,
        tokenCount: tokens.length,
        citations: response.citations,
        documents: response.documents,
        chatHistory: response.chatHistory,
      },
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
      title: "LLM Utility - Generate Text with Docs",
      details: {
        params: params,
      },
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
      title: "LLM Utility - Calling generateText with Documents",
      details: requestParams,
    });

    const response = llm.generateText(requestParams);

    log.debug({
      title: "LLM Utility - Generate Text with Docs Response",
      details: {
        text: response.text,
        model: response.model,
        citations: response.citations,
        documents: response.documents,
      },
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
   * Convert base64 image data to file.File object
   * @param {string} base64Data Base64 image data
   * @param {string} fileName Original file name
   * @param {string} fileType File MIME type
   * @returns {Object} file.File object
   */
  function createImageFile(base64Data, fileName, fileType) {
    try {
      // Remove data URL prefix if present
      const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");

      // Create temp file from base64
      // Map MIME types to NetSuite file types
      let netsuiteFT = file.Type.PJPGIMAGE; // Default to JPEG
      if (fileType.startsWith("image/")) {
        const mimeSubtype = fileType.split("/")[1].toLowerCase();
        switch (mimeSubtype) {
          case "jpeg":
          case "jpg":
            netsuiteFT = file.Type.JPGIMAGE;
            break;
          case "png":
            netsuiteFT = file.Type.PNGIMAGE;
            break;
          case "gif":
            netsuiteFT = file.Type.GIFIMAGE;
            break;
          case "bmp":
            netsuiteFT = file.Type.BMPIMAGE;
            break;
          case "tiff":
          case "tif":
            netsuiteFT = file.Type.TIFFIMAGE;
            break;
          case "svg+xml":
            netsuiteFT = file.Type.SVG;
            break;
          default:
            netsuiteFT = file.Type.PJPGIMAGE; // Fallback to JPEG
        }
      }

      return file.create({
        name: fileName,
        fileType: netsuiteFT,
        contents: base64Content,
        encoding: file.Encoding.BASE_64,
        folder: -15, // Temporary folder
      });
    } catch (error) {
      log.error({
        title: "Error creating image file",
        details: error,
      });
      throw new Error("Failed to process image: " + error.message);
    }
  }

  /**
   * Handles chat-based text generation with support for both streaming and normal responses
   * @param {object} params Request parameters
   * @returns {object} Response with chat history and optional tokens for streaming
   */
  function handleGenerateChat(params) {
    const {
      prompt,
      chatHistory,
      modelFamily,
      modelParameters,
      preamble,
      ociConfig,
      image,
      isStreaming,
    } = params;

    if (!prompt?.trim()) {
      throw new Error("Prompt is required");
    }

    // Convert chat history to ChatMessage objects
    const llmChatHistory = (chatHistory || []).map((msg) => {
      // If the message has image data, append it to the text
      let messageText = msg.text;
      if (msg.image?.data && msg.image?.name && msg.image?.type) {
        messageText = `${messageText}\n[This message included an image: ${msg.image.name} (${msg.image.type})]`;
      }
      return llm.createChatMessage({
        role: msg.role || llm.ChatRole.USER,
        text: messageText,
      });
    });

    // Add current prompt and image context if present
    let finalPrompt = prompt;
    if (image?.data && image?.name && image?.type) {
      finalPrompt = `${prompt}\n[Current message includes an image: ${image.name} (${image.type})]`;
    }

    // Add the current message to chat history
    llmChatHistory.push(
      llm.createChatMessage({
        role: llm.ChatRole.USER,
        text: finalPrompt,
      })
    );

    const requestParams = {
      prompt: finalPrompt, // Use the prompt with image context
      preamble,
      chatHistory: llmChatHistory,
      modelFamily: modelFamily || constants.ModelFamily.COHERE_COMMAND_R,
      modelParameters: { ...DEFAULT_MODEL_PARAMS, ...modelParameters },
      ociConfig,
    };

    // Add image to request if provided and using vision model
    if (image?.data && image?.name && image?.type) {
      if (modelFamily === constants.ModelFamily.META_LLAMA_VISION) {
        requestParams.image = createImageFile(
          image.data,
          image.name,
          image.type
        );
      }
    }

    log.debug({
      title: "LLM Utility - Generate Chat Request",
      details: {
        modelFamily: requestParams.modelFamily,
        isVisionModel:
          requestParams.modelFamily === constants.ModelFamily.META_LLAMA_VISION,
        isStreaming: isStreaming,
      },
    });

    // Use the appropriate generation method based on isStreaming flag
    let generatedText, modelUsed, tokens;
    if (isStreaming) {
      const streamResponse = llm.generateTextStreamed(requestParams);
      tokens = [];
      const iter = streamResponse.iterator();
      iter.each(function (token) {
        tokens.push(token.value);
        return true;
      });
      generatedText = streamResponse.text;
      modelUsed = streamResponse.model;
    } else {
      const response = llm.generateText(requestParams);
      generatedText = response.text;
      modelUsed = response.model;
    }

    // Add assistant's response to chat history
    llmChatHistory.push(
      llm.createChatMessage({
        role: llm.ChatRole.CHATBOT,
        text: generatedText,
      })
    );

    // Return response with updated chat history and optional tokens for streaming
    return {
      success: true,
      text: generatedText,
      model: modelUsed,
      ...(isStreaming && { tokens }),
      chatHistory: llmChatHistory,
      remainingUsage: llm.getRemainingFreeUsage(),
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
      title: "LLM Utility - Generate Embeddings",
      details: {
        params: params,
      },
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
      title: "LLM Utility - Calling embed",
      details: requestParams,
    });

    const response = llm.embed(requestParams);

    log.debug({
      title: "LLM Utility - Generate Embeddings Response",
      details: {
        embeddingsCount: response.embeddings?.length,
        inputsCount: response.inputs?.length,
        model: response.model,
      },
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
        title: "LLM Utility - Request Received",
        details: {
          method: context.request.method,
          headers: context.request.headers,
          parameters: context.request.parameters,
          body: context.request.body,
        },
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
        title: "LLM Utility - Processing Request",
        details: {
          action: action,
          parameters: params,
        },
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
