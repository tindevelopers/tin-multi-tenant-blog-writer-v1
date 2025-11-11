/**
 * OAuth Callback Endpoint for Webflow
 * 
 * GET /api/integrations/oauth/webflow/callback
 * 
 * Handles OAuth callback from Webflow, exchanges code for token,
 * and redirects back to the integration page with connection status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WebflowOAuth } from '@/lib/integrations/oauth/webflow-oauth';
import { integrationLogger } from '@/lib/integrations/logging/integration-logger';
import { createServiceClient } from '@/lib/supabase/service';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import type { ConnectionConfig } from '@/lib/integrations/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Unauthorized:', userError);
      return NextResponse.redirect(
        new URL('/auth/login?redirect=' + encodeURIComponent(request.url), request.url)
      );
    }

    // Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('❌ User profile not found:', profileError);
      return NextResponse.redirect(
        new URL('/admin/integrations/blog-writer?error=user_not_found', request.url)
      );
    }

    // Handle OAuth errors
    if (error) {
      await integrationLogger.log({
        org_id: userProfile.org_id,
        user_id: user.id,
        provider: 'webflow',
        status: 'failed',
        error_message: errorDescription || error,
        error_code: error,
        oauth_code: code || undefined,
        oauth_state: state || undefined,
      });

      return NextResponse.redirect(
        new URL(`/admin/integrations/blog-writer?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`, request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      await integrationLogger.log({
        org_id: userProfile.org_id,
        user_id: user.id,
        provider: 'webflow',
        status: 'failed',
        error_message: 'Missing code or state parameter',
        oauth_code: code || undefined,
        oauth_state: state || undefined,
      });

      return NextResponse.redirect(
        new URL('/admin/integrations/blog-writer?error=missing_parameters', request.url)
      );
    }

    // Validate OAuth state (CSRF protection)
    const supabaseAdmin = createServiceClient();
    const { data: oauthState, error: stateError } = await supabaseAdmin
      .from('oauth_states')
      .select('*')
      .eq('state_value', state)
      .eq('org_id', userProfile.org_id)
      .eq('user_id', user.id)
      .eq('provider', 'webflow')
      .eq('used', false)
      .single();

    if (stateError || !oauthState) {
      console.error('❌ Invalid or expired OAuth state:', stateError);
      await integrationLogger.log({
        org_id: userProfile.org_id,
        user_id: user.id,
        provider: 'webflow',
        status: 'failed',
        error_message: 'Invalid or expired OAuth state',
        error_code: 'invalid_state',
        oauth_state: state,
      });

      return NextResponse.redirect(
        new URL('/admin/integrations/blog-writer?error=invalid_state', request.url)
      );
    }

    // Check if state has expired
    if (new Date(oauthState.expires_at) < new Date()) {
      await integrationLogger.log({
        org_id: userProfile.org_id,
        user_id: user.id,
        provider: 'webflow',
        status: 'failed',
        error_message: 'OAuth state expired',
        error_code: 'expired_state',
        oauth_state: state,
      });

      return NextResponse.redirect(
        new URL('/admin/integrations/blog-writer?error=expired_state', request.url)
      );
    }

    // Mark state as used
    await supabaseAdmin
      .from('oauth_states')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('state_id', oauthState.state_id);

    // Log callback received
    const logId = await integrationLogger.log({
      org_id: userProfile.org_id,
      user_id: user.id,
      provider: 'webflow',
      status: 'oauth_callback_received',
      oauth_code: code,
      oauth_state: state,
      oauth_redirect_uri: oauthState.redirect_uri,
    });

    // Get Webflow OAuth credentials
    const clientId = process.env.WEBFLOW_CLIENT_ID;
    const clientSecret = process.env.WEBFLOW_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/integrations/oauth/webflow/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Webflow OAuth not configured');
    }

    // Exchange authorization code for access token
    const oauth = new WebflowOAuth({
      clientId,
      clientSecret,
      redirectUri,
    });

    const startTime = Date.now();
    let tokenData;
    try {
      tokenData = await oauth.exchangeCodeForToken(code);
      const duration = Date.now() - startTime;

      // Update log with token exchange success
      if (logId) {
        await integrationLogger.updateLog(logId, {
          status: 'api_success',
          api_response: {
            token_type: tokenData.token_type,
            expires_in: tokenData.expires_in,
            has_refresh_token: !!tokenData.refresh_token,
          },
          api_duration_ms: duration,
        });
      }

      // Store tokens securely in integrations table with connection_method: 'oauth'
      const dbAdapter = new EnvironmentIntegrationsDB();
      
      // Calculate expiration timestamp
      const expiresAt = tokenData.expires_in 
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : undefined;

      // Prepare connection config with OAuth tokens
      const connectionConfig: ConnectionConfig = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        tokenType: tokenData.token_type || 'Bearer',
        scope: tokenData.scope,
        // Webflow-specific fields can be added here
      };

      try {
        // Check if integration already exists for this org + provider
        const integrations = await dbAdapter.getIntegrations(userProfile.org_id);
        const existingIntegration = integrations.find(
          (i) => i.type === 'webflow'
        );

        if (existingIntegration) {
          // Update existing integration
          await dbAdapter.updateIntegration(
            existingIntegration.integration_id,
            {
              connection: connectionConfig,
              connection_method: 'oauth',
              status: 'active',
              last_tested_at: new Date().toISOString(),
              error_message: undefined,
            },
            userProfile.org_id
          );

          if (logId) {
            await integrationLogger.updateLog(logId, {
              status: 'saved',
              saved_integration_id: existingIntegration.integration_id,
            });
          }
        } else {
          // Create new integration
          const integration = await dbAdapter.createIntegration(
            userProfile.org_id,
            'webflow',
            connectionConfig,
            'oauth',
            'active'
          );

          if (logId) {
            await integrationLogger.updateLog(logId, {
              status: 'saved',
              saved_integration_id: integration.id,
            });
          }
        }
      } catch (dbError: any) {
        console.error('❌ Database error storing OAuth tokens:', dbError);
        
        if (logId) {
          await integrationLogger.updateLog(logId, {
            status: 'failed',
            error_message: `Failed to save integration: ${dbError.message}`,
            error_code: 'database_error',
          });
        }

        // Still redirect but with warning
        const errorUrl = new URL('/admin/integrations/blog-writer', request.url);
        errorUrl.searchParams.set('error', 'save_failed');
        errorUrl.searchParams.set('error_description', 'OAuth successful but failed to save integration');
        return NextResponse.redirect(errorUrl);
      }

      // Redirect back to integration page with success
      const successUrl = new URL('/admin/integrations/blog-writer', request.url);
      successUrl.searchParams.set('oauth_success', 'true');
      successUrl.searchParams.set('provider', 'webflow');

      return NextResponse.redirect(successUrl);

    } catch (tokenError: any) {
      const duration = Date.now() - startTime;
      
      // Update log with token exchange failure
      if (logId) {
        await integrationLogger.updateLog(logId, {
          status: 'api_error',
          error_message: tokenError.message,
          error_code: 'token_exchange_failed',
          api_duration_ms: duration,
        });
      }

      return NextResponse.redirect(
        new URL(`/admin/integrations/blog-writer?error=token_exchange_failed&error_description=${encodeURIComponent(tokenError.message)}`, request.url)
      );
    }

  } catch (error: any) {
    console.error('❌ Error in Webflow OAuth callback:', error);
    return NextResponse.redirect(
      new URL(`/admin/integrations/blog-writer?error=oauth_callback_error&error_description=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}

