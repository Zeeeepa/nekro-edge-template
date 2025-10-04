/**
 * OpenAI Provider Implementation
 * Native OpenAI API integration - no format transformation needed
 */

import { BaseAPIProviderClient, type APIProviderResponse } from '../api-provider-client';
import type { ChatRequest } from '../../types/gateway';

export class OpenAIProvider extends BaseAPIProviderClient {
  protected async makeRequest(request: ChatRequest): Promise<APIProviderResponse> {
    const endpoint = `${this.config.baseUrl}/v1/chat/completions`;
    
    const requestBody = this.transformRequest(request);
    
    console.log(`[OpenAI] Sending request to ${endpoint}`);
    
    const response = await this.fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorMessage = await this.parseErrorResponse(response);
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = await response.json();
    return this.transformResponse(data);
  }

  // OpenAI uses standard format, so we can use base class methods
  // No need to override transformRequest or transformResponse
}
