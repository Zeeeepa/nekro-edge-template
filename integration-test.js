/**
 * Integration Test Suite for Universal Gateway
 * Tests actual provider API calls with real credentials
 */

const baseUrl = 'http://localhost:8787';

// Test configuration - add real API keys here for actual testing
const testConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'sk-test-key',
    model: 'gpt-3.5-turbo',
    enabled: !!process.env.OPENAI_API_KEY
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || 'sk-ant-test-key',
    model: 'claude-3-haiku-20240307',
    enabled: !!process.env.ANTHROPIC_API_KEY
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || 'test-key',
    model: 'gemini-pro',
    enabled: !!process.env.GEMINI_API_KEY
  }
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log(`\n${colors.bright}${colors.blue}🧪 ${testName}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

async function testHealthEndpoint() {
  logTest('Test 1: Health Endpoint');
  
  try {
    const response = await fetch(`${baseUrl}/v1/health`);
    const data = await response.json();
    
    if (response.ok) {
      logSuccess('Health endpoint responded');
      logInfo(`Status: ${data.status}`);
      logInfo(`Total providers: ${data.providers.total}`);
      logInfo(`Healthy: ${data.providers.healthy}`);
      return true;
    } else {
      logError(`Health check failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Health check error: ${error.message}`);
    return false;
  }
}

async function testProvidersEndpoint() {
  logTest('Test 2: List Providers Endpoint');
  
  try {
    const response = await fetch(`${baseUrl}/v1/gateway/providers`);
    
    if (!response.ok) {
      logWarning(`Providers endpoint returned ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    
    if (Array.isArray(data)) {
      logSuccess(`Found ${data.length} providers`);
      data.forEach((provider, i) => {
        logInfo(`  ${i + 1}. ${provider.display_name || provider.displayName} (${provider.name}) - Priority: ${provider.priority}`);
      });
      return true;
    } else {
      logWarning('Providers endpoint returned unexpected format');
      logInfo(JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    logError(`Providers endpoint error: ${error.message}`);
    return false;
  }
}

async function testGatewayEndpoint(provider, testPrompt = "Say hello in one word") {
  logTest(`Test 3: Gateway Endpoint - ${provider.toUpperCase()}`);
  
  const config = testConfig[provider];
  
  if (!config.enabled) {
    logWarning(`Skipping ${provider} - No API key provided`);
    logInfo(`Set ${provider.toUpperCase()}_API_KEY environment variable to enable`);
    return false;
  }
  
  try {
    const requestBody = {
      provider: provider,
      model: config.model,
      messages: [
        {
          role: 'user',
          content: testPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 50
    };
    
    logInfo(`Sending request to ${provider}...`);
    
    const response = await fetch(`${baseUrl}/v1/gateway/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      logSuccess(`${provider} API call successful`);
      
      if (data.choices && data.choices[0]) {
        const content = data.choices[0].message?.content || data.choices[0].text;
        logInfo(`Response: ${content?.substring(0, 100)}${content?.length > 100 ? '...' : ''}`);
      }
      
      if (data.usage) {
        logInfo(`Tokens used: ${data.usage.total_tokens || 'N/A'}`);
      }
      
      return true;
    } else {
      logError(`${provider} API call failed: ${response.status}`);
      logInfo(`Error: ${JSON.stringify(data, null, 2)}`);
      return false;
    }
  } catch (error) {
    logError(`${provider} test error: ${error.message}`);
    return false;
  }
}

async function testStreamingEndpoint(provider) {
  logTest(`Test 4: Streaming Endpoint - ${provider.toUpperCase()}`);
  
  const config = testConfig[provider];
  
  if (!config.enabled) {
    logWarning(`Skipping ${provider} streaming - No API key provided`);
    return false;
  }
  
  try {
    const requestBody = {
      provider: provider,
      model: config.model,
      messages: [
        {
          role: 'user',
          content: 'Count from 1 to 3'
        }
      ],
      stream: true,
      max_tokens: 30
    };
    
    logInfo(`Testing streaming response from ${provider}...`);
    
    const response = await fetch(`${baseUrl}/v1/gateway/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      logError(`Streaming request failed: ${response.status}`);
      return false;
    }
    
    let chunks = 0;
    let content = '';
    
    // Read the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value);
      chunks++;
      
      // Parse SSE format if needed
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.slice(6));
            if (json.choices && json.choices[0]?.delta?.content) {
              content += json.choices[0].delta.content;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    }
    
    if (chunks > 0) {
      logSuccess(`Received ${chunks} chunks from ${provider}`);
      if (content) {
        logInfo(`Streamed content: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
      }
      return true;
    } else {
      logWarning(`No streaming chunks received from ${provider}`);
      return false;
    }
  } catch (error) {
    logError(`Streaming test error: ${error.message}`);
    return false;
  }
}

async function testLoadBalancing() {
  logTest('Test 5: Load Balancing');
  
  // Check if multiple providers have API keys
  const enabledProviders = Object.keys(testConfig).filter(p => testConfig[p].enabled);
  
  if (enabledProviders.length < 2) {
    logWarning('Load balancing test requires at least 2 providers with API keys');
    logInfo(`Currently enabled: ${enabledProviders.join(', ') || 'none'}`);
    return false;
  }
  
  try {
    // Test without specifying provider (should use load balancing)
    const requestBody = {
      model: 'gpt-3.5-turbo', // Generic model
      messages: [
        {
          role: 'user',
          content: 'Hi'
        }
      ],
      max_tokens: 10
    };
    
    logInfo('Testing automatic provider selection...');
    
    const response = await fetch(`${baseUrl}/v1/gateway/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testConfig.openai.apiKey}` // Use any key for auth
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      logSuccess('Load balancing request successful');
      logInfo(`Selected provider: ${data.provider || 'unknown'}`);
      return true;
    } else {
      logWarning('Load balancing request failed');
      return false;
    }
  } catch (error) {
    logError(`Load balancing test error: ${error.message}`);
    return false;
  }
}

async function testErrorHandling() {
  logTest('Test 6: Error Handling');
  
  try {
    // Test with invalid API key
    const response = await fetch(`${baseUrl}/v1/gateway/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-key-12345'
      },
      body: JSON.stringify({
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }]
      })
    });
    
    const data = await response.json();
    
    if (!response.ok && data.error) {
      logSuccess('Error handling working correctly');
      logInfo(`Error type: ${data.error.type || 'unknown'}`);
      logInfo(`Error message: ${data.error.message?.substring(0, 80) || 'N/A'}`);
      return true;
    } else {
      logWarning('Expected error response, got success');
      return false;
    }
  } catch (error) {
    logError(`Error handling test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'bright');
  log('🚀 Universal Gateway Integration Test Suite', 'bright');
  log('='.repeat(60) + '\n', 'bright');
  
  logInfo(`Testing against: ${baseUrl}`);
  logInfo(`Enabled providers: ${Object.keys(testConfig).filter(p => testConfig[p].enabled).join(', ') || 'none'}\n`);
  
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  };
  
  // Test 1: Health
  const healthResult = await testHealthEndpoint();
  healthResult ? results.passed++ : results.failed++;
  
  // Test 2: Providers
  const providersResult = await testProvidersEndpoint();
  providersResult ? results.passed++ : results.failed++;
  
  // Test 3: Individual provider tests
  for (const provider of ['openai', 'anthropic', 'gemini']) {
    if (testConfig[provider].enabled) {
      const result = await testGatewayEndpoint(provider);
      result ? results.passed++ : results.failed++;
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      results.skipped++;
    }
  }
  
  // Test 4: Streaming (if any provider enabled)
  const streamProvider = Object.keys(testConfig).find(p => testConfig[p].enabled);
  if (streamProvider) {
    const streamResult = await testStreamingEndpoint(streamProvider);
    streamResult ? results.passed++ : results.failed++;
  } else {
    results.skipped++;
  }
  
  // Test 5: Load Balancing
  const lbResult = await testLoadBalancing();
  if (lbResult === false && Object.keys(testConfig).filter(p => testConfig[p].enabled).length < 2) {
    results.skipped++;
  } else {
    lbResult ? results.passed++ : results.failed++;
  }
  
  // Test 6: Error Handling
  const errorResult = await testErrorHandling();
  errorResult ? results.passed++ : results.failed++;
  
  // Summary
  log('\n' + '='.repeat(60), 'bright');
  log('📊 Test Summary', 'bright');
  log('='.repeat(60), 'bright');
  logSuccess(`Passed: ${results.passed}`);
  if (results.failed > 0) logError(`Failed: ${results.failed}`);
  if (results.skipped > 0) logWarning(`Skipped: ${results.skipped}`);
  log('='.repeat(60) + '\n', 'bright');
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

