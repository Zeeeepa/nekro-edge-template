/**
 * FlareProx Integration Manager
 * Based on the FlareProx Python implementation for Cloudflare Workers
 */

import type { ProxyEndpoint } from "../types/gateway";

export class FlareProxManager {
  private endpoints: ProxyEndpoint[] = [];
  private currentIndex = 0;

  constructor(private env: any) {}

  /**
   * Initialize proxy endpoints based on FlareProx pattern
   */
  async initializeProxies(count: number = 5): Promise<void> {
    console.log(`Initializing ${count} FlareProx endpoints...`);
    
    for (let i = 0; i < count; i++) {
      try {
        const endpoint = await this.createFlareProxEndpoint(i);
        this.endpoints.push(endpoint);
        console.log(`Created proxy endpoint: ${endpoint.name}`);
      } catch (error) {
        console.error(`Failed to create proxy endpoint ${i}:`, error);
      }
    }
    
    console.log(`Initialized ${this.endpoints.length} proxy endpoints`);
  }

  /**
   * Create a FlareProx endpoint (simulated - would deploy actual Cloudflare Worker)
   */
  private async createFlareProxEndpoint(index: number): Promise<ProxyEndpoint> {
    const name = `flareprox-${index}`;
    const workerId = `flareprox-worker-${index}`;
    
    // In a real implementation, this would deploy a Cloudflare Worker
    // For now, we'll create a mock endpoint structure
    const workerUrl = `https://${workerId}.${this.env.CLOUDFLARE_ACCOUNT_ID}.workers.dev`;
    
    return {
      id: index + 1,
      name,
      url: workerUrl,
      isActive: true,
      responseTime: 0,
      successRate: 1.0,
      totalRequests: 0,
      successfulRequests: 0,
      workerId,
      workerUrl
    };
  }

  /**
   * Get a random proxy endpoint for load distribution
   */
  getRandomEndpoint(): ProxyEndpoint | null {
    const activeEndpoints = this.endpoints.filter(ep => ep.isActive);
    if (activeEndpoints.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * activeEndpoints.length);
    return activeEndpoints[randomIndex];
  }

  /**
   * Get next proxy endpoint using round-robin
   */
  getNextEndpoint(): ProxyEndpoint | null {
    const activeEndpoints = this.endpoints.filter(ep => ep.isActive);
    if (activeEndpoints.length === 0) {
      return null;
    }
    
    const endpoint = activeEndpoints[this.currentIndex % activeEndpoints.length];
    this.currentIndex++;
    return endpoint;
  }

  /**
   * Make a proxied request through FlareProx
   * Based on the original FlareProx Python implementation
   */
  async proxyRequest(
    targetUrl: string, 
    options: RequestInit = {},
    useRandomIP: boolean = true
  ): Promise<Response> {
    const endpoint = this.getRandomEndpoint();
    if (!endpoint) {
      throw new Error("No active proxy endpoints available");
    }

    // Generate random IP for X-Forwarded-For header (FlareProx feature)
    const randomIP = useRandomIP ? this.generateRandomIP() : undefined;
    
    // Construct proxy request
    const proxyUrl = `${endpoint.url}?url=${encodeURIComponent(targetUrl)}`;
    
    const proxyHeaders: Record<string, string> = {
      ...options.headers as Record<string, string>,
      'User-Agent': this.getRandomUserAgent(),
    };
    
    if (randomIP) {
      proxyHeaders['X-My-X-Forwarded-For'] = randomIP;
    }

    const startTime = Date.now();
    
    try {
      const response = await fetch(proxyUrl, {
        ...options,
        headers: proxyHeaders
      });
      
      const responseTime = Date.now() - startTime;
      await this.updateEndpointStats(endpoint, true, responseTime);
      
      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.updateEndpointStats(endpoint, false, responseTime);
      throw error;
    }
  }

