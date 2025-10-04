/**
 * Anthropic (Claude) Provider Implementation
 * Transforms OpenAI format to/from Claude API format
 */

import { BaseAPIProviderClient, type APIProviderResponse } from '../api-provider-client';
import type { ChatRequest } from '../../types/gateway';

export class AnthropicProvider extends BaseAPIProviderClient {
  protected async makeRequest(request: ChatRequest): Promise<APIProviderResponse> {
    const endpoint = `${this.config.baseUrl}/v1/messages`;
    
    const requestBody = this.transformRequest(request);
    
    console.log(`[Anthropic] Sending request to ${endpoint}`);
    
    const response = await this.fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorMessage = await this.parseErrorResponse(response);
      throw new Error(`Anthropic API error: ${errorMessage}`);
    }

    const data = await response.json();
    return this.transformResponse(data);
  }

  /**
   * Transform OpenAI format to Claude format
   */
  protected transformRequest(request: ChatRequest): any {
    const messages = request.messages || [{ role: 'user', content: request.message }];
    
    // Extract system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    // Claude format
    return {
      model: this.getClaudeModel(request.options?.model),
      messages: chatMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      system: systemMessage?.content,
      max_tokens: request.options?.maxTokens || 1024,
      temperature: request.options?.temperature,
      top_p: request.options?.topP,
      stream: false // We'll add streaming support later
    };
  }

  /**
   * Transform Claude response to OpenAI format
   */
  protected transformResponse(response: any): APIProviderResponse {
    const content = response.content?.[0]?.text || '';
    
    return {
      content,
      role: 'assistant',
      usage: {
        inputTokens: response.usage?.input_tokens || 0,
        outputTokens: response.usage?.output_tokens || 0,
        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
      },
      metadata: {
        model: response.model,
        finishReason: response.stop_reason || 'stop'
      }
    };
  }

  /**
   * Map OpenAI model names to Claude models
   */
  private getClaudeModel(model?: string): string {
    const modelMap: { [key: string]: string } = {
      'gpt-4': 'claude-3-opus-20240229',
      'gpt-4-turbo': 'claude-3-sonnet-20240229',
      'gpt-3.5-turbo': 'claude-3-haiku-20240307',
      'claude-3-opus': 'claude-3-opus-20240229',
      'claude-3-sonnet': 'claude-3-sonnet-20240229',
      'claude-3-haiku': 'claude-3-haiku-20240307'
    };

    return modelMap[model || ''] || 'claude-3-sonnet-20240229';
  }
}
