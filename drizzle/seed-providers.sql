-- Clear existing providers
DELETE FROM providers;
DELETE FROM sqlite_sequence WHERE name = 'providers';

INSERT INTO providers (
  name, display_name, type, enabled, priority,
  base_url, login_url, chat_url, api_endpoint,
  email, password, api_key, session_cookies,
  success_rate, avg_response_time, last_health_check, health_status,
  rate_limit, daily_limit, current_usage,
  proxy_endpoints, use_proxy, automation_enabled,
  login_instructions, chat_instructions
) VALUES ('deepseek', 'DeepSeek', 'webchat', 1, 5, 'https://chat.deepseek.com', 'https://chat.deepseek.com/login', 'https://chat.deepseek.com/chat', NULL, 'developer@pixelium.uk', 'developer123?', NULL, NULL, 1, 2200, NULL, 'unknown', 90, 900, 0, NULL, 1, 1, '{"emailField":"Find the email or username input field","passwordField":"Find the password input field","loginButton":"Find and click the login or sign in button","successIndicator":"Look for indicators that login was successful, such as a chat interface or user profile"}', '{"messageInput":"Find the main text input area where users type their messages","sendButton":"Find and click the send button to submit the message","responseArea":"Find the area where AI responses appear, usually the latest message","loadingIndicator":"Look for loading indicators while AI is generating response"}');
