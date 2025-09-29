/**
 * API Format Transformation Utility
 * Converts between different API formats (OpenAI ↔ Gemini ↔ Claude)
 */

import type { 
  ApiFormat, 
  OpenAIRequest, 
  OpenAIResponse, 
  GeminiRequest, 
  GeminiResponse, 
  ClaudeRequest, 
  ClaudeResponse,
  ChatRequest,
  ChatResponse
} from "../types/gateway";

/**
 * Convert any API request to internal ChatRequest format
 */
export function toInternalFormat(request: any, format: ApiFormat): ChatRequest {
  switch (format) {
    case "openai":
      return openaiToInternal(request as OpenAIRequest);
    case "gemini":
      return geminiToInternal(request as GeminiRequest);
    case "claude":
      return claudeToInternal(request as ClaudeRequest);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Convert internal ChatResponse to any API format
 */
export function fromInternalFormat(
  response: ChatResponse, 
  targetFormat: ApiFormat, 
  originalRequest: any,
  requestId: string
): OpenAIResponse | GeminiResponse | ClaudeResponse {
  switch (targetFormat) {
    case "openai":
      return internalToOpenAI(response, originalRequest as OpenAIRequest, requestId);
    case "gemini":
      return internalToGemini(response, originalRequest as GeminiRequest);
    case "claude":
      return internalToClaude(response, originalRequest as ClaudeRequest, requestId);
    default:
      throw new Error(`Unsupported target format: ${targetFormat}`);
  }
}

// OpenAI Transformations
function openaiToInternal(request: OpenAIRequest): ChatRequest {
  const lastMessage = request.messages[request.messages.length - 1];
  const context = request.messages.slice(0, -1);
  
  return {
    message: lastMessage.content,
    context: context.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    options: {
      temperature: request.temperature,
      maxTokens: request.max_tokens,
      model: request.model
    }
  };
}

function internalToOpenAI(
  response: ChatResponse, 
  originalRequest: OpenAIRequest,
  requestId: string
): OpenAIResponse {
  return {
    id: requestId,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: originalRequest.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: response.content
        },
        finish_reason: response.metadata?.finishReason || "stop"
      }
    ],
    usage: {
      prompt_tokens: response.usage?.inputTokens || 0,
      completion_tokens: response.usage?.outputTokens || 0,
      total_tokens: response.usage?.totalTokens || 0
    }
  };
}

// Gemini Transformations
function geminiToInternal(request: GeminiRequest): ChatRequest {
  const lastContent = request.contents[request.contents.length - 1];
  const context = request.contents.slice(0, -1);
  
  return {
    message: lastContent.parts.map(part => part.text).join(" "),
    context: context.map(content => ({
      role: content.role || "user",
      content: content.parts.map(part => part.text).join(" ")
    })),
    options: {
      temperature: request.generationConfig?.temperature,
      maxTokens: request.generationConfig?.maxOutputTokens,
      model: "gemini-pro"
    }
  };
}

function internalToGemini(
  response: ChatResponse, 
  originalRequest: GeminiRequest
): GeminiResponse {
  return {
    candidates: [
      {
        content: {
          parts: [
            {
              text: response.content
            }
          ],
          role: "model"
        },
        finishReason: response.metadata?.finishReason || "STOP",
        index: 0
      }
    ],
    usageMetadata: {
      promptTokenCount: response.usage?.inputTokens || 0,
      candidatesTokenCount: response.usage?.outputTokens || 0,
      totalTokenCount: response.usage?.totalTokens || 0
    }
  };
}

// Claude Transformations
function claudeToInternal(request: ClaudeRequest): ChatRequest {
  const lastMessage = request.messages[request.messages.length - 1];
  const context = request.messages.slice(0, -1);
  
  return {
    message: lastMessage.content,
    context: context.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    options: {
      temperature: request.temperature,
      maxTokens: request.max_tokens,
      model: request.model
    }
  };
}

