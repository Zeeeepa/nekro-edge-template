/**
 * Base API Provider Client
 * Handles HTTP requests, authentication, and format transformation for API providers
 */

import type { ChatRequest, ChatResponse } from '../types/gateway';

export interface APIProviderConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
}

export interface APIProviderResponse {
  content: string;
  role: 'assistant' | 'user' | 'system';
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  metadata?: {
    model?: string;
    finishReason?: string;
    [key: string]: any;
  };
}

export abstract class BaseAPIProviderClient {
  protected config: APIProviderConfig;
  protected timeout: number;
  protected maxRetries: number;

  constructor(config: APIProviderConfig) {
    this.config = config;
    this.timeout = config.timeout || 30000; // 30s default
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Send a chat request to the provider
   */
  async sendRequest(request: ChatRequest): Promise<APIProviderResponse> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[${this.config.name}] Attempt ${attempt}/${this.maxRetries}`);
        
        const response = await this.makeRequest(request);
        
        console.log(`[${this.config.name}] Request successful in ${Date.now() - startTime}ms`);
        return response;
      } catch (error) {
        lastError = error as Error;
        console.error(`[${this.config.name}] Attempt ${attempt} failed:`, error);
        
        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`[${this.config.name}] Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`[${this.config.name}] All ${this.maxRetries} attempts failed: ${lastError?.message}`);
  }

  /**
   * Make the actual HTTP request to the provider
   * Must be implemented by each provider
   */
  protected abstract makeRequest(request: ChatRequest): Promise<APIProviderResponse>;

  /**
   * Transform provider-specific request format
   * Override if provider uses different format than OpenAI
   */
  protected transformRequest(request: ChatRequest): any {
    return {
      model: request.options?.model || 'default',
      messages: request.messages || [{ role: 'user', content: request.message }],
      temperature: request.options?.temperature,
      max_tokens: request.options?.maxTokens,
      top_p: request.options?.topP,
      stream: request.options?.stream || false
    };
  }

  /**
   * Transform provider-specific response to standard format
   * Override if provider uses different format than OpenAI
   */
  protected transformResponse(response: any): APIProviderResponse {
    // Default OpenAI format transformation
    const choice = response.choices?.[0];
    
    return {
      content: choice?.message?.content || choice?.text || '',
      role: 'assistant',
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      },
      metadata: {
        model: response.model,
        finishReason: choice?.finish_reason || 'stop'
      }
    };
  }

  /**
   * Make HTTP request with timeout and error handling
   */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number = this.timeout
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw error;
    }
  }

  /**
   * Parse error response from provider
   */
  protected async parseErrorResponse(response: Response): Promise<string> {
    try {
      const errorData = await response.json();
      return errorData.error?.message || errorData.message || `HTTP ${response.status}`;
    } catch {
      return `HTTP ${response.status}: ${response.statusText}`;
    }
  }

  /**
   * Sleep utility for retries
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Estimate token count (rough approximation)
   */
  protected estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
