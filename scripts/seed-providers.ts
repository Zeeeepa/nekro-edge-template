/**
 * Seed providers from TypeScript config into D1 database
 * Run with: npx tsx scripts/seed-providers.ts
 */

import { DEFAULT_PROVIDERS } from '../src/config/providers';

// Generate SQL from TypeScript config
function generateSeedSQL() {
  const deleteStatements = [
    '-- Clear existing providers',
    'DELETE FROM providers;',
    'DELETE FROM sqlite_sequence WHERE name = \'providers\';',
    ''
  ].join('\n');

  const insertStatements = DEFAULT_PROVIDERS
    .filter(p => ['deepseek', 'openai', 'anthropic', 'gemini'].includes(p.name)) // Seed API providers + DeepSeek
    .map(provider => {
      const values = [
        `'${provider.name}'`,
        `'${provider.displayName}'`,
        `'${provider.type}'`,
        provider.enabled ? '1' : '0',
        provider.priority,
        `'${provider.baseUrl}'`,
        provider.loginUrl ? `'${provider.loginUrl}'` : 'NULL',
        provider.chatUrl ? `'${provider.chatUrl}'` : 'NULL',
        provider.apiEndpoint ? `'${provider.apiEndpoint}'` : 'NULL',
        provider.email ? `'${provider.email}'` : 'NULL',
        provider.password ? `'${provider.password}'` : 'NULL',
        'NULL', // apiKey
        'NULL', // sessionCookies
        provider.successRate,
        provider.avgResponseTime,
        'NULL', // lastHealthCheck
        `'${provider.healthStatus}'`,
        provider.rateLimit,
        provider.dailyLimit,
        provider.currentUsage,
        'NULL', // proxyEndpoints
        provider.useProxy ? '1' : '0',
        provider.automationEnabled ? '1' : '0',
        provider.loginInstructions ? `'${provider.loginInstructions.replace(/'/g, "''")}'` : 'NULL',
        provider.chatInstructions ? `'${provider.chatInstructions.replace(/'/g, "''")}'` : 'NULL'
      ];

      return `INSERT INTO providers (
  name, display_name, type, enabled, priority,
  base_url, login_url, chat_url, api_endpoint,
  email, password, api_key, session_cookies,
  success_rate, avg_response_time, last_health_check, health_status,
  rate_limit, daily_limit, current_usage,
  proxy_endpoints, use_proxy, automation_enabled,
  login_instructions, chat_instructions
) VALUES (${values.join(', ')});`;
    });

  return deleteStatements + '\n' + insertStatements.join('\n\n');
}

console.log(generateSeedSQL());
