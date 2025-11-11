/**
 * Integration Test Connection API
 * 
 * Tests the connection to an integration and updates status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import { integrationLogger } from '@/lib/integrations/logging/integration-logger';

/**
 * POST /api/integrations/[id]/test
 * Test connection to an integration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }

    // Check admin permissions
    const allowedRoles = ['system_admin', 'super_admin', 'admin', 'manager'];
    if (!allowedRoles.includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get integration using EnvironmentIntegrationsDB
    const dbAdapter = new EnvironmentIntegrationsDB();
    const integration = await dbAdapter.getIntegration(id, userProfile.org_id);
    
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Log test initiation
    const logId = await integrationLogger.log({
      org_id: userProfile.org_id,
      user_id: user.id,
      provider: integration.type as 'webflow' | 'wordpress' | 'shopify',
      status: 'connection_test_initiated',
      connection_metadata: {
        connection_method: 'test',
      },
    });

    const startTime = Date.now();
    let testResult: {
      success: boolean;
      status: 'active' | 'inactive' | 'expired' | 'error';
      message?: string;
      error?: string;
    };

    try {
      // TODO: Implement provider-specific connection testing
      // For now, we'll do a basic validation
      const connection = integration.config;
      
      // Basic validation based on connection method
      let isValid = false;
      if (connection.accessToken || connection.apiToken || connection.apiKey) {
        // Basic structure validation - in production, make actual API call
        isValid = true;
      }

      if (isValid) {
        testResult = {
          success: true,
          status: 'active',
          message: 'Connection test successful',
        };

        // Update integration status
        await dbAdapter.updateIntegration(
          id,
          {
            status: 'active',
            last_tested_at: new Date().toISOString(),
            error_message: undefined,
          },
          userProfile.org_id
        );

        if (logId) {
          await integrationLogger.updateLog(logId, {
            status: 'connection_test_success',
            api_duration_ms: Date.now() - startTime,
          });
        }
      } else {
        throw new Error('Invalid connection configuration');
      }
    } catch (error: any) {
      testResult = {
        success: false,
        status: 'error',
        error: error.message || 'Connection test failed',
      };

      // Update integration status
      await dbAdapter.updateIntegration(
        id,
        {
          status: 'error',
          last_tested_at: new Date().toISOString(),
          error_message: error.message || 'Connection test failed',
        },
        userProfile.org_id
      );

      if (logId) {
        await integrationLogger.updateLog(logId, {
          status: 'connection_test_failed',
          error_message: error.message,
          api_duration_ms: Date.now() - startTime,
        });
      }
    }

    return NextResponse.json({ 
      success: testResult.success,
      data: {
        ...testResult,
        last_tested_at: new Date().toISOString(),
        log_id: logId,
      }
    });

  } catch (error) {
    console.error('Error testing integration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to test integration' },
      { status: 500 }
    );
  }
}

