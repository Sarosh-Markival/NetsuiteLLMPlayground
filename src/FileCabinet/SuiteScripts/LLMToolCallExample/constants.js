/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @description Constants module for LLM utility providing enums and constants
 */
define(["./llm_tools"], function (llmTools) {
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
      default: 0.0,
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
  };

  /**
   * Default system prompt that enforces JSON output for tool calls
   * @type {string}
   */
  const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant integrated with NetSuite ERP.
You have access to various NetSuite tools to help users with their tasks.
Today's date is ${new Date().toISOString().split("T")[0]}.

Your primary role is to help users with NetSuite-related questions. You can respond in two ways:

---

**1. If a tool is required to fulfill the request:**

Respond with a valid JSON object, containing the following required fields:

{
  "isToolCall": true,
  "toolName": "TOOL_NAME_HERE",
  "args": {
    "parameter1": "value1",
    "parameter2": "value2"
  }
}

**Rules for tool calls:**
- Only respond with the JSON object (no explanations, no markdown, no natural language).
- Do NOT wrap the response in \`\`\`.
- Do NOT say "Here's a JSON" or explain the fields.

**Date format:** Always use "YYYY-MM-DD"

---

**2. If a tool is not needed:**

Respond naturally in clear, helpful language — just like a business assistant would.

---

**Interpreting tool responses:**
- Focus on business insights, not JSON details.
- Highlight key metrics, trends, or issues.
- Avoid technical jargon.
- Provide practical next steps or suggestions if applicable.
`;

  /**
   * Default tool availability configuration
   * @type {Object}
   */
  const DEFAULT_TOOLS_CONFIG = Object.keys(llmTools.TOOL_DEFINITIONS).reduce(
    (config, tool) => {
      config[tool] = true; // All tools enabled by default
      return config;
    },
    {}
  );

  return {
    ModelFamily: ModelFamily,
    EmbedModelFamily: EmbedModelFamily,
    ChatRole: ChatRole,
    Truncate: Truncate,
    Actions: Actions,
    DefaultModelParameters: DefaultModelParameters,
    ParameterLimits: ParameterLimits,
    Scripts: Scripts,
    DEFAULT_SYSTEM_PROMPT: DEFAULT_SYSTEM_PROMPT,
    DEFAULT_TOOLS_CONFIG: DEFAULT_TOOLS_CONFIG,
  };
});
