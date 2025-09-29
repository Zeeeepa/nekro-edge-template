/**
 * FlareProx Worker Template
 * Cloudflare Worker script template for proxy functionality
 */

export const FLAREPROX_WORKER_TEMPLATE = `
/**
 * FlareProx Worker - Dynamic Proxy with IP Rotation
 * Generated automatically by Universal API Gateway
 */

// Configuration
const CONFIG = {
  // Authentication token for security
  AUTH_TOKEN: '{{AUTH_TOKEN}}',
  
  // Allowed origins for CORS
  ALLOWED_ORIGINS: [
    'https://dashboard.pixelium.workers.dev',
    'https://pixelium.uk',
    'http://localhost:8787',
    'http://localhost:5173'
  ],
  
  // Rate limiting
  RATE_LIMIT: 100, // requests per minute
  
  // Proxy settings
  PROXY_TIMEOUT: 30000, // 30 seconds
  MAX_REDIRECTS: 5,
  
  // Headers to preserve
  PRESERVE_HEADERS: [
    'user-agent',
    'accept',
    'accept-language',
    'accept-encoding',
    'content-type',
    'authorization',
    'cookie',
    'referer'
  ],
  
  // Headers to add/modify
  MODIFY_HEADERS: {
    'x-forwarded-for': '{{RANDOM_IP}}',
    'x-real-ip': '{{RANDOM_IP}}',
    'x-proxy-worker': '{{WORKER_NAME}}'
  }
};

// IP address pools for rotation
const IP_POOLS = {
  US: [
    '192.168.1.100', '10.0.0.50', '172.16.0.25',
    '203.0.113.45', '198.51.100.78', '192.0.2.123'
  ],
  EU: [
    '185.199.108.153', '185.199.109.154', '185.199.110.155',
    '151.101.1.140', '151.101.65.140', '151.101.129.140'
  ],
  ASIA: [
    '103.235.46.39', '103.235.46.40', '103.235.46.41',
    '202.61.251.133', '202.61.251.134', '202.61.251.135'
  ]
};

// Rate limiting storage
const rateLimitMap = new Map();

// Utility functions
function getRandomIP(region = 'US') {
  const pool = IP_POOLS[region] || IP_POOLS.US;
  return pool[Math.floor(Math.random() * pool.length)];
}

function isRateLimited(clientIP) {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  if (!rateLimitMap.has(clientIP)) {
    rateLimitMap.set(clientIP, []);
  }
  
  const requests = rateLimitMap.get(clientIP);
  
  // Remove old requests
  const recentRequests = requests.filter(time => time > windowStart);
  rateLimitMap.set(clientIP, recentRequests);
  
  // Check if rate limited
  if (recentRequests.length >= CONFIG.RATE_LIMIT) {
    return true;
  }
  
  // Add current request
  recentRequests.push(now);
  return false;
}

function createCORSHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true'
  };
  
  if (CONFIG.ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  
  return headers;
}

function modifyRequestHeaders(originalHeaders, targetUrl) {
  const headers = new Headers();
  const randomIP = getRandomIP();
  
  // Copy preserved headers
  for (const [key, value] of originalHeaders.entries()) {
    if (CONFIG.PRESERVE_HEADERS.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  }
  
  // Add/modify headers
  for (const [key, value] of Object.entries(CONFIG.MODIFY_HEADERS)) {
    const processedValue = value.replace('{{RANDOM_IP}}', randomIP)
                               .replace('{{WORKER_NAME}}', '{{WORKER_NAME}}');
    headers.set(key, processedValue);
  }
  
  // Set proper host header
  const url = new URL(targetUrl);
  headers.set('host', url.host);
  
  // Add realistic user agent if not present
  if (!headers.has('user-agent')) {
    headers.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  }
  
  return headers;
}

async function handleProxyRequest(request, targetUrl) {
  try {
    // Modify headers for the proxied request
    const modifiedHeaders = modifyRequestHeaders(request.headers, targetUrl);
    
    // Create the proxied request
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: modifiedHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      redirect: 'manual'
    });
    
    // Make the request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.PROXY_TIMEOUT);
    
    const response = await fetch(proxyRequest, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Handle redirects manually to preserve proxy behavior
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        // Return redirect response with modified location if needed
        const redirectResponse = new Response(null, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
        return redirectResponse;
      }
    }
    
    // Create response with CORS headers
    const responseHeaders = new Headers(response.headers);
    const corsHeaders = createCORSHeaders(request.headers.get('origin'));
    
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }
    
    // Add proxy metadata
    responseHeaders.set('x-proxy-worker', '{{WORKER_NAME}}');
    responseHeaders.set('x-proxy-region', '{{REGION}}');
    responseHeaders.set('x-proxy-timestamp', new Date().toISOString());
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
    
  } catch (error) {
    console.error('Proxy request failed:', error);
    
    if (error.name === 'AbortError') {
      return new Response(JSON.stringify({
        error: 'Request timeout',
        message: 'The proxied request timed out'
      }), {
        status: 504,
        headers: {
          'content-type': 'application/json',
          ...createCORSHeaders(request.headers.get('origin'))
        }
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Proxy error',
      message: error.message
    }), {
      status: 502,
      headers: {
        'content-type': 'application/json',
        ...createCORSHeaders(request.headers.get('origin'))
      }
    });
  }
}

// Main request handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const clientIP = request.headers.get('cf-connecting-ip') || 'unknown';
    const origin = request.headers.get('origin');
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: createCORSHeaders(origin)
      });
    }
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        worker: '{{WORKER_NAME}}',
        region: '{{REGION}}',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          ...createCORSHeaders(origin)
        }
      });
    }
    
    // Authentication check
    const authToken = request.headers.get('x-auth-token') || url.searchParams.get('token');
    if (authToken !== CONFIG.AUTH_TOKEN) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Invalid or missing authentication token'
      }), {
        status: 401,
        headers: {
          'content-type': 'application/json',
          ...createCORSHeaders(origin)
        }
      });
    }
    
    // Rate limiting check
    if (isRateLimited(clientIP)) {
      return new Response(JSON.stringify({
        error: 'Rate limited',
        message: 'Too many requests. Please try again later.'
      }), {
        status: 429,
        headers: {
          'content-type': 'application/json',
          'retry-after': '60',
          ...createCORSHeaders(origin)
        }
      });
    }
    
    // Extract target URL from path or query parameter
    let targetUrl = url.searchParams.get('url');
    
    if (!targetUrl) {
      // Try to extract from path (e.g., /proxy/https://example.com/api)
      const pathMatch = url.pathname.match(/^\\/proxy\\/(.+)$/);
      if (pathMatch) {
        targetUrl = decodeURIComponent(pathMatch[1]);
      }
    }
    
    if (!targetUrl) {
      return new Response(JSON.stringify({
        error: 'Bad request',
        message: 'Target URL is required. Use ?url=<target> or /proxy/<target>'
      }), {
        status: 400,
        headers: {
          'content-type': 'application/json',
          ...createCORSHeaders(origin)
        }
      });
    }
    
    // Validate target URL
    try {
      new URL(targetUrl);
    } catch {
      return new Response(JSON.stringify({
        error: 'Invalid URL',
        message: 'The provided target URL is not valid'
      }), {
        status: 400,
        headers: {
          'content-type': 'application/json',
          ...createCORSHeaders(origin)
        }
      });
    }
    
    // Handle the proxy request
    return await handleProxyRequest(request, targetUrl);
  }
};
`;

