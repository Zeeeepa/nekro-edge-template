/**
 * Universal API Gateway Core
 * Unified gateway that accepts any API format and routes intelligently
 */

import type { 
  UniversalAPIRequest, 
  UniversalAPIResponse, 
  APIFormat, 
  ProviderConfig,
  LoadBalancingConfig,
  HealthCheckResult
} from '../../types/unified-gateway';
import { BrowserAutomationManager } from '../automation/stagehand-client';
import { FlareProxLoadBalancer } from '../flareprox/deployment';

/**
 * Format detection and conversion utilities
 */
export class FormatDetector {
  /**
   * Detect the API format from request structure
   */
  static detectFormat(request: any): APIFormat {
    // OpenAI format detection
    if (request.messages && Array.isArray(request.messages)) {
      return 'openai';
    }
    
    // Gemini format detection
    if (request.contents && Array.isArray(request.contents)) {
      return 'gemini';
    }
    
    // Claude format detection
    if (request.system || (request.messages && request.messages[0]?.role === 'system')) {
      return 'claude';
    }
    
    return 'custom';
  }

  /**
   * Convert request to universal format
   */
  static convertToUniversal(request: any, detectedFormat: APIFormat): UniversalAPIRequest {
    const universal: UniversalAPIRequest = {
      model: request.model || 'default',
      temperature: request.temperature,
      max_tokens: request.max_tokens || request.maxOutputTokens,
      stream: request.stream || false,
      format_hint: detectedFormat,
    };

    switch (detectedFormat) {
      case 'openai':
        universal.messages = request.messages;
        break;
        
      case 'gemini':
        universal.contents = request.contents;
        universal.generationConfig = request.generationConfig;
        break;
        
      case 'claude':
        universal.system = request.system;
        universal.messages = request.messages;
        break;
        
      default:
        // Copy all properties for custom format
        Object.assign(universal, request);
    }

    return universal;
  }

  /**
   * Convert universal response back to original format
   */
  static convertFromUniversal(
    response: UniversalAPIResponse, 
    targetFormat: APIFormat
  ): any {
    switch (targetFormat) {
      case 'openai':
        return {
          id: response.id,
          object: response.object || 'chat.completion',
          created: response.created,
          model: response.model,
          choices: response.choices || [{
            index: 0,
            message: {
              role: 'assistant',
              content: response.content?.[0]?.text || 'No response'
            },
            finish_reason: 'stop'
          }],
          usage: response.usage || {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
          }
        };
        
      case 'gemini':
        return {
          candidates: response.candidates || [{
            content: {
              parts: [{
                text: response.choices?.[0]?.message?.content || 
                      response.content?.[0]?.text || 
                      'No response'
              }],
              role: 'model'
            },
            finishReason: 'STOP',
            index: 0
          }]
        };
        
      case 'claude':
        return {
          id: response.id,
          type: 'message',
          role: 'assistant',
          content: response.content || [{
            type: 'text',
            text: response.choices?.[0]?.message?.content || 'No response'
          }],
          model: response.model,
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: response.usage?.prompt_tokens || 0,
            output_tokens: response.usage?.completion_tokens || 0
          }
        };
        
      default:
        return response;
    }
  }
}

/**
 * Provider selection and load balancing
 */
export class ProviderSelector {
  private providers: ProviderConfig[] = [];
  private loadBalancingConfig: LoadBalancingConfig;
  private healthResults = new Map<number, HealthCheckResult>();

  constructor(
    providers: ProviderConfig[], 
    loadBalancingConfig: LoadBalancingConfig
  ) {
    this.providers = providers;
    this.loadBalancingConfig = loadBalancingConfig;
  }

  /**
   * Update health check results
   */
  updateHealthResults(results: HealthCheckResult[]) {
    for (const result of results) {
      this.healthResults.set(result.providerId, result);
    }
  }

  /**
   * Select the best provider for a request
   */
  selectProvider(request: UniversalAPIRequest): ProviderConfig | null {
    // Filter enabled providers
    let availableProviders = this.providers.filter(p => p.enabled);
    
    // Check for provider override
    if (request.provider_override) {
      const overrideProvider = availableProviders.find(p => p.name === request.provider_override);
      if (overrideProvider) {
        return overrideProvider;
      }
    }

    // Filter by health status
    availableProviders = availableProviders.filter(provider => {
      const health = this.healthResults.get(provider.id);
      return !health || health.status === 'healthy';
    });

    if (availableProviders.length === 0) {
      return null;
    }

    // Apply load balancing strategy
    switch (this.loadBalancingConfig.strategy) {
      case 'round_robin':
        return this.roundRobinSelection(availableProviders);
        
      case 'weighted':
        return this.weightedSelection(availableProviders);
        
      case 'health_based':
        return this.healthBasedSelection(availableProviders);
        
      case 'least_used':
        return this.leastUsedSelection(availableProviders);
        
      default:
        return availableProviders[0];
    }
  }

