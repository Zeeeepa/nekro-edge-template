-- Seed script for provider data with real configurations
-- This will populate the database with actual provider endpoints for testing

-- Insert OpenAI Provider
INSERT INTO providers (
  name, display_name, type, enabled, priority, 
  base_url, api_endpoint
) VALUES (
  'openai', 'OpenAI', 'api', 1, 10,
  'https://api.openai.com', '/v1/chat/completions'
);

-- Insert Anthropic (Claude) Provider
INSERT INTO providers (
  name, display_name, type, enabled, priority,
  base_url, api_endpoint
) VALUES (
  'anthropic', 'Anthropic Claude', 'api', 1, 9,
  'https://api.anthropic.com', '/v1/messages'
);

-- Insert Google Gemini Provider
INSERT INTO providers (
  name, display_name, type, enabled, priority,
  base_url, api_endpoint
) VALUES (
  'gemini', 'Google Gemini', 'api', 1, 8,
  'https://generativelanguage.googleapis.com', '/v1beta/models/gemini-pro:generateContent'
);

-- Insert DeepSeek Provider
INSERT INTO providers (
  name, display_name, type, enabled, priority,
  base_url, api_endpoint
) VALUES (
  'deepseek', 'DeepSeek', 'api', 1, 7,
  'https://api.deepseek.com', '/v1/chat/completions'
);

-- Insert GLM-4 Provider (Z.ai)
INSERT INTO providers (
  name, display_name, type, enabled, priority,
  base_url, api_endpoint
) VALUES (
  'glm4', 'GLM-4 (Z.ai)', 'api', 1, 6,
  'https://open.bigmodel.cn', '/api/paas/v4/chat/completions'
);

-- Insert system config for load balancing
INSERT INTO system_config (key, value, description, category)
VALUES (
  'load_balancing_enabled', 'true', 'Enable load balancing across providers', 'gateway'
);

INSERT INTO system_config (key, value, description, category)
VALUES (
  'load_balancing_strategy', 'priority', 'Load balancing strategy: priority, round_robin, least_latency', 'gateway'
);

INSERT INTO system_config (key, value, description, category)
VALUES (
  'default_model', 'gpt-3.5-turbo', 'Default model to use when not specified', 'gateway'
);
