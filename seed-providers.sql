-- Seed script for WEBCHAT PROVIDERS (Browser Automation)
-- These providers require browser automation to interact with web chat interfaces

-- Insert DeepSeek WebChat Provider (PRIMARY TEST PROVIDER)
INSERT INTO providers (
  name, display_name, type, enabled, priority,
  base_url, login_url, chat_url,
  email, password,
  automation_enabled,
  login_instructions, chat_instructions
) VALUES (
  'deepseek-chat', 'DeepSeek Chat', 'webchat', 1, 10,
  'https://chat.deepseek.com',
  'https://chat.deepseek.com',
  'https://chat.deepseek.com',
  'developer@pixelium.uk',
  'developer123?',
  1,
  '{"steps": ["click login button", "enter email", "enter password", "click submit"]}',
  '{"steps": ["find chat input", "type prompt", "click send", "wait for response", "extract response text"]}'
);

-- Insert ChatGPT WebChat Provider (Example)
INSERT INTO providers (
  name, display_name, type, enabled, priority,
  base_url, login_url, chat_url,
  automation_enabled,
  login_instructions, chat_instructions
) VALUES (
  'chatgpt-web', 'ChatGPT Web', 'webchat', 0, 9,
  'https://chat.openai.com',
  'https://chat.openai.com',
  'https://chat.openai.com',
  0,
  '{"steps": ["click login", "google oauth or email", "handle captcha if needed"]}',
  '{"steps": ["find textarea", "input prompt", "submit", "wait for streaming response"]}'
);

-- Insert Claude WebChat Provider (Example)
INSERT INTO providers (
  name, display_name, type, enabled, priority,
  base_url, login_url, chat_url,
  automation_enabled,
  login_instructions, chat_instructions
) VALUES (
  'claude-web', 'Claude Web', 'webchat', 0, 8,
  'https://claude.ai',
  'https://claude.ai',
  'https://claude.ai/new',
  0,
  '{"steps": ["login with google or email"]}',
  '{"steps": ["find chat input", "type message", "send", "extract response"]}'
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