function internalToClaude(
  response: ChatResponse, 
  originalRequest: ClaudeRequest,
  requestId: string
): ClaudeResponse {
  return {
    id: requestId,
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: response.content
      }
    ],
    model: originalRequest.model,
    stop_reason: response.metadata?.finishReason || "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: response.usage?.inputTokens || 0,
      output_tokens: response.usage?.outputTokens || 0
    }
  };
}

/**
 * Convert between any two API formats directly
 */
export function convertFormat(
  request: any,
  fromFormat: ApiFormat,
  toFormat: ApiFormat,
  requestId: string
): any {
  if (fromFormat === toFormat) {
    return request;
  }
  
  // Convert to internal format first
  const internal = toInternalFormat(request, fromFormat);
  
  // Create a mock response to demonstrate the conversion
  const mockResponse: ChatResponse = {
    content: "This is a format conversion example",
    role: "assistant",
    usage: {
      inputTokens: 10,
      outputTokens: 8,
      totalTokens: 18
    }
  };
  
  // Convert to target format
  return fromInternalFormat(mockResponse, toFormat, request, requestId);
}

/**
 * Validate that a response matches the expected format
 */
export function validateResponseFormat(response: any, format: ApiFormat): boolean {
  switch (format) {
    case "openai":
      return isValidOpenAIResponse(response);
    case "gemini":
      return isValidGeminiResponse(response);
    case "claude":
      return isValidClaudeResponse(response);
    default:
      return false;
  }
}

function isValidOpenAIResponse(response: any): response is OpenAIResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    typeof response.id === "string" &&
    typeof response.object === "string" &&
    typeof response.created === "number" &&
    typeof response.model === "string" &&
    Array.isArray(response.choices) &&
    response.choices.length > 0 &&
    typeof response.usage === "object"
  );
}

function isValidGeminiResponse(response: any): response is GeminiResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    Array.isArray(response.candidates) &&
    response.candidates.length > 0 &&
    typeof response.usageMetadata === "object"
  );
}

function isValidClaudeResponse(response: any): response is ClaudeResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    typeof response.id === "string" &&
    typeof response.type === "string" &&
    typeof response.role === "string" &&
    Array.isArray(response.content) &&
    response.content.length > 0 &&
    typeof response.usage === "object"
  );
}

/**
 * Extract error information from provider responses
 */
export function extractError(response: any, format: ApiFormat): { code: string; message: string } | null {
  if (!response || typeof response !== "object") {
    return null;
  }
  
  // Common error patterns
  if (response.error) {
    return {
      code: response.error.code || "unknown_error",
      message: response.error.message || "Unknown error occurred"
    };
  }
  
  // Format-specific error patterns
  switch (format) {
    case "openai":
      if (response.error) {
        return {
          code: response.error.type || "openai_error",
          message: response.error.message || "OpenAI API error"
        };
      }
      break;
      
    case "gemini":
      if (response.error) {
        return {
          code: response.error.code || "gemini_error",
          message: response.error.message || "Gemini API error"
        };
      }
      break;
      
    case "claude":
      if (response.type === "error") {
        return {
          code: response.error?.type || "claude_error",
          message: response.error?.message || "Claude API error"
        };
      }
      break;
  }
  
  return null;
}

/**
 * Create a standardized error response in the requested format
 */
export function createErrorResponse(
  error: { code: string; message: string },
  format: ApiFormat,
  requestId: string,
  model?: string
): any {
  switch (format) {
    case "openai":
      return {
        error: {
          message: error.message,
          type: error.code,
          param: null,
          code: error.code
        }
      };
      
    case "gemini":
      return {
        error: {
          code: error.code,
          message: error.message,
          status: "FAILED_PRECONDITION"
        }
      };
      
    case "claude":
      return {
        type: "error",
        error: {
          type: error.code,
          message: error.message
        }
      };
      
    default:
      return {
        error: {
          code: error.code,
          message: error.message
        }
      };
  }
}
