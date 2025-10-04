/**
 * Universal API Gateway Routes
 * Handles all incoming API requests and routes them to appropriate providers
 */

import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { eq, and, gte, desc, asc } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import * as drizzleSchema from "../db/schema";

import { providers, apiCalls, sessions } from "../db/schema";
import { detectApiFormat, getProviderFromModel, validateRequestFormat, normalizeRequest } from "../utils/formatDetector";
import { toInternalFormat, fromInternalFormat, createErrorResponse } from "../utils/formatTransformer";
import { FlareProxManager } from "../utils/flareProxManager";
import type { 
  ApiFormat, 
  Provider, 
  ChatRequest, 
  ChatResponse, 
  GatewayRequest,
  GatewayResponse,
  GatewayError
} from "../types/gateway";

// Request/Response Schemas
const UniversalChatRequestSchema = z.object({
  // OpenAI format
  model: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string()
  })).optional(),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  frequency_penalty: z.number().optional(),
  presence_penalty: z.number().optional(),
  stream: z.boolean().optional(),
  
  // Gemini format
  contents: z.array(z.object({
    parts: z.array(z.object({
      text: z.string()
    })),
    role: z.string().optional()
  })).optional(),
  generationConfig: z.object({
    temperature: z.number().optional(),
    topK: z.number().optional(),
    topP: z.number().optional(),
    maxOutputTokens: z.number().optional()
  }).optional(),
  
  // Claude format (max_tokens is required for Claude but optional here for flexibility)
  
  // Gateway-specific options
  provider_override: z.string().optional(),
  request_id: z.string().optional()
});

const UniversalChatResponseSchema = z.object({
  // OpenAI format response
  id: z.string().optional(),
  object: z.string().optional(),
  created: z.number().optional(),
  model: z.string().optional(),
  choices: z.array(z.object({
    index: z.number(),
    message: z.object({
      role: z.string(),
      content: z.string()
    }),
    finish_reason: z.string()
  })).optional(),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number()
  }).optional(),
  
  // Gemini format response
  candidates: z.array(z.object({
    content: z.object({
      parts: z.array(z.object({
        text: z.string()
      })),
      role: z.string()
    }),
    finishReason: z.string(),
    index: z.number()
  })).optional(),
  usageMetadata: z.object({
    promptTokenCount: z.number(),
    candidatesTokenCount: z.number(),
    totalTokenCount: z.number()
  }).optional(),
  
  // Claude format response
  content: z.array(z.object({
    type: z.string(),
    text: z.string()
  })).optional(),
  stop_reason: z.string().optional(),
  
  // Error response
  error: z.object({
    message: z.string(),
    type: z.string().optional(),
    code: z.string().optional()
  }).optional()
});

// Universal Chat Completion Route
const UniversalChatRoute = createRoute({
  method: "post",
  path: "/v1/chat/completions",
  request: {
    body: {
      content: {
        "application/json": {
          schema: UniversalChatRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: UniversalChatResponseSchema
        }
      },
      description: "Successful chat completion response"
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.object({
              message: z.string(),
              type: z.string(),
              code: z.string()
            })
          })
        }
      },
      description: "Bad request - invalid format or parameters"
    },
    500: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.object({
              message: z.string(),
              type: z.string(),
              code: z.string()
            })
          })
        }
      },
      description: "Internal server error"
    }
  },
  tags: ["Gateway"]
});

// Models List Route
const ModelsRoute = createRoute({
  method: "get",
  path: "/v1/models",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            object: z.string(),
            data: z.array(z.object({
              id: z.string(),
              object: z.string(),
              created: z.number(),
              owned_by: z.string(),
              provider: z.string().optional()
            }))
          })
        }
      },
      description: "List of available models"
    }
  },
  tags: ["Gateway"]
});

// Health Check Route
const HealthRoute = createRoute({
  method: "get",
  path: "/v1/health",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            status: z.string(),
            timestamp: z.number(),
            providers: z.object({
              total: z.number(),
              healthy: z.number(),
              degraded: z.number(),
              unhealthy: z.number()
            })
          })
        }
      },
      description: "System health status"
    }
  },
  tags: ["Gateway"]
});

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
};

export const gatewayApp = new OpenAPIHono<{ 
  Bindings: { 
    DB: D1Database;
    BROWSERBASE_API_KEY?: string;
    BROWSERBASE_PROJECT_ID?: string;
    CLOUDFLARE_ACCOUNT_ID?: string;
  };
  Variables: Variables;
}>()
// Add DB middleware
.use("*", async (c, next) => {
  const db = drizzle(c.env.DB, { schema: drizzleSchema });
  c.set("db", db);
  await next();
})

