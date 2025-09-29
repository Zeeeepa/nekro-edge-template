import { sqliteTable, text, integer, real, unique, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Original features table
export const features = sqliteTable(
  "features",
  {
    id: integer("id").primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  },
  (table) => ({
    keyIdx: unique("features_key_idx").on(table.key),
  }),
);

// Universal API Gateway Schema
export const providers = sqliteTable(
  "providers",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(), // "z.ai", "k2think", "grok", etc.
    displayName: text("display_name").notNull(),
    type: text("type").notNull(), // "webchat", "api", "proxy"
    enabled: integer("enabled", { mode: "boolean" }).default(true),
    priority: integer("priority").default(1),
    
    // Connection details
    baseUrl: text("base_url").notNull(),
    loginUrl: text("login_url"),
    chatUrl: text("chat_url"),
    apiEndpoint: text("api_endpoint"),
    
    // Authentication (encrypted)
    email: text("email"),
    password: text("password"), // Will be encrypted
    apiKey: text("api_key"), // Will be encrypted
    sessionCookies: text("session_cookies"), // JSON string of cookies
    
    // Performance metrics
    successRate: real("success_rate").default(1.0),
    avgResponseTime: integer("avg_response_time").default(1000),
    lastHealthCheck: integer("last_health_check"),
    healthStatus: text("health_status").default("unknown"), // "healthy", "degraded", "unhealthy"
    
    // Rate limiting
    rateLimit: integer("rate_limit").default(100),
    dailyLimit: integer("daily_limit").default(1000),
    currentUsage: integer("current_usage").default(0),
    
    // FlareProx integration
    proxyEndpoints: text("proxy_endpoints"), // JSON array of proxy URLs
    useProxy: integer("use_proxy", { mode: "boolean" }).default(true),
    
    // AutoGPT automation settings
    automationEnabled: integer("automation_enabled", { mode: "boolean" }).default(false),
    loginInstructions: text("login_instructions"), // JSON object with automation instructions
    chatInstructions: text("chat_instructions"), // JSON object with chat automation
    
    // Timestamps
    createdAt: integer("created_at").default(sql`(unixepoch())`),
    updatedAt: integer("updated_at").default(sql`(unixepoch())`)
  },
  (table) => ({
    nameIdx: unique("providers_name_idx").on(table.name),
    enabledIdx: index("providers_enabled_idx").on(table.enabled),
    priorityIdx: index("providers_priority_idx").on(table.priority),
  })
);

// API call logs for analytics and monitoring
export const apiCalls = sqliteTable(
  "api_calls",
  {
    id: integer("id").primaryKey(),
    providerId: integer("provider_id").references(() => providers.id),
    
    // Request details
    inputFormat: text("input_format").notNull(), // "openai", "gemini", "claude"
    outputFormat: text("output_format").notNull(),
    model: text("model"),
    endpoint: text("endpoint"),
    
    // Usage tracking
    requestTokens: integer("request_tokens"),
    responseTokens: integer("response_tokens"),
    totalTokens: integer("total_tokens"),
    
    // Performance metrics
    responseTime: integer("response_time"),
    success: integer("success", { mode: "boolean" }).notNull(),
    errorMessage: text("error_message"),
    errorCode: text("error_code"),
    
    // Request metadata
    userAgent: text("user_agent"),
    clientIp: text("client_ip"),
    requestId: text("request_id"),
    
    createdAt: integer("created_at").default(sql`(unixepoch())`)
  },
  (table) => ({
    providerIdx: index("api_calls_provider_idx").on(table.providerId),
    formatIdx: index("api_calls_format_idx").on(table.inputFormat),
    timestampIdx: index("api_calls_timestamp_idx").on(table.createdAt),
    successIdx: index("api_calls_success_idx").on(table.success),
  })
);

// Session management for persistent authentication
export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    providerId: integer("provider_id").references(() => providers.id),
    
    // Session data
    cookies: text("cookies"), // JSON string of session cookies
    authTokens: text("auth_tokens"), // JSON string of auth tokens
    userAgent: text("user_agent"),
    
    // Session status
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    lastUsed: integer("last_used").default(sql`(unixepoch())`),
    expiresAt: integer("expires_at"),
    
    // Browser automation data
    browserSessionId: text("browser_session_id"), // Browserbase session ID
    automationData: text("automation_data"), // JSON with automation state
    
    createdAt: integer("created_at").default(sql`(unixepoch())`),
    updatedAt: integer("updated_at").default(sql`(unixepoch())`)
  },
  (table) => ({
    sessionIdx: unique("sessions_session_idx").on(table.sessionId),
    providerIdx: index("sessions_provider_idx").on(table.providerId),
    activeIdx: index("sessions_active_idx").on(table.isActive),
  })
);

// Load balancing and routing configuration
export const loadBalancingConfig = sqliteTable(
  "load_balancing_config",
  {
    id: integer("id").primaryKey(),
    strategy: text("strategy").default("weighted"), // "round_robin", "weighted", "health_based", "least_used"
    
    // Weights for different strategies
    healthWeight: real("health_weight").default(0.4),
    responseTimeWeight: real("response_time_weight").default(0.3),
    successRateWeight: real("success_rate_weight").default(0.3),
    
    // Failover settings
    maxRetries: integer("max_retries").default(3),
    retryDelay: integer("retry_delay").default(1000),
    circuitBreakerThreshold: integer("circuit_breaker_threshold").default(5),
    
    updatedAt: integer("updated_at").default(sql`(unixepoch())`)
  }
);

// System configuration and settings
export const systemConfig = sqliteTable(
  "system_config",
  {
    id: integer("id").primaryKey(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    description: text("description"),
    category: text("category").default("general"),
    
    updatedAt: integer("updated_at").default(sql`(unixepoch())`)
  },
  (table) => ({
    keyIdx: unique("system_config_key_idx").on(table.key),
    categoryIdx: index("system_config_category_idx").on(table.category),
  })
);

// FlareProx proxy endpoints management
export const proxyEndpoints = sqliteTable(
  "proxy_endpoints",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    
    // Status and performance
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    lastChecked: integer("last_checked"),
    responseTime: integer("response_time"),
    successRate: real("success_rate").default(1.0),
    
    // Usage tracking
    totalRequests: integer("total_requests").default(0),
    successfulRequests: integer("successful_requests").default(0),
    
    // Cloudflare Worker details
    workerId: text("worker_id"),
    workerUrl: text("worker_url"),
    
    createdAt: integer("created_at").default(sql`(unixepoch())`),
    updatedAt: integer("updated_at").default(sql`(unixepoch())`)
  },
  (table) => ({
    nameIdx: unique("proxy_endpoints_name_idx").on(table.name),
    activeIdx: index("proxy_endpoints_active_idx").on(table.isActive),
  })
);
