/**
 * FlareProx Worker Deployment System
 * Automated deployment and management of Cloudflare Workers for proxy functionality
 */

import { generateFlareProxWorker, DEFAULT_FLAREPROX_WORKERS } from './worker-template';
import type { FlareProxDeploymentConfig } from './worker-template';
import type { Bindings } from '../../types';

/**
 * Cloudflare API client for worker deployment
 */
export class CloudflareWorkerDeployer {
  private accountId: string;
  private apiToken: string;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(accountId: string, apiToken: string) {
    this.accountId = accountId;
    this.apiToken = apiToken;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudflare API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Deploy a single FlareProx worker
   */
  async deployWorker(config: {
    name: string;
    script: string;
    bindings?: Record<string, any>;
    routes?: string[];
  }) {
    try {
      // Create or update the worker script
      const scriptResponse = await this.makeRequest(
        `/accounts/${this.accountId}/workers/scripts/${config.name}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/javascript',
          },
          body: config.script,
        }
      ) as any;

      console.log(`Worker ${config.name} deployed successfully:`, scriptResponse);

      // Set up routes if provided
      if (config.routes && config.routes.length > 0) {
        for (const route of config.routes) {
          await this.createRoute(config.name, route);
        }
      }

      return {
        success: true,
        workerName: config.name,
        scriptId: scriptResponse.result?.id,
        routes: config.routes || [],
      };
    } catch (error) {
      console.error(`Failed to deploy worker ${config.name}:`, error);
      return {
        success: false,
        workerName: config.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a route for a worker
   */
  async createRoute(workerName: string, pattern: string) {
    try {
      const response = await this.makeRequest(
        `/accounts/${this.accountId}/workers/routes`,
        {
          method: 'POST',
          body: JSON.stringify({
            pattern,
            script: workerName,
          }),
        }
      );

      console.log(`Route created for ${workerName}: ${pattern}`);
      return response;
    } catch (error) {
      console.error(`Failed to create route for ${workerName}:`, error);
      throw error;
    }
  }

  /**
   * List all deployed workers
   */
  async listWorkers() {
    try {
      const response = await this.makeRequest(
        `/accounts/${this.accountId}/workers/scripts`
      ) as any;
      return response.result || [];
    } catch (error) {
      console.error('Failed to list workers:', error);
      return [];
    }
  }

  /**
   * Delete a worker
   */
  async deleteWorker(workerName: string) {
    try {
      await this.makeRequest(
        `/accounts/${this.accountId}/workers/scripts/${workerName}`,
        { method: 'DELETE' }
      );
      console.log(`Worker ${workerName} deleted successfully`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete worker ${workerName}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get worker logs
   */
  async getWorkerLogs(workerName: string, limit = 100) {
    try {
      const response = await this.makeRequest(
        `/accounts/${this.accountId}/workers/scripts/${workerName}/logs?limit=${limit}`
      ) as any;
      return response.result || [];
    } catch (error) {
      console.error(`Failed to get logs for worker ${workerName}:`, error);
      return [];
    }
  }
}

/**
 * FlareProx deployment manager
 */
export class FlareProxDeploymentManager {
  private deployer: CloudflareWorkerDeployer;
  private authToken: string;
  private domain: string;

  constructor(config: {
    accountId: string;
    apiToken: string;
    authToken: string;
    domain: string;
  }) {
    this.deployer = new CloudflareWorkerDeployer(config.accountId, config.apiToken);
    this.authToken = config.authToken;
    this.domain = config.domain;
  }

  /**
   * Deploy all default FlareProx workers
   */
  async deployAllWorkers() {
    const results = [];

    for (const workerConfig of DEFAULT_FLAREPROX_WORKERS) {
      const script = generateFlareProxWorker({
        workerName: workerConfig.name,
        authToken: this.authToken,
        region: workerConfig.region,
        rateLimit: workerConfig.rateLimit,
        timeout: workerConfig.timeout,
      });

      const routes = [
        `${workerConfig.name}.${this.domain}/*`,
        `${this.domain}/${workerConfig.name}/*`,
      ];

      const result = await this.deployer.deployWorker({
        name: workerConfig.name,
        script,
        routes,
      });

      results.push({
        ...result,
        config: workerConfig,
      });

      // Add delay between deployments to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Deploy a single FlareProx worker
   */
  async deploySingleWorker(config: {
    name: string;
    region: string;
    rateLimit?: number;
    timeout?: number;
  }) {
    const script = generateFlareProxWorker({
      workerName: config.name,
      authToken: this.authToken,
      region: config.region,
      rateLimit: config.rateLimit || 100,
      timeout: config.timeout || 30000,
    });

    const routes = [
      `${config.name}.${this.domain}/*`,
      `${this.domain}/${config.name}/*`,
    ];

    return await this.deployer.deployWorker({
      name: config.name,
      script,
      routes,
    });
  }

  /**
   * Health check all deployed workers
   */
  async healthCheckAllWorkers() {
    const workers = await this.deployer.listWorkers();
    const healthResults = [];

    for (const worker of workers) {
      if (worker.id.startsWith('flareprox-')) {
        const healthResult = await this.healthCheckWorker(worker.id);
        healthResults.push({
          workerName: worker.id,
          ...healthResult,
        });
      }
    }

    return healthResults;
  }

  /**
   * Health check a single worker
   */
  async healthCheckWorker(workerName: string) {
    try {
      const healthUrl = `https://${workerName}.${this.domain}/health`;
      const startTime = Date.now();
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'x-auth-token': this.authToken,
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok;
      
      let healthData = null;
      try {
        healthData = await response.json();
      } catch {
        // Ignore JSON parsing errors
      }

      return {
        healthy: isHealthy,
        responseTime,
        status: response.status,
        data: healthData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: -1,
        status: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Update worker configuration
   */
  async updateWorkerConfig(workerName: string, config: {
    region?: string;
    rateLimit?: number;
    timeout?: number;
  }) {
    const script = generateFlareProxWorker({
      workerName,
      authToken: this.authToken,
      region: config.region || 'US',
      rateLimit: config.rateLimit || 100,
      timeout: config.timeout || 30000,
    });

    return await this.deployer.deployWorker({
      name: workerName,
      script,
    });
  }

  /**
   * Scale workers based on load
   */
  async scaleWorkers(targetCount: number) {
    const currentWorkers = await this.deployer.listWorkers();
    const flareproxWorkers = currentWorkers.filter((w: any) => w.id.startsWith('flareprox-'));
    
    if (flareproxWorkers.length < targetCount) {
      // Scale up - deploy additional workers
      const workersToAdd = targetCount - flareproxWorkers.length;
      const results = [];

      for (let i = 0; i < workersToAdd; i++) {
        const workerName = `flareprox-scale-${Date.now()}-${i}`;
        const result = await this.deploySingleWorker({
          name: workerName,
          region: 'GLOBAL',
          rateLimit: 100,
          timeout: 30000,
        });
        results.push(result);
      }

      return { action: 'scale_up', results };
    } else if (flareproxWorkers.length > targetCount) {
      // Scale down - remove excess workers
      const workersToRemove = flareproxWorkers.length - targetCount;
      const results = [];

      // Remove scale workers first (keep default workers)
      const scaleWorkers = flareproxWorkers.filter((w: any) => w.id.includes('scale'));
      const workersToDelete = scaleWorkers.slice(0, workersToRemove);

      for (const worker of workersToDelete) {
        const result = await this.deployer.deleteWorker(worker.id);
        results.push({ workerName: worker.id, ...result });
      }

      return { action: 'scale_down', results };
    }

    return { action: 'no_change', message: 'Worker count already at target' };
  }
}

/**
 * Initialize FlareProx deployment from environment
 */
export function createFlareProxDeploymentManager(env: Bindings): FlareProxDeploymentManager {
  return new FlareProxDeploymentManager({
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: env.CLOUDFLARE_API_KEY,
    authToken: generateAuthToken(),
    domain: env.CLOUDFLARE_DOMAIN,
  });
}

/**
 * Generate a secure authentication token for FlareProx workers
 */
export function generateAuthToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * FlareProx worker health monitoring
 */
export class FlareProxHealthMonitor {
  private deploymentManager: FlareProxDeploymentManager;
  private healthCheckInterval: number;
  private isMonitoring = false;

  constructor(deploymentManager: FlareProxDeploymentManager, healthCheckInterval = 60000) {
    this.deploymentManager = deploymentManager;
    this.healthCheckInterval = healthCheckInterval;
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.runHealthCheck();
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
  }

  private async runHealthCheck() {
    if (!this.isMonitoring) {
      return;
    }

    try {
      const healthResults = await this.deploymentManager.healthCheckAllWorkers();
      
      // Log health status
      console.log('FlareProx Health Check Results:', {
        timestamp: new Date().toISOString(),
        totalWorkers: healthResults.length,
        healthyWorkers: healthResults.filter(r => r.healthy).length,
        unhealthyWorkers: healthResults.filter(r => !r.healthy).length,
        results: healthResults,
      });

      // Handle unhealthy workers
      const unhealthyWorkers = healthResults.filter(r => !r.healthy);
      if (unhealthyWorkers.length > 0) {
        console.warn('Unhealthy FlareProx workers detected:', unhealthyWorkers);
        // TODO: Implement automatic recovery/redeployment
      }

    } catch (error) {
      console.error('FlareProx health check failed:', error);
    }

    // Schedule next health check
    setTimeout(() => this.runHealthCheck(), this.healthCheckInterval);
  }
}

/**
 * FlareProx load balancer
 */
export class FlareProxLoadBalancer {
  private workers: Array<{
    name: string;
    url: string;
    healthy: boolean;
    responseTime: number;
    weight: number;
  }> = [];

  constructor(private domain: string, private authToken: string) {}

  /**
   * Update worker list with health status
   */
  updateWorkers(healthResults: Array<{
    workerName: string;
    healthy: boolean;
    responseTime: number;
  }>) {
    this.workers = healthResults.map(result => ({
      name: result.workerName,
      url: `https://${result.workerName}.${this.domain}`,
      healthy: result.healthy,
      responseTime: result.responseTime,
      weight: result.healthy ? Math.max(1, 100 - Math.floor(result.responseTime / 10)) : 0,
    }));
  }

  /**
   * Get the best worker for a request
   */
  selectWorker(): string | null {
    const healthyWorkers = this.workers.filter(w => w.healthy);
    
    if (healthyWorkers.length === 0) {
      return null;
    }

    // Weighted random selection based on response time
    const totalWeight = healthyWorkers.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;

    for (const worker of healthyWorkers) {
      random -= worker.weight;
      if (random <= 0) {
        return worker.url;
      }
    }

    // Fallback to first healthy worker
    return healthyWorkers[0].url;
  }

  /**
   * Make a proxied request through the best available worker
   */
  async proxyRequest(targetUrl: string, requestInit?: RequestInit): Promise<Response> {
    const workerUrl = this.selectWorker();
    
    if (!workerUrl) {
      throw new Error('No healthy FlareProx workers available');
    }

    const proxyUrl = `${workerUrl}/proxy/${encodeURIComponent(targetUrl)}`;
    
    return fetch(proxyUrl, {
      ...requestInit,
      headers: {
        'x-auth-token': this.authToken,
        ...requestInit?.headers,
      },
    });
  }
}
