/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @description Constants module for LLM utility providing enums and constants
 */
define([], function () {
  /**
   * Text generation model families
   * @enum {string}
   */
  const ModelFamily = {
    COHERE_COMMAND_R: "cohere.command-r-08-2024",
    COHERE_COMMAND_R_PLUS: "cohere.command-r-plus-08-2024",
    META_LLAMA: "meta.llama-3.3-70b-instruct",
    META_LLAMA_VISION: "meta.llama-3.2-90b-vision-instruct",
  };

  /**
   * Embedding model families
   * @enum {string}
   */
  const EmbedModelFamily = {
    COHERE_EMBED_ENGLISH: "cohere.embed-english-v3.0",
    COHERE_EMBED_ENGLISH_LIGHT: "cohere.embed-english-light-v3.0",
    COHERE_EMBED_MULTILINGUAL: "cohere.embed-multilingual-v3.0",
    COHERE_EMBED_MULTILINGUAL_LIGHT: "cohere.embed-multilingual-light-v3.0",
  };

  /**
   * Chat message roles
   * @enum {string}
   */
  const ChatRole = {
    USER: "USER",
    CHATBOT: "CHATBOT",
    SYSTEM: "SYSTEM",
  };

  /**
   * Truncation methods for embeddings
   * @enum {string}
   */
  const Truncate = {
    NONE: "NONE",
    START: "START",
    END: "END",
    MIDDLE: "MIDDLE",
  };

  /**
   * Available API actions
   * @enum {string}
   */
  const Actions = {
    GENERATE_TEXT: "generateText",
    GENERATE_TEXT_STREAMED: "generateTextStreamed",
    GENERATE_TEXT_WITH_DOCS: "generateTextWithDocs",
    GENERATE_CHAT: "generateChat",
    CREATE_DOCUMENTS: "createDocuments",
    GENERATE_EMBEDDINGS: "generateEmbeddings",
  };

  /**
   * Default model parameters
   * @type {Object}
   */
  const DefaultModelParameters = {
    maxTokens: 1000,
    temperature: 0.5,
    topK: 3,
    topP: 0.7,
    frequencyPenalty: 0.4,
    presencePenalty: 0,
  };

  /**
   * Parameter ranges and limits
   * @type {Object}
   */
  const ParameterLimits = {
    temperature: {
      min: 0,
      max: 1,
      default: 0.5,
    },
    maxTokens: {
      min: 1,
      max: 4096,
      default: 1000,
    },
    topK: {
      min: 1,
      max: 500,
      default: 3,
    },
    topP: {
      min: 0,
      max: 1,
      default: 0.7,
    },
    frequencyPenalty: {
      min: 0,
      max: 2,
      default: 0.4,
    },
    presencePenalty: {
      min: 0,
      max: 2,
      default: 0,
    },
  };

  /**
   * Script and deployment IDs
   * @type {Object}
   */
  const Scripts = {
    LLM_UTIL: {
      SCRIPT_ID: "customscript_mrk_llm_sa_util_sl",
      DEPLOY_ID: "customdeploy_mrk_llm_sa_util_sl",
    },
    NEW_LLM_PLAYGROUND: {
      SCRIPT_ID: "customscript_mrk_llm_sa_modern_sl",
      DEPLOY_ID: "customdeploy_mrk_llm_sa_modern_sl",
    },
  };

  return {
    ModelFamily: ModelFamily,
    EmbedModelFamily: EmbedModelFamily,
    ChatRole: ChatRole,
    Truncate: Truncate,
    Actions: Actions,
    DefaultModelParameters: DefaultModelParameters,
    ParameterLimits: ParameterLimits,
    Scripts: Scripts,
  };
});