// Universal Chat Completion Handler
.openapi(UniversalChatRoute, async (c) => {
  const request = c.req.valid("json");
  const db = c.get("db");
  const requestId = request.request_id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // 1. Detect API format
    const format = detectApiFormat(request);
    console.log(`Detected format: ${format}`);
    
    // 2. Validate request format
    const validationErrors = validateRequestFormat(request, format);
    if (validationErrors.length > 0) {
      return c.json(createErrorResponse(
        { code: "invalid_request", message: validationErrors.join(", ") },
        format,
        requestId
      ), 400);
    }
    
    // 3. Normalize request to internal format
    const normalizedRequest = normalizeRequest(request, format);
    const internalRequest = toInternalFormat(request, format);
    
    // 4. Select provider
    let selectedProvider: Provider | null = null;
    
    // Check for provider override
    if (request.provider_override) {
      const overrideProvider = await db
        .select()
        .from(providers)
        .where(and(
          eq(providers.name, request.provider_override),
          eq(providers.enabled, true)
        ))
        .get();
      
      if (overrideProvider) {
        selectedProvider = overrideProvider;
        console.log(`Using provider override: ${selectedProvider.name}`);
      }
    }
    
    // If no override or override not found, use intelligent selection
    if (!selectedProvider) {
      selectedProvider = await selectOptimalProvider(db, format, normalizedRequest.model);
    }
    
    if (!selectedProvider) {
      return c.json(createErrorResponse(
        { code: "no_provider_available", message: "No healthy providers available for this request" },
        format,
        requestId
      ), 500);
    }
    
    console.log(`Selected provider: ${selectedProvider.name} (${selectedProvider.type})`);
    
    // 5. Send request to provider
    const startTime = Date.now();
    let response: ChatResponse;
    
    try {
      response = await sendToProvider(selectedProvider, internalRequest, c.env);
    } catch (error) {
      console.error(`Provider ${selectedProvider.name} failed:`, error);
      
      // Log failed API call
      await logApiCall(db, selectedProvider.id, format, format, false, {
        requestId,
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        model: normalizedRequest.model
      });
      
      // Try fallback provider
      const fallbackProvider = await selectFallbackProvider(db, format, selectedProvider.id);
      if (fallbackProvider) {
        console.log(`Trying fallback provider: ${fallbackProvider.name}`);
        try {
          response = await sendToProvider(fallbackProvider, internalRequest, c.env);
          selectedProvider = fallbackProvider; // Update for logging
        } catch (fallbackError) {
          return c.json(createErrorResponse(
            { code: "provider_error", message: "All providers failed to respond" },
            format,
            requestId
          ), 500);
        }
      } else {
        return c.json(createErrorResponse(
          { code: "provider_error", message: error instanceof Error ? error.message : "Provider error" },
          format,
          requestId
        ), 500);
      }
    }
    
    const responseTime = Date.now() - startTime;
    
    // 6. Convert response back to original format
    const formattedResponse = fromInternalFormat(response, format, request, requestId);
    
    // 7. Log successful API call
    await logApiCall(db, selectedProvider.id, format, format, true, {
      requestId,
      responseTime,
      model: normalizedRequest.model,
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
      totalTokens: response.usage?.totalTokens
    });
    
    return c.json(formattedResponse);
    
  } catch (error) {
    console.error("Gateway error:", error);
    
    const format = detectApiFormat(request);
    return c.json(createErrorResponse(
      { code: "internal_error", message: "Internal gateway error" },
      format,
      requestId
    ), 500);
  }
})

// Models List Handler
.openapi(ModelsRoute, async (c) => {
  const db = c.get("db");
  
  try {
    const enabledProviders = await db
      .select()
      .from(providers)
      .where(eq(providers.enabled, true))
      .all();
    
    const models = [
      // OpenAI-compatible models
      { id: "gpt-3.5-turbo", object: "model", created: 1677610602, owned_by: "openai", provider: "zai" },
      { id: "gpt-4", object: "model", created: 1687882411, owned_by: "openai", provider: "grok" },
      { id: "gpt-4-turbo", object: "model", created: 1712361441, owned_by: "openai", provider: "grok" },
      
      // Gemini models
      { id: "gemini-pro", object: "model", created: 1696118400, owned_by: "google", provider: "qwen" },
      { id: "gemini-1.5-pro", object: "model", created: 1708560000, owned_by: "google", provider: "qwen" },
      
      // Claude models
      { id: "claude-3-sonnet", object: "model", created: 1709251200, owned_by: "anthropic", provider: "k2think" },
      { id: "claude-3-opus", object: "model", created: 1709251200, owned_by: "anthropic", provider: "k2think" },
      { id: "claude-3-haiku", object: "model", created: 1709251200, owned_by: "anthropic", provider: "deepseek" },
      
      // Provider-specific models
      ...enabledProviders.map((provider: any) => ({
        id: `${provider.name}-chat`,
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: provider.name,
        provider: provider.name
      }))
    ];
    
    return c.json({
      object: "list",
      data: models
    });
  } catch (error) {
    console.error("Error fetching models:", error);
    return c.json({ error: { message: "Failed to fetch models" } }, 500);
  }
})

