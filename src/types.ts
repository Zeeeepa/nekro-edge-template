export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  NODE_ENV: "development" | "production" | "test";
  VITE_PORT: string;
  
  // Universal API Gateway environment variables
  BROWSERBASE_API_KEY?: string;
  BROWSERBASE_PROJECT_ID?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
};
