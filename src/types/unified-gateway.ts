/**
 * Unified Universal API Gateway Types
 * Comprehensive types for the integrated FlareProx + AutoGPT + open_codegen system
 */

// Provider Types
export type ProviderType = 'webchat' | 'api' | 'proxy';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export type EndpointStatus = 'running' | 'stopped' | 'error' | 'starting' | 'stopping';
export type LoadBalancingStrategy = 'round_robin' | 'weighted' | 'health_based' | 'least_used';

// API Format Types
export type APIFormat = 'openai' | 'gemini' | 'claude' | 'custom';

// Provider Configuration
export interface ProviderConfig {
  id: number;
  name: string;
  displayName: string;
  type: ProviderType;
  enabled: boolean;
  priority: number;
  weight: number;
  
  // Connection Details
  baseUrl: string;
  loginUrl?: string;
  chatUrl?: string;
  apiEndpoint?: string;
  
  // Authentication
  email?: string;
  password?: string;
  apiKey?: string;
  sessionCookies?: Record<string, string>;
  
  // Health Monitoring
  healthStatus: HealthStatus;
  successRate: number;
  avgResponseTime: number;
  lastHealthCheck?: Date;
  
  // Rate Limiting
  rateLimit: number;
  dailyLimit: number;
  currentUsage: number;
  
  // Browser Automation (for webchat providers)
  automationEnabled: boolean;
  loginInstructions?: AutomationInstructions;
  chatInstructions?: AutomationInstructions;
  browserSessionId?: string;
  
  // FlareProx Integration
  useProxy: boolean;
  proxyEndpoints?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

// Browser Automation Instructions
export interface AutomationInstructions {
  selectors: {
    emailInput?: string;
    passwordInput?: string;
    loginButton?: string;
    messageInput?: string;
    sendButton?: string;
    responseContainer?: string;
  };
  actions: AutomationAction[];
  waitConditions: WaitCondition[];
}

export interface AutomationAction {
  type: 'click' | 'type' | 'wait' | 'scroll' | 'extract';
  selector?: string;
  text?: string;
  delay?: number;
  description: string;
}

export interface WaitCondition {
  type: 'element' | 'text' | 'url' | 'timeout';
  selector?: string;
  text?: string;
  url?: string;
  timeout: number;
}

// Endpoint Management (Trading Bot Style)
export interface EndpointConfig {
  id: number;
  name: string;
  providerId: number;
  url: string;
  method: string;
  headers?: Record<string, string>;
  authData?: Record<string, any>;
  enabled: boolean;
  priority: number;
  
  // Trading Bot Style Controls
  status: EndpointStatus;
  autoStart: boolean;
  maxConcurrent: number;
  
  // Health Monitoring
  healthStatus: HealthStatus;
  lastHealthCheck?: Date;
  successRate: number;
  avgResponseTime: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// Session Management
export interface SessionData {
  id: number;
  sessionId: string;
  providerId: number;
  browserSessionId?: string;
  cookies?: Record<string, string>;
  authTokens?: Record<string, string>;
  userAgent?: string;
  
  // Session Status
  isActive: boolean;
  isAuthenticated: boolean;
  lastUsed: Date;
  expiresAt?: Date;
  
  // Automation Data
  automationData?: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

// FlareProx Worker Management
export interface FlareProxWorker {
  id: number;
  name: string;
  workerUrl: string;
  region?: string;
  enabled: boolean;
  
  // Health Monitoring
  healthStatus: HealthStatus;
  lastHealthCheck?: Date;
  responseTime: number;
  successRate: number;
  
  // Usage Statistics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types
export interface UniversalAPIRequest {
  // Common fields
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  
  // OpenAI format
  messages?: OpenAIMessage[];
  
  // Gemini format
  contents?: GeminiContent[];
  generationConfig?: GeminiGenerationConfig;
  
  // Claude format
  system?: string;
  
  // Gateway-specific options
  provider_override?: string;
  request_id?: string;
  format_hint?: APIFormat;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GeminiContent {
  parts: GeminiPart[];
  role?: 'user' | 'model';
}

export interface GeminiPart {
  text: string;
}

export interface GeminiGenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

export interface UniversalAPIResponse {
  // Common fields
  id: string;
  object: string;
  created: number;
  model: string;
  
  // OpenAI format
  choices?: OpenAIChoice[];
  usage?: TokenUsage;
  
  // Gemini format
  candidates?: GeminiCandidate[];
  
  // Claude format
  content?: ClaudeContent[];
  
  // Gateway metadata
  provider_used?: string;
  format_detected?: APIFormat;
  response_time?: number;
  request_id?: string;
}

export interface OpenAIChoice {
  index: number;
  message: OpenAIMessage;
  finish_reason: string;
}

export interface GeminiCandidate {
  content: GeminiContent;
  finishReason?: string;
  index?: number;
}

export interface ClaudeContent {
  type: 'text';
  text: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
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

// Analytics and Monitoring
export interface AnalyticsData {
  providerId?: number;
  endpointId?: number;
  date: string;
  hour?: number;
  
  // Request Statistics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  
  // Format Statistics
  openaiRequests: number;
  geminiRequests: number;
  claudeRequests: number;
  
  // Token Usage
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  
  // Cost Tracking
  estimatedCost: number;
}

// Health Check Results
export interface HealthCheckResult {
  providerId: number;
  status: HealthStatus;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}

// Browser Automation Results
export interface AutomationResult {
  success: boolean;
  sessionId?: string;
  cookies?: Record<string, string>;
  response?: string;
  errorMessage?: string;
  screenshots?: string[];
  executionTime: number;
}

// Cloudflare Worker Deployment
export interface WorkerDeployment {
  name: string;
  script: string;
  bindings?: Record<string, any>;
  routes?: string[];
  environment?: 'production' | 'preview';
}

// System Configuration
export interface SystemConfig {
  key: string;
  value: string;
  description?: string;
  category: string;
}

// Error Types
export interface GatewayError {
  code: string;
  message: string;
  details?: Record<string, any>;
  provider?: string;
  timestamp: Date;
}

// Chat Testing Interface
export interface ChatTestRequest {
  message: string;
  provider?: string;
  format?: APIFormat;
  options?: Record<string, any>;
}

export interface ChatTestResponse {
  response: string;
  provider: string;
  format: APIFormat;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

// Management Interface Types
export interface DashboardStats {
  totalProviders: number;
  activeProviders: number;
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  topProviders: Array<{
    name: string;
    requests: number;
    successRate: number;
  }>;
}

export interface ProviderMetrics {
  providerId: number;
  name: string;
  status: HealthStatus;
  requests24h: number;
  successRate: number;
  avgResponseTime: number;
  lastUsed?: Date;
  errorRate: number;
}
