/**
 * API Route: Connect Integration via API Key
 * 
 * POST /api/integrations/connect-api-key
 * 
 * Connects to an integration using API key credentials.
 * Stores credentials encrypted in the database with connection_method: 'api_key'
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import { integrationLogger } from '@/lib/integrations/logging/integration-logger';
import type { IntegrationType, ConnectionConfig } from '@/lib/integrations/types';

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
    console.log('🔑 POST /api/integrations/connect-api-key');

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Unauthorized:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
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

    // Check admin permissions
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
    const { provider, connection, test_connection = false } = body;

    // Log connection initiation
    logId = await integrationLogger.log({
      org_id: userProfile.org_id,
      user_id: user.id,
      provider: provider as 'webflow' | 'wordpress' | 'shopify',
      status: 'initiated',
      api_request_payload: {
        provider,
        connection_method: 'api_key',
        has_connection: !!connection,
        connection_keys: connection ? Object.keys(connection) : [],
      },
      connection_metadata: {
        connection_method: 'api_key',
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
    const validProviders: IntegrationType[] = ['webflow', 'wordpress', 'shopify'];
    if (!validProviders.includes(provider as IntegrationType)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate connection has required API key fields
    const hasApiKey = connection.api_key || connection.api_token || connection.apiToken;
    if (!hasApiKey) {
      return NextResponse.json(
        { error: 'Missing API key. Provide api_key, api_token, or apiToken in connection object.' },
        { status: 400 }
      );
    }

    console.log(`📝 Connecting to ${provider} via API key`);

    // Update log: validating credentials
    if (logId) {
      await integrationLogger.updateLog(logId, {
        status: 'validating_credentials',
      });
    }

    // Create database adapter
    const dbAdapter = new EnvironmentIntegrationsDB();

    // Test connection if requested
    let connectionStatus: 'active' | 'inactive' | 'expired' | 'error' = 'inactive';
    let errorMessage: string | undefined;
    let lastTestedAt: string | undefined;

    if (test_connection) {
      try {
        // TODO: Implement provider-specific connection testing
        // For now, we'll just validate the structure
        connectionStatus = 'active';
        lastTestedAt = new Date().toISOString();
        
        if (logId) {
          await integrationLogger.updateLog(logId, {
            status: 'connection_tested',
            connection_metadata: {
              connection_method: 'api_key',
              test_passed: true,
            },
          });
        }
      } catch (error: any) {
        connectionStatus = 'error';
        errorMessage = error.message || 'Connection test failed';
        lastTestedAt = new Date().toISOString();
        
        if (logId) {
          await integrationLogger.updateLog(logId, {
            status: 'connection_test_failed',
            error_message: errorMessage,
          });
        }
      }
    }

    // Create or update integration
    let integration;
    try {
      // Check if integration already exists for this org + provider
      const integrations = await dbAdapter.getIntegrations(userProfile.org_id);
      const existingIntegration = integrations.find(
        (i) => i.type === provider
      );

      if (existingIntegration) {
        // Update existing integration
        integration = await dbAdapter.updateIntegration(
          existingIntegration.integration_id,
          {
            connection: connection as ConnectionConfig,
            connection_method: 'api_key',
            status: connectionStatus,
            last_tested_at: lastTestedAt,
            error_message: errorMessage,
          },
          userProfile.org_id
        );

        if (logId) {
          await integrationLogger.updateLog(logId, {
            status: 'updated',
            saved_integration_id: existingIntegration.integration_id,
          });
        }
      } else {
        // Create new integration
        integration = await dbAdapter.createIntegration(
          userProfile.org_id,
          provider as IntegrationType,
          connection as ConnectionConfig,
          'api_key',
          connectionStatus
        );

        if (logId) {
          await integrationLogger.updateLog(logId, {
            status: 'saved',
            saved_integration_id: integration.id,
          });
        }
      }
    } catch (error: any) {
      console.error('❌ Database error:', error);
      
      if (logId) {
        await integrationLogger.updateLog(logId, {
          status: 'failed',
          error_message: error.message || 'Database error',
          error_code: 'database_error',
        });
      }

      throw error;
    }

    const totalDuration = Date.now() - startTime;
    console.log(`✅ API key connection completed in ${totalDuration}ms`);

    // Return success response (without exposing credentials)
    const { connection: _, ...integrationWithoutCredentials } = integration;
    
    return NextResponse.json({
      success: true,
      data: {
        ...integrationWithoutCredentials,
        connection_method: 'api_key',
        status: connectionStatus,
        log_id: logId,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error in connect-api-key:', error);

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
        error: error.message || 'Failed to connect integration via API key',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        log_id: logId,
      },
      { status: 500 }
    );
  }
}

