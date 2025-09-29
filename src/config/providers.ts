/**
 * Default Provider Configurations
 * Based on the provided credentials and endpoints
 */

import type { Provider, AutomationInstructions } from "../types/gateway";

// Default provider configurations
export const DEFAULT_PROVIDERS: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: "zai",
    displayName: "Z.AI",
    type: "webchat",
    enabled: true,
    priority: 8,
    baseUrl: "https://chat.z.ai",
    loginUrl: "https://chat.z.ai/login",
    chatUrl: "https://chat.z.ai/chat",
    email: "developer@pixelium.uk",
    password: "developer123?", // Will be encrypted
    successRate: 1.0,
    avgResponseTime: 2000,
    healthStatus: "unknown",
    rateLimit: 100,
    dailyLimit: 1000,
    currentUsage: 0,
    useProxy: true,
    automationEnabled: true,
    loginInstructions: JSON.stringify({
      emailField: "Find the email or username input field",
      passwordField: "Find the password input field", 
      loginButton: "Find and click the login or sign in button",
      successIndicator: "Look for indicators that login was successful, such as a chat interface or user profile"
    }),
    chatInstructions: JSON.stringify({
      messageInput: "Find the main text input area where users type their messages",
      sendButton: "Find and click the send button to submit the message",
      responseArea: "Find the area where AI responses appear, usually the latest message",
      loadingIndicator: "Look for loading indicators while AI is generating response"
    })
  },
  {
    name: "k2think",
    displayName: "K2Think.AI",
    type: "webchat",
    enabled: true,
    priority: 7,
    baseUrl: "https://www.k2think.ai",
    loginUrl: "https://www.k2think.ai/login",
    chatUrl: "https://www.k2think.ai/chat",
    email: "developer@pixelium.uk",
    password: "developer123?",
    successRate: 1.0,
    avgResponseTime: 2500,
    healthStatus: "unknown",
    rateLimit: 80,
    dailyLimit: 800,
    currentUsage: 0,
    useProxy: true,
    automationEnabled: true,
    loginInstructions: JSON.stringify({
      emailField: "Find the email or username input field",
      passwordField: "Find the password input field",
      loginButton: "Find and click the login or sign in button",
      successIndicator: "Look for indicators that login was successful, such as a chat interface or user profile"
    }),
    chatInstructions: JSON.stringify({
      messageInput: "Find the main text input area where users type their messages",
      sendButton: "Find and click the send button to submit the message",
      responseArea: "Find the area where AI responses appear, usually the latest message",
      loadingIndicator: "Look for loading indicators while AI is generating response"
    })
  },
  {
    name: "qwen",
    displayName: "Qwen.AI",
    type: "webchat",
    enabled: true,
    priority: 6,
    baseUrl: "https://chat.qwen.ai",
    loginUrl: "https://chat.qwen.ai/login",
    chatUrl: "https://chat.qwen.ai/chat",
    email: "developer@pixelium.uk",
    password: "developer1?",
    successRate: 1.0,
    avgResponseTime: 1800,
    healthStatus: "unknown",
    rateLimit: 120,
    dailyLimit: 1200,
    currentUsage: 0,
    useProxy: true,
    automationEnabled: true,
    loginInstructions: JSON.stringify({
      emailField: "Find the email or username input field",
      passwordField: "Find the password input field",
      loginButton: "Find and click the login or sign in button",
      successIndicator: "Look for indicators that login was successful, such as a chat interface or user profile"
    }),
    chatInstructions: JSON.stringify({
      messageInput: "Find the main text input area where users type their messages",
      sendButton: "Find and click the send button to submit the message",
      responseArea: "Find the area where AI responses appear, usually the latest message",
      loadingIndicator: "Look for loading indicators while AI is generating response"
    })
  },
  {
    name: "deepseek",
    displayName: "DeepSeek",
    type: "webchat",
    enabled: true,
    priority: 5,
    baseUrl: "https://chat.deepseek.com",
    loginUrl: "https://chat.deepseek.com/login",
    chatUrl: "https://chat.deepseek.com/chat",
    email: "zeeeepa+1@gmail.com",
    password: "developer123??",
    successRate: 1.0,
    avgResponseTime: 2200,
    healthStatus: "unknown",
    rateLimit: 90,
    dailyLimit: 900,
    currentUsage: 0,
    useProxy: true,
    automationEnabled: true,
    loginInstructions: JSON.stringify({
      emailField: "Find the email or username input field",
      passwordField: "Find the password input field",
      loginButton: "Find and click the login or sign in button",
      successIndicator: "Look for indicators that login was successful, such as a chat interface or user profile"
    }),
    chatInstructions: JSON.stringify({
      messageInput: "Find the main text input area where users type their messages",
      sendButton: "Find and click the send button to submit the message",
      responseArea: "Find the area where AI responses appear, usually the latest message",
      loadingIndicator: "Look for loading indicators while AI is generating response"
    })
  },
  {
    name: "grok",
    displayName: "Grok",
    type: "webchat",
    enabled: true,
    priority: 9,
    baseUrl: "https://grok.com",
    loginUrl: "https://grok.com/login",
    chatUrl: "https://grok.com/chat",
    email: "developer@pixelium.uk",
    password: "developer123??",
    successRate: 1.0,
    avgResponseTime: 1500,
    healthStatus: "unknown",
    rateLimit: 150,
    dailyLimit: 1500,
    currentUsage: 0,
    useProxy: true,
    automationEnabled: true,
    loginInstructions: JSON.stringify({
      emailField: "Find the email or username input field",
      passwordField: "Find the password input field",
      loginButton: "Find and click the login or sign in button",
      successIndicator: "Look for indicators that login was successful, such as a chat interface or user profile"
    }),
    chatInstructions: JSON.stringify({
      messageInput: "Find the main text input area where users type their messages",
      sendButton: "Find and click the send button to submit the message",
      responseArea: "Find the area where AI responses appear, usually the latest message",
      loadingIndicator: "Look for loading indicators while AI is generating response"
    })
  },
  {
    name: "codegen",
    displayName: "Codegen",
    type: "api",
    enabled: true,
    priority: 10,
    baseUrl: "https://api.codegen.com",
    apiEndpoint: "https://api.codegen.com/v1/chat/completions",
    successRate: 1.0,
    avgResponseTime: 1200,
    healthStatus: "unknown",
    rateLimit: 200,
    dailyLimit: 2000,
    currentUsage: 0,
    useProxy: false,
    automationEnabled: false
  },
  {
    name: "talkai",
    displayName: "TalkAI",
    type: "api",
    enabled: true,
    priority: 4,
    baseUrl: "https://api.talkai.com",
    apiEndpoint: "https://api.talkai.com/v1/chat/completions",
    successRate: 1.0,
    avgResponseTime: 2800,
    healthStatus: "unknown",
    rateLimit: 60,
    dailyLimit: 600,
    currentUsage: 0,
    useProxy: true,
    automationEnabled: false
  },
  {
    name: "chatgpt",
    displayName: "ChatGPT (via chat2api)",
    type: "proxy",
    enabled: true,
    priority: 3,
    baseUrl: "https://chat.openai.com",
    apiEndpoint: "https://api.openai.com/v1/chat/completions", // Proxied through chat2api
    successRate: 1.0,
    avgResponseTime: 3000,
    healthStatus: "unknown",
    rateLimit: 40,
    dailyLimit: 400,
    currentUsage: 0,
    useProxy: true,
    automationEnabled: false
  },
  {
    name: "bing",
    displayName: "Bing Chat",
    type: "webchat",
    enabled: false, // Disabled by default due to complexity
    priority: 2,
    baseUrl: "https://www.bing.com/chat",
    loginUrl: "https://login.live.com",
    chatUrl: "https://www.bing.com/chat",
    successRate: 0.8,
    avgResponseTime: 4000,
    healthStatus: "unknown",
    rateLimit: 30,
    dailyLimit: 300,
    currentUsage: 0,
    useProxy: true,
    automationEnabled: true,
    loginInstructions: JSON.stringify({
      emailField: "Find the Microsoft account email input field",
      passwordField: "Find the password input field",
      loginButton: "Find and click the sign in button",
      successIndicator: "Look for successful login to Microsoft account and access to Bing Chat"
    }),
    chatInstructions: JSON.stringify({
      messageInput: "Find the Bing Chat message input area",
      sendButton: "Find and click the send button or press Enter",
      responseArea: "Find the area where Bing Chat responses appear",
      loadingIndicator: "Look for typing indicators or loading animations"
    })
  }
];

