/**
 * Google Gemini Provider Implementation
 * Transforms OpenAI format to/from Gemini API format
 */

import { BaseAPIProviderClient, type APIProviderResponse } from '../api-provider-client';
import type { ChatRequest } from '../../types/gateway';

export class GeminiProvider extends BaseAPIProviderClient {
  protected async makeRequest(request: ChatRequest): Promise<APIProviderResponse> {
    const model = this.getGeminiModel(request.options?.model);
    const endpoint = `${this.config.baseUrl}/v1beta/models/${model}:generateContent`;
    
    const requestBody = this.transformRequest(request);
    
    console.log(`[Gemini] Sending request to ${endpoint}`);
    
    const response = await this.fetchWithTimeout(`${endpoint}?key=${this.config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorMessage = await this.parseErrorResponse(response);
      throw new Error(`Gemini API error: ${errorMessage}`);
    }

    const data = await response.json();
    return this.transformResponse(data);
  }

  /**
   * Transform OpenAI format to Gemini format
   */
  protected transformRequest(request: ChatRequest): any {
    const messages = request.messages || [{ role: 'user', content: request.message }];
    
    // Convert messages to Gemini format
    const contents = messages
      .filter(m => m.role !== 'system') // Gemini doesn't have system role
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    // Include system message as first user message if present
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage) {
      contents.unshift({
        role: 'user',
        parts: [{ text: `System instructions: ${systemMessage.content}` }]
      });
    }

    return {
      contents,
      generationConfig: {
        temperature: request.options?.temperature,
        topP: request.options?.topP,
        maxOutputTokens: request.options?.maxTokens || 2048
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH'
        }
      ]
    };
  }

  /**
   * Transform Gemini response to OpenAI format
   */
  protected transformResponse(response: any): APIProviderResponse {
    const candidate = response.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text || '';
    
    // Estimate tokens (Gemini doesn't always provide usage)
    const inputTokens = response.usageMetadata?.promptTokenCount || this.estimateTokens(content);
    const outputTokens = response.usageMetadata?.candidatesTokenCount || this.estimateTokens(content);
    
    return {
      content,
      role: 'assistant',
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens
      },
      metadata: {
        model: 'gemini-pro',
        finishReason: candidate?.finishReason?.toLowerCase() || 'stop'
      }
    };
  }

  /**
   * Map OpenAI model names to Gemini models
   */
  private getGeminiModel(model?: string): string {
    const modelMap: { [key: string]: string } = {
      'gpt-4': 'gemini-1.5-pro',
      'gpt-4-turbo': 'gemini-1.5-pro',
      'gpt-3.5-turbo': 'gemini-1.5-flash',
      'gemini-pro': 'gemini-1.5-pro',
      'gemini-1.5-pro': 'gemini-1.5-pro',
      'gemini-1.5-flash': 'gemini-1.5-flash'
    };

    return modelMap[model || ''] || 'gemini-1.5-flash';
  }
}
