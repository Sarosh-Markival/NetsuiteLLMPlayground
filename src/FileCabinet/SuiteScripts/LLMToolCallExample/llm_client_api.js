/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @description Client API for LLM utility
 */
define(["N/url", "N/https", "N/runtime", "./constants"], /**
 * @param {import('N/url')} url
 * @param {import('N/https')} https
 * @param {import('N/runtime')} runtime
 * @param {Object} constants
 */ function (url, https, runtime, constants) {
  /**
   * Makes a call to the LLM utility Suitelet
   * @private
   * @param {Object} payload - The request payload
   * @returns {Object} - The response from the Suitelet
   */
  function callLLMUtil(payload) {
    // Get the deployment URL
    const suiteletUrl = url.resolveScript({
      scriptId: constants.Scripts.LLM_UTIL.SCRIPT_ID,
      deploymentId: constants.Scripts.LLM_UTIL.DEPLOY_ID,
    });

    const response = https.post({
      url: suiteletUrl,
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.code !== 200) {
      throw new Error(`HTTP ${response.code}: ${response.body}`);
    }

    return JSON.parse(response.body);
  }

  /**
   * Generate text using the LLM
   * @param {string} prompt - The prompt text
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The generated text response
   */
  function generateText(prompt, options = {}) {
    return callLLMUtil({
      action: constants.Actions.GENERATE_TEXT,
      prompt,
      ...options,
    });
  }

  /**
   * Generate streamed text using the LLM
   * @param {string} prompt - The prompt text
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The generated text response with tokens
   */
  function generateTextStreamed(prompt, options = {}) {
    return callLLMUtil({
      action: constants.Actions.GENERATE_TEXT_STREAMED,
      prompt,
      ...options,
    });
  }

  /**
   * Generate text with document context
   * @param {string} prompt - The prompt text
   * @param {Array<Object>} documents - The documents to use as context
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The generated text response
   */
  function generateTextWithDocs(prompt, documents, options = {}) {
    return callLLMUtil({
      action: constants.Actions.GENERATE_TEXT_WITH_DOCS,
      prompt,
      documents,
      ...options,
    });
  }

  /**
   * Generate chat response
   * @param {string} prompt - The current message
   * @param {Array<Object>} chatHistory - Previous chat messages
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The chat response
   */
  function generateChat(prompt, chatHistory = [], options = {}) {
    return callLLMUtil({
      action: constants.Actions.GENERATE_CHAT,
      prompt,
      chatHistory,
      ...options,
    });
  }

  /**
   * Create documents for use with the LLM
   * @param {Array<Object>} documents - The documents to create
   * @returns {Promise<Object>} - The created documents
   */
  function createDocuments(documents) {
    return callLLMUtil({
      action: constants.Actions.CREATE_DOCUMENTS,
      documents,
    });
  }

  /**
   * Generate embeddings for text inputs
   * @param {Array<string>} inputs - The text inputs to embed
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The embeddings response
   */
  function generateEmbeddings(inputs, options = {}) {
    return callLLMUtil({
      action: constants.Actions.GENERATE_EMBEDDINGS,
      inputs,
      ...options,
    });
  }

  return {
    generateText,
    generateTextStreamed,
    generateTextWithDocs,
    generateChat,
    createDocuments,
    generateEmbeddings,
  };
});