// Model mappings for different API formats
export const MODEL_MAPPINGS = {
  // OpenAI format models -> Provider mapping
  "gpt-3.5-turbo": "zai", // Map to Z.AI as default
  "gpt-4": "grok", // Map to Grok for GPT-4 requests
  "gpt-4-turbo": "grok",
  
  // Gemini format models
  "gemini-pro": "qwen", // Map to Qwen for Gemini requests
  "gemini-1.5-pro": "qwen",
  
  // Claude format models
  "claude-3-sonnet": "k2think", // Map to K2Think for Claude requests
  "claude-3-opus": "k2think",
  "claude-3-haiku": "deepseek",
  
  // Provider-specific models
  "k2think-chat": "k2think",
  "qwen-max": "qwen",
  "deepseek-chat": "deepseek",
  "grok-beta": "grok",
  "codegen-latest": "codegen"
};

// Default system configuration
export const DEFAULT_SYSTEM_CONFIG = [
  {
    key: "load_balancing_strategy",
    value: "weighted",
    description: "Default load balancing strategy",
    category: "load_balancing"
  },
  {
    key: "max_retries",
    value: "3",
    description: "Maximum number of retries for failed requests",
    category: "reliability"
  },
  {
    key: "retry_delay",
    value: "1000",
    description: "Delay between retries in milliseconds",
    category: "reliability"
  },
  {
    key: "health_check_interval",
    value: "300000",
    description: "Health check interval in milliseconds (5 minutes)",
    category: "monitoring"
  },
  {
    key: "session_timeout",
    value: "3600000",
    description: "Session timeout in milliseconds (1 hour)",
    category: "session"
  },
  {
    key: "enable_analytics",
    value: "true",
    description: "Enable analytics and logging",
    category: "analytics"
  },
  {
    key: "enable_proxy",
    value: "true",
    description: "Enable FlareProx proxy by default",
    category: "proxy"
  },
  {
    key: "proxy_pool_size",
    value: "5",
    description: "Number of proxy endpoints to maintain",
    category: "proxy"
  }
];

// Default load balancing configuration
export const DEFAULT_LOAD_BALANCING_CONFIG = {
  strategy: "weighted" as const,
  healthWeight: 0.4,
  responseTimeWeight: 0.3,
  successRateWeight: 0.3,
  maxRetries: 3,
  retryDelay: 1000,
  circuitBreakerThreshold: 5
};
