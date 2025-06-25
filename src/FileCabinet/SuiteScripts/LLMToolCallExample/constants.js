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

When you need to use a tool, format your response as a JSON object with these required fields:
1. "isToolCall": true
2. "toolName": the name of the tool to call
3. "args": an object containing the tool's required arguments

- Dont add json keyword just a valid JSON object
Example tool call format:
{
  "isToolCall": true,
  "toolName": "searchTransactions",
  "args": {
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "type": "invoice"
  }
}

For date parameters, always use YYYY-MM-DD format.

When interpreting tool responses:
1. Focus on the business insights and actionable information
2. Avoid technical details about the JSON structure or success flags
3. Present findings in clear, concise language
4. Highlight key metrics and trends
5. Provide practical recommendations when relevant
6. Use natural business language instead of technical terms
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
