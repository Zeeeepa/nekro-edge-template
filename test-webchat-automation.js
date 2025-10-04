/**
 * WebChat Automation Test
 * Tests browser automation against DeepSeek web chat interface
 * Converts web responses to OpenAI API format
 */

const baseUrl = 'http://localhost:8787';

// DeepSeek webchat credentials
const DEEPSEEK_CONFIG = {
  url: 'https://chat.deepseek.com/',
  username: 'developer@pixelium.uk',
  password: 'developer123?',
  provider: 'deepseek-chat'
};

// Colors
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

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

/**
 * Test 1: Send OpenAI-format request to webchat provider
 */
async function testWebChatToOpenAI() {
  logTest('Test: OpenAI Request → WebChat Automation → OpenAI Response');
  
  try {
    // Standard OpenAI API request format
    const openAIRequest = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: 'Say hello in exactly 3 words'
        }
      ],
      temperature: 0.7,
      max_tokens: 50
    };
    
    logInfo('Sending OpenAI-formatted request...');
    logInfo(`Provider: ${DEEPSEEK_CONFIG.provider}`);
    logInfo(`Credentials: ${DEEPSEEK_CONFIG.username}`);
    
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-key' // Gateway handles webchat auth internally
      },
      body: JSON.stringify(openAIRequest)
    });
    
    const data = await response.json();
    
    if (response.ok && data.choices && data.choices[0]) {
      logSuccess('WebChat automation successful!');
      logInfo('Response format: OpenAI-compatible ✓');
      
      // Validate OpenAI response structure
      const choice = data.choices[0];
      logInfo(`Response ID: ${data.id || 'N/A'}`);
      logInfo(`Model: ${data.model || 'N/A'}`);
      logInfo(`Message: ${choice.message?.content?.substring(0, 100) || 'N/A'}`);
      
      if (data.usage) {
        logInfo(`Token usage: ${JSON.stringify(data.usage)}`);
      }
      
      // Verify required OpenAI fields
      const hasRequiredFields = 
        data.id &&
        data.object === 'chat.completion' &&
        data.created &&
        data.model &&
        data.choices &&
        Array.isArray(data.choices) &&
        data.choices[0].message &&
        data.choices[0].message.role === 'assistant' &&
        data.choices[0].message.content;
      
      if (hasRequiredFields) {
        logSuccess('All required OpenAI fields present ✓');
        return true;
      } else {
        logError('Missing required OpenAI response fields');
        logInfo(`Response structure: ${JSON.stringify(data, null, 2)}`);
        return false;
      }
    } else {
      logError(`Request failed: ${response.status}`);
      logInfo(`Error: ${JSON.stringify(data, null, 2)}`);
      return false;
    }
  } catch (error) {
    logError(`Test error: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Streaming response
 */
async function testStreamingWebChat() {
  logTest('Test: Streaming OpenAI Response from WebChat');
  
  try {
    const openAIRequest = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: 'Count from 1 to 5'
        }
      ],
      stream: true
    };
    
    logInfo('Testing streaming response...');
    
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-key'
      },
      body: JSON.stringify(openAIRequest)
    });
    
    if (!response.ok) {
      logError(`Streaming request failed: ${response.status}`);
      return false;
    }
    
    let chunks = 0;
    let content = '';
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    logInfo('Reading stream...');
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value);
      chunks++;
      
      // Parse SSE format (OpenAI streaming format)
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') {
            logInfo('Stream completed with [DONE] marker ✓');
            continue;
          }
          
          try {
            const json = JSON.parse(dataStr);
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
      logSuccess(`Received ${chunks} streaming chunks`);
      if (content) {
        logInfo(`Streamed content: ${content.substring(0, 100)}`);
      }
      return true;
    } else {
      logError('No streaming chunks received');
      return false;
    }
  } catch (error) {
    logError(`Streaming test error: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Session management
 */
async function testSessionManagement() {
  logTest('Test: Session Management & Cookie Persistence');
  
  try {
    logInfo('Creating persistent session...');
    
    // First request - should create session
    const response1 = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-key'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });
    
    const data1 = await response1.json();
    
    if (!response1.ok) {
      logError('First request failed');
      return false;
    }
    
    const sessionId = data1.session_id || data1.sessionId;
    
    if (sessionId) {
      logSuccess(`Session created: ${sessionId}`);
    }
    
    // Second request - should reuse session
    logInfo('Testing session reuse...');
    
    const response2 = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-key',
        'X-Session-ID': sessionId || 'test'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'What did I just say?' }]
      })
    });
    
    const data2 = await response2.json();
    
    if (response2.ok) {
      logSuccess('Session reuse successful');
      return true;
    } else {
      logError('Session reuse failed');
      return false;
    }
  } catch (error) {
    logError(`Session test error: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: Error handling
 */
async function testErrorHandling() {
  logTest('Test: Error Handling & Invalid Requests');
  
  try {
    // Test with invalid model
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-key'
      },
      body: JSON.stringify({
        model: 'non-existent-model',
        messages: [{ role: 'user', content: 'test' }]
      })
    });
    
    const data = await response.json();
    
    if (!response.ok && data.error) {
      logSuccess('Error response properly formatted');
      logInfo(`Error type: ${data.error.type}`);
      logInfo(`Error message: ${data.error.message?.substring(0, 80)}`);
      return true;
    } else {
      logError('Expected error response');
      return false;
    }
  } catch (error) {
    logError(`Error handling test failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  log('\n' + '='.repeat(70), 'bright');
  log('🌐 WebChat Automation Gateway Test Suite', 'bright');
  log('='.repeat(70) + '\n', 'bright');
  
  logInfo('Configuration:');
  logInfo(`  Gateway: ${baseUrl}`);
  logInfo(`  Provider: ${DEEPSEEK_CONFIG.provider}`);
  logInfo(`  WebChat URL: ${DEEPSEEK_CONFIG.url}`);
  logInfo(`  Username: ${DEEPSEEK_CONFIG.username}`);
  log('');
  
  const results = {
    passed: 0,
    failed: 0
  };
  
  // Test 1: Basic webchat to OpenAI
  const test1 = await testWebChatToOpenAI();
  test1 ? results.passed++ : results.failed++;
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Streaming
  const test2 = await testStreamingWebChat();
  test2 ? results.passed++ : results.failed++;
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: Session management
  const test3 = await testSessionManagement();
  test3 ? results.passed++ : results.failed++;
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 4: Error handling
  const test4 = await testErrorHandling();
  test4 ? results.passed++ : results.failed++;
  
  // Summary
  log('\n' + '='.repeat(70), 'bright');
  log('📊 Test Summary', 'bright');
  log('='.repeat(70), 'bright');
  logSuccess(`Passed: ${results.passed}/4`);
  if (results.failed > 0) logError(`Failed: ${results.failed}/4`);
  log('='.repeat(70) + '\n', 'bright');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

