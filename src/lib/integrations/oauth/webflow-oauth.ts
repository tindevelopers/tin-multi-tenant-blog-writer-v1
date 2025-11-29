/**
 * Webflow OAuth Flow Handler
 * 
 * Implements OAuth 2.0 authorization code flow for Webflow integration.
 * Reference: https://developers.webflow.com/oauth
 * 
 * Required Scopes for Publishing:
 * - cms:write - Create, update, and delete CMS collections and items
 * - sites:write - Publish site-wide changes (make CMS changes live)
 * - sites:read - Read site information (optional but recommended)
 */

import crypto from 'crypto';

export interface WebflowOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

/**
 * Default scopes required for Webflow CMS publishing
 */
export const WEBFLOW_PUBLISH_SCOPES = [
  'cms:write',    // Required: Create, update, delete CMS items
  'sites:write',  // Required: Publish site-wide changes
  'sites:read',   // Recommended: Read site information
] as const;

export interface OAuthState {
  state: string;
  codeVerifier?: string; // For PKCE if needed
  metadata?: Record<string, unknown>;
}

export class WebflowOAuth {
  private config: WebflowOAuthConfig;
  private readonly authUrl = 'https://accounts.webflow.com/oauth/authorize';
  private readonly tokenUrl = 'https://api.webflow.com/oauth/access_token';

  constructor(config: WebflowOAuthConfig) {
    this.config = config;
  }

  /**
   * Generate OAuth authorization URL
   * 
   * @param state - CSRF protection state token
   * @param scopes - Optional custom scopes. Defaults to publishing scopes if not provided.
   *                 Required scopes for CMS publishing: cms:write, sites:write
   */
  getAuthorizationUrl(state: string, scopes?: string[]): string {
    // Use provided scopes, config scopes, or default publishing scopes
    const finalScopes = scopes || this.config.scopes || [...WEBFLOW_PUBLISH_SCOPES];
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      state: state,
      scope: finalScopes.join(' '),
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
  }> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for token: ${response.status} ${error}`);
    }

    return await response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
  }> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${response.status} ${error}`);
    }

    return await response.json();
  }

  /**
   * Generate secure random state for CSRF protection
   */
  static generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate OAuth state (CSRF protection)
   */
  static validateState(receivedState: string, expectedState: string): boolean {
    return receivedState === expectedState && receivedState.length >= 32;
  }
}

