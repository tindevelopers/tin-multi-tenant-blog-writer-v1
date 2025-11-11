/**
 * API Route: Connect Integration and Get Recommendations
 * 
 * POST /api/integrations/connect-and-recommend
 * 
 * Connects to an integration via Blog Writer API (v1.1.0+) and gets keyword-based recommendations.
 * The Blog Writer API handles persistence to Supabase automatically (best-effort):
 * - integrations_{ENV} table for integration metadata
 * - recommendations_{ENV} table for computed recommendations
 * 
 * Comprehensive logging is performed at each step for debugging and audit purposes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { blogWriterAPI } from '@/lib/blog-writer-api';
import { integrationLogger } from '@/lib/integrations/logging/integration-logger';

// Helper to get client IP address
function getClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIp || undefined;
}

export async function POST(request: NextRequest) {
  let logId: string | null = null;
  const startTime = Date.now();

  try {
    console.log('🚀 POST /api/integrations/connect-and-recommend');

    const supabase = await createClient(request);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Unauthorized:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization (tenant_id)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('❌ User profile not found:', profileError);
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 404 }
      );
    }

    // Check admin permissions - allow system_admin, super_admin, admin, and manager
    const allowedRoles = ['system_admin', 'super_admin', 'admin', 'manager'];
    if (!allowedRoles.includes(userProfile.role)) {
      console.error('❌ Insufficient permissions:', userProfile.role);
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin, Manager, or higher role required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { provider, connection, keywords } = body;

    // Log connection initiation
    logId = await integrationLogger.log({
      org_id: userProfile.org_id,
      user_id: user.id,
      provider: provider as 'webflow' | 'wordpress' | 'shopify',
      status: 'initiated',
      api_request_payload: {
        provider,
        keywords_count: keywords?.length || 0,
        has_connection: !!connection,
        connection_keys: connection ? Object.keys(connection) : [],
      },
      connection_metadata: {
        connection_method: connection.access_token ? 'oauth' : 'api_key',
      },
      ip_address: getClientIp(request),
      user_agent: request.headers.get('user-agent') || undefined,
    });

    // Validate required fields
    if (!provider || !connection) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, connection' },
        { status: 400 }
      );
    }

    // Validate provider type
    const validProviders = ['webflow', 'wordpress', 'shopify'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate keywords - API requires at least 1 keyword
    const keywordArray = keywords || [];
    if (!Array.isArray(keywordArray)) {
      return NextResponse.json(
        { error: 'Keywords must be an array' },
        { status: 400 }
      );
    }

    if (keywordArray.length === 0) {
      return NextResponse.json(
        { error: 'At least one keyword is required. Please add at least one keyword to get recommendations.' },
        { status: 400 }
      );
    }

    if (keywordArray.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 keywords allowed' },
        { status: 400 }
      );
    }

    console.log(`📝 Connecting to ${provider} with ${keywordArray.length} keywords`);

    // Update log: validating credentials
    if (logId) {
      await integrationLogger.updateLog(logId, {
        status: 'validating_credentials',
      });
    }

    // Update log: calling API
    if (logId) {
      await integrationLogger.updateLog(logId, {
        status: 'api_called',
      });
    }

    const apiStartTime = Date.now();
    let apiResult;

    try {
      // Call Blog Writer API
      apiResult = await blogWriterAPI.connectAndRecommend({
        tenant_id: userProfile.org_id,
        provider: provider as 'webflow' | 'wordpress' | 'shopify',
        connection: connection as Record<string, unknown>,
        keywords: keywordArray,
      });

      const apiDuration = Date.now() - apiStartTime;

      console.log('✅ Blog Writer API response:', {
        saved_integration: apiResult.saved_integration,
        recommended_backlinks: apiResult.recommended_backlinks,
        recommended_interlinks: apiResult.recommended_interlinks,
        per_keyword_count: apiResult.per_keyword?.length || 0,
      });

      // Update log: API success
      if (logId) {
        await integrationLogger.updateLog(logId, {
          status: 'api_success',
          api_response: {
            saved_integration: apiResult.saved_integration,
            recommended_backlinks: apiResult.recommended_backlinks,
            recommended_interlinks: apiResult.recommended_interlinks,
            per_keyword_count: apiResult.per_keyword?.length || 0,
            has_notes: !!apiResult.notes,
          },
          api_duration_ms: apiDuration,
          saved_integration_id: apiResult.saved_integration ? 'api_handled' : undefined,
        });
      }

    } catch (error: any) {
      const apiDuration = Date.now() - apiStartTime;

      console.error('❌ Blog Writer API error:', error);

      // Update log: API error
      if (logId) {
        await integrationLogger.updateLog(logId, {
          status: 'api_error',
          error_message: error.message || 'Unknown API error',
          error_code: error.code || 'api_call_failed',
          error_details: {
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            name: error.name,
          },
          api_duration_ms: apiDuration,
        });
      }

      throw error;
    }

    // Note: The Blog Writer API (v1.1.0+) handles persistence to Supabase automatically:
    // - Saves to integrations_{ENV} table for integration metadata
    // - Saves to recommendations_{ENV} table for computed recommendations
    // We don't need to manually save here unless we want to maintain a local cache.
    // The API's best-effort persistence means it may or may not succeed,
    // but the recommendations are still returned in the response.

    // Update log: connection saved (by API)
    if (logId && apiResult) {
      await integrationLogger.updateLog(logId, {
        status: apiResult.saved_integration ? 'saved' : 'api_success',
      });
    }

    const totalDuration = Date.now() - startTime;
    console.log(`✅ Connection completed in ${totalDuration}ms`);

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        ...apiResult,
        log_id: logId, // Include log ID for debugging
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error in connect-and-recommend:', error);

    // Update log: failed
    if (logId) {
      await integrationLogger.updateLog(logId, {
        status: 'failed',
        error_message: error.message || 'Unknown error',
        error_code: error.code || 'connection_failed',
        error_details: {
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          name: error.name,
        },
      });
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to connect integration and get recommendations',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        log_id: logId, // Include log ID for debugging
      },
      { status: 500 }
    );
  }
}

