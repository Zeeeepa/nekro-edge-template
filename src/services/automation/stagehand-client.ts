/**
 * Stagehand Browser Automation Client
 * AI-powered browser automation for webchat providers
 */

import type { 
  AutomationInstructions, 
  AutomationResult, 
  SessionData,
  ProviderConfig 
} from '../../types/unified-gateway';

/**
 * Stagehand automation client for AI-powered browser control
 */
export class StagehandClient {
  private apiKey: string;
  private baseUrl: string;
  private browserbaseApiKey?: string;
  private browserbaseProjectId?: string;

  constructor(config: {
    apiKey: string;
    baseUrl?: string;
    browserbaseApiKey?: string;
    browserbaseProjectId?: string;
  }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.stagehand.dev';
    this.browserbaseApiKey = config.browserbaseApiKey;
    this.browserbaseProjectId = config.browserbaseProjectId;
  }

  /**
   * Create a new browser session
   */
  async createSession(config: {
    provider: string;
    headless?: boolean;
    viewport?: { width: number; height: number };
    userAgent?: string;
    proxy?: string;
  }): Promise<{
    sessionId: string;
    browserSessionId?: string;
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: config.provider,
          browserConfig: {
            headless: config.headless ?? true,
            viewport: config.viewport || { width: 1920, height: 1080 },
            userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          proxy: config.proxy,
          browserbase: this.browserbaseApiKey ? {
            apiKey: this.browserbaseApiKey,
            projectId: this.browserbaseProjectId,
          } : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create session: ${error}`);
      }

      const result = await response.json();
      return {
        sessionId: result.sessionId,
        browserSessionId: result.browserSessionId,
        success: true,
      };
    } catch (error) {
      return {
        sessionId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Navigate to a URL
   */
  async navigate(sessionId: string, url: string): Promise<AutomationResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/navigate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Navigation failed: ${error}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        executionTime: Date.now() - startTime,
        response: `Navigated to ${url}`,
        screenshots: result.screenshots || [],
      };
    } catch (error) {
      return {
        success: false,
        executionTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Navigation failed',
      };
    }
  }

  /**
   * Perform automated login using AI-powered element detection
   */
  async performLogin(
    sessionId: string, 
    provider: ProviderConfig,
    credentials: { email: string; password: string }
  ): Promise<AutomationResult> {
    const startTime = Date.now();
    
    try {
      // Navigate to login page
      if (provider.loginUrl) {
        await this.navigate(sessionId, provider.loginUrl);
      }

      // Use AI to find and fill login form
      const loginResult = await this.aiAction(sessionId, {
        action: 'login',
        instructions: `
          Please log in to ${provider.displayName} using the provided credentials.
          
          Steps:
          1. Find the email/username input field and enter: ${credentials.email}
          2. Find the password input field and enter: ${credentials.password}
          3. Find and click the login/sign-in button
          4. Wait for the login to complete and verify success
          
          Look for common selectors like:
          - Email: input[type="email"], input[name="email"], #email, .email-input
          - Password: input[type="password"], input[name="password"], #password, .password-input
          - Submit: button[type="submit"], .login-btn, .signin-btn, .submit-btn
          
          After clicking login, wait for navigation or success indicators.
        `,
        waitForNavigation: true,
        timeout: 30000,
      });

      if (!loginResult.success) {
        throw new Error(loginResult.errorMessage || 'Login failed');
      }

      // Extract cookies and session data
      const sessionData = await this.getSessionData(sessionId);
      
      return {
        success: true,
        executionTime: Date.now() - startTime,
        response: 'Login successful',
        cookies: sessionData.cookies,
        screenshots: loginResult.screenshots,
      };
    } catch (error) {
      return {
        success: false,
        executionTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(
    sessionId: string,
    provider: ProviderConfig,
    message: string
  ): Promise<AutomationResult> {
    const startTime = Date.now();
    
    try {
      // Use AI to find message input and send message
      const sendResult = await this.aiAction(sessionId, {
        action: 'send_message',
        instructions: `
          Please send a message to the AI chat interface on ${provider.displayName}.
          
          Steps:
          1. Find the message input field (textarea, input, or contenteditable div)
          2. Clear any existing text and type: "${message}"
          3. Find and click the send button or press Enter
          4. Wait for the AI response to appear
          5. Extract the complete AI response text
          
          Common selectors to look for:
          - Message input: textarea, .message-input, .chat-input, input[type="text"]
          - Send button: .send-btn, button[type="submit"], .submit-btn, [aria-label="Send"]
          - Response area: .response, .message, .ai-response, .chat-message
          
          Make sure to wait for the response to fully load before extracting it.
        `,
        waitForResponse: true,
        timeout: 60000,
      });

      if (!sendResult.success) {
        throw new Error(sendResult.errorMessage || 'Failed to send message');
      }

      return {
        success: true,
        executionTime: Date.now() - startTime,
        response: sendResult.extractedText || 'Message sent successfully',
        screenshots: sendResult.screenshots,
      };
    } catch (error) {
      return {
        success: false,
        executionTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Failed to send message',
      };
    }
  }

  /**
   * Perform AI-powered action using natural language instructions
   */
  async aiAction(sessionId: string, config: {
    action: string;
    instructions: string;
    waitForNavigation?: boolean;
    waitForResponse?: boolean;
    timeout?: number;
  }): Promise<{
    success: boolean;
    extractedText?: string;
    screenshots?: string[];
    errorMessage?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/ai-action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: config.action,
          instructions: config.instructions,
          options: {
            waitForNavigation: config.waitForNavigation || false,
            waitForResponse: config.waitForResponse || false,
            timeout: config.timeout || 30000,
            takeScreenshots: true,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`AI action failed: ${error}`);
      }

      const result = await response.json();
      
      return {
        success: result.success,
        extractedText: result.extractedText,
        screenshots: result.screenshots || [],
        errorMessage: result.error,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'AI action failed',
      };
    }
  }

  /**
   * Get current session data (cookies, localStorage, etc.)
   */
  async getSessionData(sessionId: string): Promise<{
    cookies: Record<string, string>;
    localStorage: Record<string, string>;
    sessionStorage: Record<string, string>;
    url: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/data`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get session data');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get session data:', error);
      return {
        cookies: {},
        localStorage: {},
        sessionStorage: {},
        url: '',
      };
    }
  }

  /**
   * Take a screenshot of the current page
   */
  async takeScreenshot(sessionId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/screenshot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to take screenshot');
      }

      const result = await response.json();
      return result.screenshot || null;
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      return null;
    }
  }

  /**
   * Close a browser session
   */
  async closeSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to close session:', error);
      return false;
    }
  }

  /**
   * Health check for Stagehand service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(10000),
      });

      const responseTime = Date.now() - startTime;
      
      return {
        healthy: response.ok,
        responseTime,
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }
}

/**
 * Browser automation manager for multiple providers
 */
