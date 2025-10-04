/**
 * Chat Completion Endpoint Integration Test
 * Tests the /v1/chat/completions endpoint with simulated mode
 */

const baseUrl = 'http://localhost:8787';

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

async function testHealthCheck() {
  logTest('Test 1: Health Check');
  
  try {
    const response = await fetch(`${baseUrl}/health`);
    
    if (response.ok) {
      logSuccess('Health endpoint is accessible');
      return true;
    } else {
      logError(`Health check failed with status ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Health check error: ${error.message}`);
    return false;
  }
}

async function testChatCompletionBasic() {
  logTest('Test 2: Basic Chat Completion (Simulated)');
  
  try {
    const requestBody = {
      model: 'deepseek',
      messages: [
        {
          role: 'user',
          content: 'Hello world!'
        }
      ]
    };
    
    logInfo('Sending POST /v1/chat/completions...');
    
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      logError(`Request failed with status ${response.status}`);
      const text = await response.text();
      logInfo(`Response: ${text.substring(0, 200)}`);
      return false;
    }
    
    const data = await response.json();
    
    // Validate OpenAI response format
    const validations = [
      { check: !!data.id, message: 'Has request ID' },
      { check: data.object === 'chat.completion', message: 'Object type is correct' },
      { check: !!data.created, message: 'Has timestamp' },
      { check: !!data.model, message: 'Has model field' },
      { check: Array.isArray(data.choices), message: 'Has choices array' },
      { check: data.choices.length > 0, message: 'Has at least one choice' },
      { check: !!data.choices[0]?.message, message: 'Choice has message' },
      { check: data.choices[0]?.message?.role === 'assistant', message: 'Message role is assistant' },
      { check: !!data.choices[0]?.message?.content, message: 'Has content' },
      { check: data.choices[0]?.finish_reason === 'stop', message: 'Has finish_reason' },
      { check: !!data.usage, message: 'Has usage stats' },
      { check: typeof data.usage.prompt_tokens === 'number', message: 'Usage has prompt_tokens' },
      { check: typeof data.usage.completion_tokens === 'number', message: 'Usage has completion_tokens' },
      { check: typeof data.usage.total_tokens === 'number', message: 'Usage has total_tokens' }
    ];
    
    let allValid = true;
    validations.forEach(({ check, message }) => {
      if (check) {
        logSuccess(message);
      } else {
        logError(`Validation failed: ${message}`);
        allValid = false;
      }
    });
    
    if (allValid) {
      logInfo(`Response content: "${data.choices[0].message.content.substring(0, 100)}"`);
      logSuccess('All OpenAI format validations passed');
      return true;
    } else {
      logError('Some validations failed');
      logInfo('Full response: ' + JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    logError(`Test error: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function testChatCompletionWithOptions() {
  logTest('Test 3: Chat Completion with Options');
  
  try {
    const requestBody = {
      model: 'deepseek',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: 'What is 2+2?'
        }
      ],
      temperature: 0.7,
      max_tokens: 100,
      top_p: 0.9
    };
    
    logInfo('Sending request with options...');
    
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      logError(`Request failed with status ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    
    if (data.choices && data.choices[0]?.message?.content) {
      logSuccess('Request with options succeeded');
      logInfo(`Response: "${data.choices[0].message.content.substring(0, 100)}"`);
      return true;
    } else {
      logError('Invalid response format');
      return false;
    }
  } catch (error) {
    logError(`Test error: ${error.message}`);
    return false;
  }
}

async function testMultipleRequests() {
  logTest('Test 4: Multiple Sequential Requests (Server Stability)');
  
  try {
    logInfo('Sending 5 sequential requests...');
    
    const results = [];
    for (let i = 1; i <= 5; i++) {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key'
        },
        body: JSON.stringify({
          model: 'deepseek',
          messages: [{ role: 'user', content: `Test message ${i}` }]
        })
      });
      
      results.push(response.ok);
      
      if (response.ok) {
        logSuccess(`Request ${i}/5 succeeded`);
      } else {
        logError(`Request ${i}/5 failed with ${response.status}`);
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const successCount = results.filter(r => r).length;
    
    if (successCount === 5) {
      logSuccess('All 5 requests succeeded - server is stable');
      return true;
    } else {
      logError(`Only ${successCount}/5 requests succeeded`);
      return false;
    }
  } catch (error) {
    logError(`Test error: ${error.message}`);
    return false;
  }
}

async function testErrorHandling() {
  logTest('Test 5: Error Handling');
  
  try {
    // Test with missing required fields
    logInfo('Testing with invalid request (missing messages)...');
    
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key'
      },
      body: JSON.stringify({
        model: 'deepseek'
        // Missing messages field
      })
    });
    
    if (!response.ok) {
      const data = await response.json();
      if (data.error) {
        logSuccess('Error handling works correctly');
        logInfo(`Error returned: ${JSON.stringify(data.error)}`);
        return true;
      } else {
        logError('Error response missing error field');
        return false;
      }
    } else {
      logError('Expected error response, got success');
      return false;
    }
  } catch (error) {
    logError(`Test error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'bright');
  log('🚀 Chat Completion Endpoint Test Suite', 'bright');
  log('='.repeat(60) + '\n', 'bright');
  
  logInfo(`Testing against: ${baseUrl}\n`);
  
  const results = {
    passed: 0,
    failed: 0
  };
  
  // Run tests
  const tests = [
    testHealthCheck,
    testChatCompletionBasic,
    testChatCompletionWithOptions,
    testMultipleRequests,
    testErrorHandling
  ];
  
  for (const test of tests) {
    const result = await test();
    result ? results.passed++ : results.failed++;
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  log('\n' + '='.repeat(60), 'bright');
  log('📊 Test Summary', 'bright');
  log('='.repeat(60), 'bright');
  logSuccess(`Passed: ${results.passed}/${tests.length}`);
  if (results.failed > 0) {
    logError(`Failed: ${results.failed}/${tests.length}`);
  }
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

