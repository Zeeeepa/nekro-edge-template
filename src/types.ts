export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  SESSIONS: KVNamespace;
  ENDPOINTS: KVNamespace;
  NODE_ENV: "development" | "production" | "test";
  VITE_PORT: string;
  
  // Cloudflare Configuration
  CLOUDFLARE_EMAIL: string;
  CLOUDFLARE_API_KEY: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_DOMAIN: string;
  CLOUDFLARE_WORKER_NAME: string;
  CLOUDFLARE_WORKER_URL: string;
  
  // Provider Credentials - Real credentials for webchat automation
  K2THINK_EMAIL: string;
  K2THINK_PASSWORD: string;
  QWEN_EMAIL: string;
  QWEN_PASSWORD: string;
  DEEPSEEK_EMAIL: string;
  DEEPSEEK_PASSWORD: string;
  GROK_EMAIL: string;
  GROK_PASSWORD: string;
  ZAI_EMAIL: string;
  ZAI_PASSWORD: string;
  
  // Browser Automation Services
  BROWSERBASE_API_KEY?: string;
  BROWSERBASE_PROJECT_ID?: string;
  STAGEHAND_API_KEY?: string;
  
  // API Tokens for direct API providers
  CODEGEN_API_TOKEN?: string;
  TALKAI_API_TOKEN?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
};