export class BrowserAutomationManager {
  private stagehandClient: StagehandClient;
  private activeSessions = new Map<string, {
    sessionId: string;
    providerId: number;
    lastUsed: Date;
    isAuthenticated: boolean;
  }>();

  constructor(config: {
    stagehandApiKey: string;
    browserbaseApiKey?: string;
    browserbaseProjectId?: string;
  }) {
    this.stagehandClient = new StagehandClient({
      apiKey: config.stagehandApiKey,
      browserbaseApiKey: config.browserbaseApiKey,
      browserbaseProjectId: config.browserbaseProjectId,
    });
  }

  /**
   * Get or create a session for a provider
   */
  async getSession(provider: ProviderConfig): Promise<string | null> {
    const existingSession = this.activeSessions.get(provider.name);
    
    // Check if existing session is still valid (less than 1 hour old)
    if (existingSession && 
        Date.now() - existingSession.lastUsed.getTime() < 3600000 &&
        existingSession.isAuthenticated) {
      existingSession.lastUsed = new Date();
      return existingSession.sessionId;
    }

    // Create new session
    const sessionResult = await this.stagehandClient.createSession({
      provider: provider.name,
      headless: true,
      viewport: { width: 1920, height: 1080 },
    });

    if (!sessionResult.success) {
      console.error(`Failed to create session for ${provider.name}:`, sessionResult.error);
      return null;
    }

    // Store session info
    this.activeSessions.set(provider.name, {
      sessionId: sessionResult.sessionId,
      providerId: provider.id,
      lastUsed: new Date(),
      isAuthenticated: false,
    });

    return sessionResult.sessionId;
  }