/**
 * Generate a FlareProx worker script with specific configuration
 */
export function generateFlareProxWorker(config: {
  workerName: string;
  authToken: string;
  region?: string;
  rateLimit?: number;
  timeout?: number;
}) {
  return FLAREPROX_WORKER_TEMPLATE
    .replace(/{{WORKER_NAME}}/g, config.workerName)
    .replace(/{{AUTH_TOKEN}}/g, config.authToken)
    .replace(/{{REGION}}/g, config.region || 'US')
    .replace(/{{RATE_LIMIT}}/g, (config.rateLimit || 100).toString())
    .replace(/{{PROXY_TIMEOUT}}/g, (config.timeout || 30000).toString());
}

/**
 * Default FlareProx worker configurations
 */
export const DEFAULT_FLAREPROX_WORKERS = [
  {
    name: 'flareprox-us-east',
    region: 'US-EAST',
    rateLimit: 150,
    timeout: 30000
  },
  {
    name: 'flareprox-us-west',
    region: 'US-WEST',
    rateLimit: 150,
    timeout: 30000
  },
  {
    name: 'flareprox-eu-central',
    region: 'EU-CENTRAL',
    rateLimit: 120,
    timeout: 35000
  },
  {
    name: 'flareprox-asia-pacific',
    region: 'ASIA-PACIFIC',
    rateLimit: 100,
    timeout: 40000
  },
  {
    name: 'flareprox-backup',
    region: 'GLOBAL',
    rateLimit: 80,
    timeout: 45000
  }
];

/**
 * FlareProx deployment configuration
 */
export interface FlareProxDeploymentConfig {
  accountId: string;
  apiToken: string;
  domain: string;
  workers: Array<{
    name: string;
    region: string;
    rateLimit: number;
    timeout: number;
    routes?: string[];
  }>;
}

/**
 * Generate deployment configuration for FlareProx workers
 */
export function generateDeploymentConfig(baseConfig: {
  accountId: string;
  apiToken: string;
  domain: string;
  authToken: string;
}): FlareProxDeploymentConfig {
  return {
    accountId: baseConfig.accountId,
    apiToken: baseConfig.apiToken,
    domain: baseConfig.domain,
    workers: DEFAULT_FLAREPROX_WORKERS.map(worker => ({
      ...worker,
      routes: [
        \`\${worker.name}.\${baseConfig.domain}/*\`,
        \`\${baseConfig.domain}/\${worker.name}/*\`
      ]
    }))
  };
}
