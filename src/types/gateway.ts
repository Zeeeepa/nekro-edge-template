/**
 * Universal API Gateway Types
 * Combines FlareProx, AutoGPT, and open_codegen functionality
 */

// Provider Types
export type ProviderType = "webchat" | "api" | "proxy";
export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";
export type LoadBalancingStrategy = "round_robin" | "weighted" | "health_based" | "least_used";

// API Format Types
export type ApiFormat = "openai" | "gemini" | "claude" | "custom";

// Provider Configuration
export interface Provider {
  id: number;
  name: string;
  displayName: string;
  type: ProviderType;
  enabled: boolean;
  priority: number;
  
  // Connection details
  baseUrl: string;
  loginUrl?: string;
  chatUrl?: string;
  apiEndpoint?: string;
  
  // Authentication
  email?: string;
  password?: string; // Encrypted
  apiKey?: string; // Encrypted
  sessionCookies?: string; // JSON string
  
  // Performance metrics
  successRate: number;
  avgResponseTime: number;
  lastHealthCheck?: number;
  healthStatus: HealthStatus;
  
  // Rate limiting
  rateLimit: number;
  dailyLimit: number;
  currentUsage: number;
  
  // FlareProx integration
  proxyEndpoints?: string; // JSON array
  useProxy: boolean;
  
  // AutoGPT automation
  automationEnabled: boolean;
  loginInstructions?: string; // JSON object
  chatInstructions?: string; // JSON object
  
  createdAt: number;
  updatedAt: number;
}

// OpenAI API Format
export interface OpenAIRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Gemini API Format
export interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
    role?: string;
  }>;
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
    index: number;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// Claude API Format
export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
}

export interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Universal Chat Format (internal)
export interface ChatRequest {
  message: string;
  context?: Array<{
    role: string;
    content: string;
  }>;
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  };
}

export interface ChatResponse {
  content: string;
  role: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  metadata?: {
    model?: string;
    finishReason?: string;
    responseTime?: number;
  };
}

// Session Management
export interface SessionData {
  sessionId: string;
  providerId: number;
  cookies?: Record<string, string>;
  authTokens?: Record<string, string>;
  userAgent?: string;
  isActive: boolean;
  lastUsed: number;
  expiresAt?: number;
  browserSessionId?: string;
  automationData?: Record<string, any>;
}

// FlareProx Integration
export interface ProxyEndpoint {
  id: number;
  name: string;
  url: string;
  isActive: boolean;
  lastChecked?: number;
  responseTime?: number;
  successRate: number;
  totalRequests: number;
  successfulRequests: number;
  workerId?: string;
  workerUrl?: string;
}

// AutoGPT Automation Instructions
export interface AutomationInstructions {
  loginInstructions: {
    emailField: string;
    passwordField: string;
    loginButton: string;
    successIndicator: string;
  };
  chatInstructions: {
    messageInput: string;
    sendButton: string;
    responseArea: string;
    loadingIndicator: string;
  };
}

// Load Balancing Configuration
export interface LoadBalancingConfig {
  strategy: LoadBalancingStrategy;
  healthWeight: number;
  responseTimeWeight: number;
  successRateWeight: number;
  maxRetries: number;
  retryDelay: number;
  circuitBreakerThreshold: number;
}

// API Call Log
export interface ApiCallLog {
  id: number;
  providerId: number;
  inputFormat: ApiFormat;
  outputFormat: ApiFormat;
  model?: string;
  endpoint?: string;
  requestTokens?: number;
  responseTokens?: number;
  totalTokens?: number;
  responseTime?: number;
  success: boolean;
  errorMessage?: string;
  errorCode?: string;
  userAgent?: string;
  clientIp?: string;
  requestId?: string;
  createdAt: number;
}

// Gateway Request/Response
export interface GatewayRequest {
  format: ApiFormat;
  originalRequest: OpenAIRequest | GeminiRequest | ClaudeRequest;
  providerOverride?: string;
  requestId: string;
  clientIp?: string;
  userAgent?: string;
}

export interface GatewayResponse {
  format: ApiFormat;
  originalResponse: OpenAIResponse | GeminiResponse | ClaudeResponse;
  provider: string;
  responseTime: number;
  requestId: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

// Error Types
export interface GatewayError {
  code: string;
  message: string;
  provider?: string;
  originalError?: any;
  retryable: boolean;
}

// Health Check Result
export interface HealthCheckResult {
  providerId: number;
  status: HealthStatus;
  responseTime?: number;
  error?: string;
  timestamp: number;
}

// Analytics Data
export interface AnalyticsData {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  providerStats: Array<{
    providerId: number;
    name: string;
    requests: number;
    successRate: number;
    avgResponseTime: number;
  }>;
  formatStats: Array<{
    format: ApiFormat;
    requests: number;
    successRate: number;
  }>;
  timeRange: {
    start: number;
    end: number;
  };
}