  /**
   * Authenticate with a provider
   */
  async authenticate(provider: ProviderConfig): Promise<AutomationResult> {
    if (!provider.email || !provider.password) {
      return {
        success: false,
        executionTime: 0,
        errorMessage: 'Missing credentials for authentication',
      };
    }

    const sessionId = await this.getSession(provider);
    if (!sessionId) {
      return {
        success: false,
        executionTime: 0,
        errorMessage: 'Failed to create browser session',
      };
    }

    const loginResult = await this.stagehandClient.performLogin(
      sessionId,
      provider,
      {
        email: provider.email,
        password: provider.password,
      }
    );

    if (loginResult.success) {
      const session = this.activeSessions.get(provider.name);
      if (session) {
        session.isAuthenticated = true;
        session.lastUsed = new Date();
      }
    }

    return loginResult;
  }

  /**
   * Send a message to a provider's chat interface
   */
  async sendMessage(provider: ProviderConfig, message: string): Promise<AutomationResult> {
    const sessionId = await this.getSession(provider);
    if (!sessionId) {
      return {
        success: false,
        executionTime: 0,
        errorMessage: 'No active session for provider',
      };
    }

    // Ensure we're authenticated
    const session = this.activeSessions.get(provider.name);
    if (!session?.isAuthenticated) {
      const authResult = await this.authenticate(provider);
      if (!authResult.success) {
        return authResult;
      }
    }

    const result = await this.stagehandClient.sendMessage(sessionId, provider, message);
    
    // Update session last used time
    if (session) {
      session.lastUsed = new Date();
    }

    return result;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupSessions() {
    const now = Date.now();
    const expiredSessions = [];

    for (const [providerName, session] of this.activeSessions.entries()) {
      // Sessions expire after 1 hour of inactivity
      if (now - session.lastUsed.getTime() > 3600000) {
        expiredSessions.push({ providerName, sessionId: session.sessionId });
      }
    }

    for (const { providerName, sessionId } of expiredSessions) {
      await this.stagehandClient.closeSession(sessionId);
      this.activeSessions.delete(providerName);
      console.log(`Cleaned up expired session for ${providerName}`);
    }

    return expiredSessions.length;
  }

  /**
   * Get session status for all providers
   */
  getSessionStatus() {
    const status = [];
    
    for (const [providerName, session] of this.activeSessions.entries()) {
      status.push({
        provider: providerName,
        sessionId: session.sessionId,
        providerId: session.providerId,
        lastUsed: session.lastUsed,
        isAuthenticated: session.isAuthenticated,
        isExpired: Date.now() - session.lastUsed.getTime() > 3600000,
      });
    }

    return status;
  }

  /**
   * Force close all sessions
   */
  async closeAllSessions() {
    const closedSessions = [];

    for (const [providerName, session] of this.activeSessions.entries()) {
      const closed = await this.stagehandClient.closeSession(session.sessionId);
      closedSessions.push({
        provider: providerName,
        sessionId: session.sessionId,
        closed,
      });
    }

    this.activeSessions.clear();
    return closedSessions;
  }
}