  /**
   * Generate random IP address for X-Forwarded-For header
   * Based on FlareProx IP generation logic
   */
  private generateRandomIP(): string {
    // Generate random IP in common ranges (avoiding private/reserved ranges)
    const ranges = [
      [1, 126],    // Class A (avoiding 10.x.x.x and 127.x.x.x)
      [128, 191],  // Class B (avoiding 172.16-31.x.x)
      [192, 223]   // Class C (avoiding 192.168.x.x)
    ];
    
    const range = ranges[Math.floor(Math.random() * ranges.length)];
    const firstOctet = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    
    // Avoid private ranges
    if (firstOctet === 10 || firstOctet === 127) {
      return this.generateRandomIP(); // Retry
    }
    if (firstOctet === 172) {
      const secondOctet = Math.floor(Math.random() * 256);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return this.generateRandomIP(); // Retry
      }
    }
    if (firstOctet === 192) {
      const secondOctet = Math.floor(Math.random() * 256);
      if (secondOctet === 168) {
        return this.generateRandomIP(); // Retry
      }
    }
    
    const secondOctet = Math.floor(Math.random() * 256);
    const thirdOctet = Math.floor(Math.random() * 256);
    const fourthOctet = Math.floor(Math.random() * 254) + 1; // Avoid .0 and .255
    
    return `${firstOctet}.${secondOctet}.${thirdOctet}.${fourthOctet}`;
  }

  /**
   * Get random User-Agent string
   */
  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
    ];
    
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Update endpoint statistics
   */
  private async updateEndpointStats(
    endpoint: ProxyEndpoint, 
    success: boolean, 
    responseTime: number
  ): Promise<void> {
    endpoint.totalRequests++;
    endpoint.responseTime = responseTime;
    endpoint.lastChecked = Date.now();
    
    if (success) {
      endpoint.successfulRequests++;
    }
    
    endpoint.successRate = endpoint.successfulRequests / endpoint.totalRequests;
    
    // Update in database if available
    // This would be implemented with actual database operations
    console.log(`Updated stats for ${endpoint.name}: ${endpoint.successRate * 100}% success rate`);
  }

  /**
   * Health check all proxy endpoints
   */
  async healthCheckEndpoints(): Promise<void> {
    console.log("Running health check on all proxy endpoints...");
    
    const healthCheckPromises = this.endpoints.map(async (endpoint) => {
      try {
        const startTime = Date.now();
        const response = await fetch(`${endpoint.url}/health`, {
          method: 'GET',
          headers: {
            'User-Agent': this.getRandomUserAgent()
          }
        });
        
        const responseTime = Date.now() - startTime;
        const isHealthy = response.ok;
        
        endpoint.isActive = isHealthy;
        endpoint.responseTime = responseTime;
        endpoint.lastChecked = Date.now();
        
        console.log(`Health check ${endpoint.name}: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'} (${responseTime}ms)`);
      } catch (error) {
        endpoint.isActive = false;
        endpoint.lastChecked = Date.now();
        console.error(`Health check failed for ${endpoint.name}:`, error);
      }
    });
    
    await Promise.all(healthCheckPromises);
  }

  /**
   * Get proxy endpoint statistics
   */
  getEndpointStats(): ProxyEndpoint[] {
    return this.endpoints.map(endpoint => ({ ...endpoint }));
  }

  /**
   * Deploy a new FlareProx worker (placeholder for actual implementation)
   */
  async deployFlareProxWorker(name: string): Promise<string> {
    // This would contain the actual Cloudflare Worker deployment logic
    // For now, return a mock worker URL
    const workerId = `flareprox-${name}-${Date.now()}`;
    const workerUrl = `https://${workerId}.${this.env.CLOUDFLARE_ACCOUNT_ID}.workers.dev`;
    
    console.log(`Deployed FlareProx worker: ${workerUrl}`);
    return workerUrl;
  }

  /**
   * Create FlareProx worker script content
   * Based on the original FlareProx Python logic
   */
  private getFlareProxWorkerScript(): string {
    return `
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    
    if (!targetUrl) {
      return new Response('Missing url parameter', { status: 400 });
    }
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }
    
    try {
      // Forward the request to the target URL
      const targetRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      
      // Add/modify headers for IP masking
      const forwardedFor = request.headers.get('X-My-X-Forwarded-For');
      if (forwardedFor) {
        targetRequest.headers.set('X-Forwarded-For', forwardedFor);
        targetRequest.headers.set('X-Real-IP', forwardedFor);
      }
      
      const response = await fetch(targetRequest);
      
      // Return the response with CORS headers
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers),
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*'
        }
      });
      
      return newResponse;
    } catch (error) {
      return new Response(\`Proxy error: \${error.message}\`, { status: 500 });
    }
  }
};
    `.trim();
  }
}