  private roundRobinSelection(providers: ProviderConfig[]): ProviderConfig {
    // Simple round-robin based on current time
    const index = Math.floor(Date.now() / 1000) % providers.length;
    return providers[index];
  }

  private weightedSelection(providers: ProviderConfig[]): ProviderConfig {
    const totalWeight = providers.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;

    for (const provider of providers) {
      random -= provider.weight;
      if (random <= 0) {
        return provider;
      }
    }

    return providers[0];
  }

  private healthBasedSelection(providers: ProviderConfig[]): ProviderConfig {
    // Calculate composite score based on health metrics
    const scoredProviders = providers.map(provider => {
      const health = this.healthResults.get(provider.id);
      
      let score = provider.weight;
      
      if (health) {
        // Factor in success rate
        score *= (health.success ? 1 : 0.1);
        
        // Factor in response time (lower is better)
        const responseTimeFactor = Math.max(0.1, 1 - (health.responseTime / 10000));
        score *= responseTimeFactor;
      }
      
      return { provider, score };
    });

    // Sort by score (highest first)
    scoredProviders.sort((a, b) => b.score - a.score);
    
    return scoredProviders[0].provider;
  }

  private leastUsedSelection(providers: ProviderConfig[]): ProviderConfig {
    // Select provider with lowest current usage
    return providers.reduce((least, current) => 
      current.currentUsage < least.currentUsage ? current : least
    );
  }
}

/**
 * Request router and processor
 */
export class RequestRouter {
  private providerSelector: ProviderSelector;
  private browserAutomation: BrowserAutomationManager;
  private flareProxBalancer: FlareProxLoadBalancer;

  constructor(
    providers: ProviderConfig[],
    loadBalancingConfig: LoadBalancingConfig,
    browserAutomation: BrowserAutomationManager,
    flareProxBalancer: FlareProxLoadBalancer
  ) {
    this.providerSelector = new ProviderSelector(providers, loadBalancingConfig);
    this.browserAutomation = browserAutomation;
    this.flareProxBalancer = flareProxBalancer;
  }

  /**
   * Route and process a request
   */
  async processRequest(
    originalRequest: any,
    requestId: string
  ): Promise<UniversalAPIResponse> {
    const startTime = Date.now();
    
    try {
      // Detect format and convert to universal
      const detectedFormat = FormatDetector.detectFormat(originalRequest);
      const universalRequest = FormatDetector.convertToUniversal(originalRequest, detectedFormat);
      universalRequest.request_id = requestId;

      // Select provider
      const provider = this.providerSelector.selectProvider(universalRequest);
      if (!provider) {
        throw new Error('No available providers');
      }

      // Route based on provider type
      let response: UniversalAPIResponse;
      
      switch (provider.type) {
        case 'webchat':
          response = await this.processWebchatRequest(provider, universalRequest);
          break;
          
        case 'api':
          response = await this.processAPIRequest(provider, universalRequest);
          break;
          
        case 'proxy':
          response = await this.processProxyRequest(provider, universalRequest);
          break;
          
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`);
      }

      // Add gateway metadata
      response.provider_used = provider.name;
      response.format_detected = detectedFormat;
      response.response_time = Date.now() - startTime;
      response.request_id = requestId;

      // Convert back to original format
      return FormatDetector.convertFromUniversal(response, detectedFormat);
      
    } catch (error) {
      // Return error response in original format
      const detectedFormat = FormatDetector.detectFormat(originalRequest);
      const errorResponse: UniversalAPIResponse = {
        id: requestId,
        object: 'error',
        created: Math.floor(Date.now() / 1000),
        model: 'error',
        content: [{
          type: 'text',
          text: `Gateway error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        response_time: Date.now() - startTime,
        request_id: requestId,
      };

      return FormatDetector.convertFromUniversal(errorResponse, detectedFormat);
    }
  }

