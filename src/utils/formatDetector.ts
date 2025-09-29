/**
 * API Format Detection Utility
 * Detects incoming API request formats (OpenAI, Gemini, Claude, etc.)
 */

import type { ApiFormat, OpenAIRequest, GeminiRequest, ClaudeRequest } from "../types/gateway";
import { MODEL_MAPPINGS } from "../config/providers";

/**
 * Detect API format based on request structure and model name
 */
export function detectApiFormat(request: any): ApiFormat {
  // Check for OpenAI format
  if (isOpenAIFormat(request)) {
    return "openai";
  }
  
  // Check for Gemini format
  if (isGeminiFormat(request)) {
    return "gemini";
  }
  
  // Check for Claude format
  if (isClaudeFormat(request)) {
    return "claude";
  }
  
  // Default to custom format
  return "custom";
}

/**
 * Check if request matches OpenAI API format
 */
function isOpenAIFormat(request: any): request is OpenAIRequest {
  return (
    typeof request === "object" &&
    request !== null &&
    typeof request.model === "string" &&
    Array.isArray(request.messages) &&
    request.messages.length > 0 &&
    request.messages.every((msg: any) => 
      typeof msg === "object" &&
      typeof msg.role === "string" &&
      typeof msg.content === "string" &&
      ["system", "user", "assistant"].includes(msg.role)
    )
  );
}

/**
 * Check if request matches Gemini API format
 */
function isGeminiFormat(request: any): request is GeminiRequest {
  return (
    typeof request === "object" &&
    request !== null &&
    Array.isArray(request.contents) &&
    request.contents.length > 0 &&
    request.contents.every((content: any) =>
      typeof content === "object" &&
      Array.isArray(content.parts) &&
      content.parts.every((part: any) =>
        typeof part === "object" &&
        typeof part.text === "string"
      )
    )
  );
}

/**
 * Check if request matches Claude API format
 */
function isClaudeFormat(request: any): request is ClaudeRequest {
  return (
    typeof request === "object" &&
    request !== null &&
    typeof request.model === "string" &&
    typeof request.max_tokens === "number" &&
    Array.isArray(request.messages) &&
    request.messages.length > 0 &&
    request.messages.every((msg: any) =>
      typeof msg === "object" &&
      typeof msg.role === "string" &&
      typeof msg.content === "string" &&
      ["user", "assistant"].includes(msg.role)
    )
  );
}

/**
 * Get provider name from model name
 */
export function getProviderFromModel(model: string): string | null {
  return MODEL_MAPPINGS[model as keyof typeof MODEL_MAPPINGS] || null;
}

/**
 * Validate request format and return validation errors
 */
export function validateRequestFormat(request: any, format: ApiFormat): string[] {
  const errors: string[] = [];
  
  switch (format) {
    case "openai":
      if (!isOpenAIFormat(request)) {
        errors.push("Invalid OpenAI format: missing required fields (model, messages)");
      }
      break;
      
    case "gemini":
      if (!isGeminiFormat(request)) {
        errors.push("Invalid Gemini format: missing required fields (contents)");
      }
      break;
      
    case "claude":
      if (!isClaudeFormat(request)) {
        errors.push("Invalid Claude format: missing required fields (model, max_tokens, messages)");
      }
      break;
      
    case "custom":
      // Custom format validation can be added here
      break;
  }
  
  return errors;
}

/**
 * Extract message content from any format
 */
export function extractMessages(request: any, format: ApiFormat): Array<{ role: string; content: string }> {
  switch (format) {
    case "openai":
      return (request as OpenAIRequest).messages;
      
    case "gemini":
      return (request as GeminiRequest).contents.map(content => ({
        role: content.role || "user",
        content: content.parts.map(part => part.text).join(" ")
      }));
      
    case "claude":
      return (request as ClaudeRequest).messages;
      
    default:
      return [];
  }
}

/**
 * Extract model name from request
 */
export function extractModel(request: any, format: ApiFormat): string | null {
  switch (format) {
    case "openai":
      return (request as OpenAIRequest).model;
      
    case "claude":
      return (request as ClaudeRequest).model;
      
    case "gemini":
      // Gemini requests don't typically include model in the request body
      return "gemini-pro";
      
    default:
      return null;
  }
}

/**
 * Extract generation parameters from request
 */
export function extractParameters(request: any, format: ApiFormat): Record<string, any> {
  const params: Record<string, any> = {};
  
  switch (format) {
    case "openai":
      const openaiReq = request as OpenAIRequest;
      if (openaiReq.temperature !== undefined) params.temperature = openaiReq.temperature;
      if (openaiReq.max_tokens !== undefined) params.maxTokens = openaiReq.max_tokens;
      if (openaiReq.top_p !== undefined) params.topP = openaiReq.top_p;
      if (openaiReq.frequency_penalty !== undefined) params.frequencyPenalty = openaiReq.frequency_penalty;
      if (openaiReq.presence_penalty !== undefined) params.presencePenalty = openaiReq.presence_penalty;
      if (openaiReq.stream !== undefined) params.stream = openaiReq.stream;
      break;
      
    case "gemini":
      const geminiReq = request as GeminiRequest;
      if (geminiReq.generationConfig) {
        if (geminiReq.generationConfig.temperature !== undefined) {
          params.temperature = geminiReq.generationConfig.temperature;
        }
        if (geminiReq.generationConfig.maxOutputTokens !== undefined) {
          params.maxTokens = geminiReq.generationConfig.maxOutputTokens;
        }
        if (geminiReq.generationConfig.topP !== undefined) {
          params.topP = geminiReq.generationConfig.topP;
        }
        if (geminiReq.generationConfig.topK !== undefined) {
          params.topK = geminiReq.generationConfig.topK;
        }
      }
      break;
      
    case "claude":
      const claudeReq = request as ClaudeRequest;
      if (claudeReq.temperature !== undefined) params.temperature = claudeReq.temperature;
      if (claudeReq.max_tokens !== undefined) params.maxTokens = claudeReq.max_tokens;
      if (claudeReq.top_p !== undefined) params.topP = claudeReq.top_p;
      if (claudeReq.top_k !== undefined) params.topK = claudeReq.top_k;
      if (claudeReq.stream !== undefined) params.stream = claudeReq.stream;
      break;
  }
  
  return params;
}

/**
 * Normalize request to a common internal format
 */
export function normalizeRequest(request: any, format: ApiFormat) {
  return {
    format,
    messages: extractMessages(request, format),
    model: extractModel(request, format),
    parameters: extractParameters(request, format),
    originalRequest: request
  };
}
