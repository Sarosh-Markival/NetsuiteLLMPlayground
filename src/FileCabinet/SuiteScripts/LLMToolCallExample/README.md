# NetSuite LLM Utility API Documentation

This document provides comprehensive documentation for the NetSuite LLM (Large Language Model) Utility API. The utility provides a RESTful interface to NetSuite's N/llm module functionality.

## Table of Contents

- [Overview](#overview)
- [Endpoints](#endpoints)
- [Common Parameters](#common-parameters)
- [Actions](#actions)
  - [Generate Text](#generate-text)
  - [Generate Streamed Text](#generate-streamed-text)
  - [Generate Text with Documents](#generate-text-with-documents)
  - [Generate Chat](#generate-chat)
  - [Create Documents](#create-documents)
  - [Generate Embeddings](#generate-embeddings)
- [Model Families](#model-families)
- [Error Handling](#error-handling)
- [Usage Examples](#usage-examples)
- [Constants Module](#constants-module)

## Overview

The LLM Utility API is implemented as a SuiteScript 2.1 Suitelet that provides a unified interface to various N/llm module features. It supports:

- Text generation
- Streamed text generation
- Document-based text generation
- Chat-based interactions
- Document management
- Text embeddings

## Endpoints

All requests should be made as POST requests to the Suitelet URL with a JSON body containing:

- `action`: The operation to perform
- Request-specific parameters

## Common Parameters

These parameters are available for most actions:

### OCI Configuration (optional)

```javascript
{
  "ociConfig": {
    "userId": "ocid1.user...",
    "tenancyId": "ocid1.tenancy...",
    "compartmentId": "ocid1.compartment...",
    "fingerprint": "custsecret_oci_fingerprint",
    "privateKey": "custsecret_oci_private_key"
  }
}
```

### Model Parameters (optional)

```javascript
{
  "modelParameters": {
    "maxTokens": 1000,
    "temperature": 0.5,
    "topK": 3,
    "topP": 0.7,
    "frequencyPenalty": 0.4,
    "presencePenalty": 0
  }
}
```

## Actions

### Generate Text

Basic text generation with the LLM.

```javascript
{
  "action": "generateText",
  "prompt": "Your prompt here",
  "modelFamily": "COHERE_COMMAND_R", // optional
  "preamble": "Optional context or instructions", // optional
  "modelParameters": { ... }, // optional
  "ociConfig": { ... } // optional
}
```

Response:

```javascript
{
  "success": true,
  "text": "Generated text response",
  "model": "Model used",
  "remainingUsage": 123
}
```

### Generate Streamed Text

Text generation with streaming support, returning individual tokens.

```javascript
{
  "action": "generateTextStreamed",
  "prompt": "Your prompt here",
  "modelFamily": "COHERE_COMMAND_R", // optional
  "preamble": "Optional context", // optional
  "documents": [ // optional
    {
      "id": "doc1",
      "data": "Document content"
    }
  ],
  "chatHistory": [ // optional
    {
      "role": "USER",
      "text": "Previous message"
    }
  ],
  "modelParameters": { ... }, // optional
  "ociConfig": { ... } // optional
}
```

Response:

```javascript
{
  "success": true,
  "text": "Complete generated text",
  "model": "Model used",
  "tokens": ["Array", "of", "individual", "tokens"],
  "citations": [], // if documents were provided
  "documents": [], // if documents were provided
  "chatHistory": [], // if chat history was provided
  "remainingUsage": 123
}
```

### Generate Text with Documents

Text generation with context from provided documents.

```javascript
{
  "action": "generateTextWithDocs",
  "prompt": "Your prompt here",
  "documents": [
    {
      "id": "doc1",
      "data": "Document content"
    }
  ],
  "modelFamily": "COHERE_COMMAND_R", // optional
  "preamble": "Optional context", // optional
  "modelParameters": { ... }, // optional
  "ociConfig": { ... } // optional
}
```

Response:

```javascript
{
  "success": true,
  "text": "Generated text",
  "model": "Model used",
  "citations": [
    {
      "documentIds": ["doc1"],
      "text": "Cited text",
      "start": 0,
      "end": 10
    }
  ],
  "documents": [...],
  "remainingUsage": 123
}
```

### Generate Chat

Chat-based text generation with history.

```javascript
{
  "action": "generateChat",
  "prompt": "Your message",
  "chatHistory": [
    {
      "role": "USER",
      "text": "Previous user message"
    },
    {
      "role": "CHATBOT",
      "text": "Previous bot response"
    }
  ],
  "modelFamily": "COHERE_COMMAND_R", // optional
  "preamble": "Optional context", // optional
  "modelParameters": { ... }, // optional
  "ociConfig": { ... } // optional
}
```

Response:

```javascript
{
  "success": true,
  "text": "Generated response",
  "model": "Model used",
  "chatHistory": [...], // Updated chat history
  "remainingUsage": 123
}
```

### Create Documents

Create document objects for use with other actions.

```javascript
{
  "action": "createDocuments",
  "documents": [
    {
      "id": "doc1",
      "data": "Document content"
    }
  ]
}
```

Response:

```javascript
{
  "success": true,
  "documents": [...] // Created document objects
}
```

### Generate Embeddings

Generate text embeddings for semantic similarity comparisons.

```javascript
{
  "action": "generateEmbeddings",
  "inputs": [
    "First text to embed",
    "Second text to embed"
  ],
  "embedModelFamily": "COHERE_EMBED_MULTILINGUAL", // optional
  "timeout": 30000, // optional
  "truncate": "END", // optional
  "ociConfig": { ... } // optional
}
```

Response:

```javascript
{
  "success": true,
  "embeddings": [
    [0.1, 0.2, 0.3, ...], // First embedding vector
    [0.2, 0.3, 0.4, ...] // Second embedding vector
  ],
  "inputs": ["First text", "Second text"],
  "model": "cohere.embed-multilingual-v3.0",
  "remainingFreeEmbedUsage": 123
}
```

## Model Families

### Text Generation Models

- `COHERE_COMMAND_R` (default)
- `COHERE_COMMAND_R_PLUS`
- `META_LLAMA`
- `META_LLAMA_VISION` (supports image processing)

### Embedding Models

- `COHERE_EMBED_ENGLISH`
- `COHERE_EMBED_ENGLISH_LIGHT`
- `COHERE_EMBED_MULTILINGUAL` (default)
- `COHERE_EMBED_MULTILINGUAL_LIGHT`

## Error Handling

All errors are returned in a consistent format:

```javascript
{
  "success": false,
  "message": "Error description",
  "name": "Error type"
}
```

Common errors:

- Missing or invalid `action`
- Missing required parameters
- Invalid input formats
- LLM service errors

## Usage Examples

### Simple Text Generation

```javascript
const response = fetch("YOUR_SUITELET_URL", {
  method: "POST",
  body: JSON.stringify({
    action: "generateText",
    prompt: "Explain quantum computing",
  }),
});
```

### Document-based Question Answering

```javascript
const response = fetch("YOUR_SUITELET_URL", {
  method: "POST",
  body: JSON.stringify({
    action: "generateTextWithDocs",
    prompt: "What are the key features?",
    documents: [
      {
        id: "doc1",
        data: "Product documentation content...",
      },
    ],
  }),
});
```

### Chat Conversation

```javascript
const response = fetch("YOUR_SUITELET_URL", {
  method: "POST",
  body: JSON.stringify({
    action: "generateChat",
    prompt: "How can I help you today?",
    chatHistory: [
      {
        role: "USER",
        text: "I need help with NetSuite customization",
      },
    ],
  }),
});
```

### Finding Similar Items using Embeddings

```javascript
// First, generate embeddings
const embedResponse = fetch("YOUR_SUITELET_URL", {
  method: "POST",
  body: JSON.stringify({
    action: "generateEmbeddings",
    inputs: [
      "Original item description",
      "Potential similar item 1",
      "Potential similar item 2",
    ],
  }),
});

// Then use the embeddings for similarity comparison
// Higher cosine similarity indicates more similar items
```

## Constants Module

The utility includes a constants module (`constants.js`) that provides enums and constants for use with the API. Import it in your SuiteScript files:

```javascript
define(["./LLMToolCallExample/constants"], function (constants) {
  // Use constants here
});
```

### Available Constants

#### Model Families

```javascript
constants.ModelFamily.COHERE_COMMAND_R;
constants.ModelFamily.COHERE_COMMAND_R_PLUS;
constants.ModelFamily.META_LLAMA;
constants.ModelFamily.META_LLAMA_VISION;
```

#### Embedding Models

```javascript
constants.EmbedModelFamily.COHERE_EMBED_ENGLISH;
constants.EmbedModelFamily.COHERE_EMBED_ENGLISH_LIGHT;
constants.EmbedModelFamily.COHERE_EMBED_MULTILINGUAL;
constants.EmbedModelFamily.COHERE_EMBED_MULTILINGUAL_LIGHT;
```

#### Chat Roles

```javascript
constants.ChatRole.USER;
constants.ChatRole.CHATBOT;
constants.ChatRole.SYSTEM;
```

#### Truncation Methods

```javascript
constants.Truncate.NONE;
constants.Truncate.START;
constants.Truncate.END;
constants.Truncate.MIDDLE;
```

#### API Actions

```javascript
constants.Actions.GENERATE_TEXT;
constants.Actions.GENERATE_TEXT_STREAMED;
constants.Actions.GENERATE_TEXT_WITH_DOCS;
constants.Actions.GENERATE_CHAT;
constants.Actions.CREATE_DOCUMENTS;
constants.Actions.GENERATE_EMBEDDINGS;
```

#### Default Parameters

```javascript
constants.DefaultModelParameters = {
  maxTokens: 1000,
  temperature: 0.5,
  topK: 3,
  topP: 0.7,
  frequencyPenalty: 0.4,
  presencePenalty: 0,
};
```

#### Parameter Limits

```javascript
constants.ParameterLimits = {
  temperature: { min: 0, max: 1, default: 0.5 },
  maxTokens: { min: 1, max: 4096, default: 1000 },
  topK: { min: 1, max: 500, default: 3 },
  topP: { min: 0, max: 1, default: 0.7 },
  frequencyPenalty: { min: 0, max: 2, default: 0.4 },
  presencePenalty: { min: 0, max: 2, default: 0 },
};
```

### Usage Example

```javascript
define(["./LLMToolCallExample/constants"], function (constants) {
  // Generate text with specific model
  const response = fetch("YOUR_SUITELET_URL", {
    method: "POST",
    body: JSON.stringify({
      action: constants.Actions.GENERATE_TEXT,
      prompt: "Explain quantum computing",
      modelFamily: constants.ModelFamily.COHERE_COMMAND_R_PLUS,
      modelParameters: {
        temperature: constants.ParameterLimits.temperature.default,
        maxTokens: constants.ParameterLimits.maxTokens.default,
      },
    }),
  });

  // Generate embeddings
  const embedResponse = fetch("YOUR_SUITELET_URL", {
    method: "POST",
    body: JSON.stringify({
      action: constants.Actions.GENERATE_EMBEDDINGS,
      inputs: ["Text to embed"],
      embedModelFamily: constants.EmbedModelFamily.COHERE_EMBED_MULTILINGUAL,
      truncate: constants.Truncate.END,
    }),
  });
});
```