  /**
   * Process webchat request using browser automation
   */
  private async processWebchatRequest(
    provider: ProviderConfig,
    request: UniversalAPIRequest
  ): Promise<UniversalAPIResponse> {
    // Extract message from request
    const message = this.extractMessage(request);
    
    // Send message via browser automation
    const result = await this.browserAutomation.sendMessage(provider, message);
    
    if (!result.success) {
      throw new Error(result.errorMessage || 'Webchat request failed');
    }

    // Convert automation result to API response
    return {
      id: request.request_id || `webchat-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: provider.name,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: result.response || 'No response received'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: message.length,
        completion_tokens: (result.response || '').length,
        total_tokens: message.length + (result.response || '').length
      }
    };
  }

  /**
   * Process direct API request
   */
  private async processAPIRequest(
    provider: ProviderConfig,
    request: UniversalAPIRequest
  ): Promise<UniversalAPIResponse> {
    const apiUrl = provider.apiEndpoint || `${provider.baseUrl}/v1/chat/completions`;
    
    // Prepare request body
    const requestBody = {
      model: request.model || 'default',
      messages: request.messages || [],
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      stream: request.stream || false,
    };

    // Make API request (potentially through proxy)
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': provider.apiKey ? `Bearer ${provider.apiKey}` : '',
      },
      body: JSON.stringify(requestBody),
    };

    let response: Response;
    
    if (provider.useProxy) {
      // Use FlareProx for the request
      response = await this.flareProxBalancer.proxyRequest(apiUrl, fetchOptions);
    } else {
      // Direct request
      response = await fetch(apiUrl, fetchOptions);
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json() as any;
    
    // Convert to universal format
    return {
      id: responseData.id || `api-${Date.now()}`,
      object: responseData.object || 'chat.completion',
      created: responseData.created || Math.floor(Date.now() / 1000),
      model: responseData.model || provider.name,
      choices: responseData.choices || [],
      usage: responseData.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };
  }

  /**
   * Process proxy request (e.g., chat2api)
   */
  private async processProxyRequest(
    provider: ProviderConfig,
    request: UniversalAPIRequest
  ): Promise<UniversalAPIResponse> {
    // Similar to API request but with proxy-specific handling
    return this.processAPIRequest(provider, request);
  }

  /**
   * Extract message text from universal request
   */
  private extractMessage(request: UniversalAPIRequest): string {
    if (request.messages && request.messages.length > 0) {
      const lastMessage = request.messages[request.messages.length - 1];
      return lastMessage.content;
    }
    
    if (request.contents && request.contents.length > 0) {
      const lastContent = request.contents[request.contents.length - 1];
      return lastContent.parts.map(p => p.text).join(' ');
    }
    
    return 'Hello';
  }

  /**
   * Update health results for provider selection
   */
  updateHealthResults(results: HealthCheckResult[]) {
    this.providerSelector.updateHealthResults(results);
  }
}

/**
 * Main Universal API Gateway class
 */
export class UniversalAPIGateway {
  private requestRouter: RequestRouter;
  private providers: ProviderConfig[];
  private loadBalancingConfig: LoadBalancingConfig;

  constructor(
    providers: ProviderConfig[],
    loadBalancingConfig: LoadBalancingConfig,
    browserAutomation: BrowserAutomationManager,
    flareProxBalancer: FlareProxLoadBalancer
  ) {
    this.providers = providers;
    this.loadBalancingConfig = loadBalancingConfig;
    this.requestRouter = new RequestRouter(
      providers,
      loadBalancingConfig,
      browserAutomation,
      flareProxBalancer
    );
  }

  /**
   * Process an incoming request
   */
  async processRequest(request: any): Promise<any> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return await this.requestRouter.processRequest(request, requestId);
  }

  /**
   * Update provider configurations
   */
  updateProviders(providers: ProviderConfig[]) {
    this.providers = providers;
    // Recreate router with new providers
    // Note: This would need to be implemented properly in a real system
  }

  /**
   * Update health check results
   */
  updateHealthResults(results: HealthCheckResult[]) {
    this.requestRouter.updateHealthResults(results);
  }

  /**
   * Get gateway statistics
   */
  getStats() {
    return {
      totalProviders: this.providers.length,
      enabledProviders: this.providers.filter(p => p.enabled).length,
      webchatProviders: this.providers.filter(p => p.type === 'webchat').length,
      apiProviders: this.providers.filter(p => p.type === 'api').length,
      proxyProviders: this.providers.filter(p => p.type === 'proxy').length,
      loadBalancingStrategy: this.loadBalancingConfig.strategy,
    };
  }
}
