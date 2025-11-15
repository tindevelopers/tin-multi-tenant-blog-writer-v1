/**
 * OAuth Authorization Endpoint for Webflow
 * 
 * GET /api/integrations/oauth/webflow/authorize
 * 
 * Initiates OAuth flow by redirecting user to Webflow authorization page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WebflowOAuth } from '@/lib/integrations/oauth/webflow-oauth';
import { integrationLogger } from '@/lib/integrations/logging/integration-logger';
import { createServiceClient } from '@/lib/supabase/service';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(request);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error('❌ Unauthorized:', userError);
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      logger.error('❌ User profile not found:', profileError);
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 404 }
      );
    }

    // Check admin permissions
    const allowedRoles = ['system_admin', 'super_admin', 'admin', 'manager'];
    if (!allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin, Manager, or higher role required.' },
        { status: 403 }
      );
    }

    // Get Webflow OAuth credentials from environment
    const clientId = process.env.WEBFLOW_CLIENT_ID;
    const clientSecret = process.env.WEBFLOW_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/integrations/oauth/webflow/callback`;

    if (!clientId || !clientSecret) {
      logger.error('❌ Webflow OAuth credentials not configured');
      return NextResponse.json(
        { error: 'Webflow OAuth not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    // Generate secure state
    const state = WebflowOAuth.generateState();

    // Store OAuth state in database for validation
    const supabaseAdmin = createServiceClient();
    const { error: stateError } = await supabaseAdmin
      .from('oauth_states')
      .insert({
        state_value: state,
        org_id: userProfile.org_id,
        user_id: user.id,
        provider: 'webflow',
        redirect_uri: redirectUri,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });

    if (stateError) {
      logger.error('❌ Failed to store OAuth state:', stateError);
      return NextResponse.json(
        { error: 'Failed to initialize OAuth flow' },
        { status: 500 }
      );
    }

    // Log OAuth initiation
    await integrationLogger.log({
      org_id: userProfile.org_id,
      user_id: user.id,
      provider: 'webflow',
      status: 'oauth_initiated',
      oauth_state: state,
      oauth_redirect_uri: redirectUri,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
    });

    // Create OAuth client and get authorization URL
    const oauth = new WebflowOAuth({
      clientId,
      clientSecret,
      redirectUri,
      scopes: ['sites:read', 'sites:write', 'collections:read', 'collections:write'],
    });

    const authUrl = oauth.getAuthorizationUrl(state);

    // Redirect to Webflow authorization page
    return NextResponse.redirect(authUrl);

  } catch (error: any) {
    logger.error('❌ Error in Webflow OAuth authorize:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to initiate OAuth flow',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