// Health Check Handler
.openapi(HealthRoute, async (c) => {
  const db = c.get("db");
  
  try {
    const allProviders = await db.select().from(providers).all();
    
    const providerStats = {
      total: allProviders.length,
      healthy: allProviders.filter(p => p.healthStatus === "healthy").length,
      degraded: allProviders.filter(p => p.healthStatus === "degraded").length,
      unhealthy: allProviders.filter(p => p.healthStatus === "unhealthy").length
    };
    
    return c.json({
      status: "ok",
      timestamp: Date.now(),
      providers: providerStats
    });
  } catch (error) {
    console.error("Health check error:", error);
    return c.json({
      status: "error",
      timestamp: Date.now(),
      providers: { total: 0, healthy: 0, degraded: 0, unhealthy: 0 }
    }, 500);
  }
});

// Helper Functions

/**
 * Select optimal provider based on format, model, and health metrics
 */
async function selectOptimalProvider(
  db: DrizzleD1Database, 
  format: ApiFormat, 
  model?: string | null
): Promise<Provider | null> {
  // First try to get provider from model mapping
  if (model) {
    const preferredProviderName = getProviderFromModel(model);
    if (preferredProviderName) {
      const preferredProvider = await db
        .select()
        .from(providers)
        .where(and(
          eq(providers.name, preferredProviderName),
          eq(providers.enabled, true),
          gte(providers.successRate, 0.8)
        ))
        .get();
      
      if (preferredProvider) {
        return preferredProvider;
      }
    }
  }
  
  // Fallback to best available provider
  const availableProviders = await db
    .select()
    .from(providers)
    .where(and(
      eq(providers.enabled, true),
      gte(providers.successRate, 0.7)
    ))
    .orderBy(desc(providers.priority), asc(providers.avgResponseTime))
    .all();
  
  return availableProviders[0] || null;
}

/**
 * Select fallback provider (excluding the failed one)
 */
async function selectFallbackProvider(
  db: DrizzleD1Database,
  format: ApiFormat,
  excludeProviderId: number
): Promise<Provider | null> {
  const fallbackProviders = await db
    .select()
    .from(providers)
    .where(and(
      eq(providers.enabled, true),
      gte(providers.successRate, 0.5)
    ))
    .orderBy(desc(providers.priority))
    .all();
  
  return fallbackProviders.find(p => p.id !== excludeProviderId) || null;
}

/**
 * Send request to provider (placeholder - would integrate with AutoGPT/FlareProx)
 */
async function sendToProvider(
  provider: Provider,
  request: ChatRequest,
  env: any
): Promise<ChatResponse> {
  console.log(`Sending request to ${provider.name} (${provider.type})`);
  
  // This is a placeholder implementation
  // In the real system, this would:
  // 1. For webchat providers: Use AutoGPT automation
  // 2. For API providers: Make direct API calls
  // 3. For proxy providers: Use FlareProx + chat2api
  
  // Simulate response based on provider type
  const simulatedResponse: ChatResponse = {
    content: `Response from ${provider.displayName}: ${request.message}`,
    role: "assistant",
    usage: {
      inputTokens: request.message.length / 4, // Rough token estimation
      outputTokens: 50,
      totalTokens: (request.message.length / 4) + 50
    },
    metadata: {
      model: request.options?.model || `${provider.name}-chat`,
      finishReason: "stop",
      responseTime: provider.avgResponseTime
    }
  };
  
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
  
  return simulatedResponse;
}

/**
 * Log API call for analytics
 */
async function logApiCall(
  db: DrizzleD1Database,
  providerId: number,
  inputFormat: ApiFormat,
  outputFormat: ApiFormat,
  success: boolean,
  metadata: {
    requestId: string;
    responseTime: number;
    errorMessage?: string;
    model?: string | null;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  }
): Promise<void> {
  try {
    await db.insert(apiCalls).values({
      providerId,
      inputFormat,
      outputFormat,
      model: metadata.model,
      requestTokens: metadata.inputTokens,
      responseTokens: metadata.outputTokens,
      totalTokens: metadata.totalTokens,
      responseTime: metadata.responseTime,
      success,
      errorMessage: metadata.errorMessage,
      requestId: metadata.requestId
    });
  } catch (error) {
    console.error("Failed to log API call:", error);
  }
}
