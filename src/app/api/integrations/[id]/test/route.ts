/**
 * Integration Test Connection API
 * 
 * Tests the connection to an integration and updates status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import { integrationLogger } from '@/lib/integrations/logging/integration-logger';
import { testWebflowConnection, autoDetectWebflowSiteId } from '@/lib/integrations/webflow-api';
import { logger } from '@/utils/logger';

/**
 * POST /api/integrations/[id]/test
 * Test connection to an integration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(request);
    
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
      const connection = integration.config;
      
      // Provider-specific connection testing
      if (integration.type === 'webflow') {
        // Webflow API connection test
        const apiKey = connection.api_key || connection.apiToken || connection.accessToken;
        if (!apiKey) {
          throw new Error('Webflow API key not found in configuration');
        }

        // Auto-detect site_id if not provided
        let siteId = connection.site_id;
        if (!siteId) {
          logger.debug('🔍 Auto-detecting Webflow Site ID for connection test...');
          siteId = await autoDetectWebflowSiteId(
            apiKey as string,
            connection.collection_id as string | undefined
          );
          
          // If we detected a site_id, update the integration config
          if (siteId) {
            const updatedConnection = { ...connection, site_id: siteId };
            await dbAdapter.updateIntegration(
              id,
              { connection: updatedConnection as any },
              userProfile.org_id
            );
            logger.debug(`✅ Auto-detected and saved Site ID: ${siteId}`);
          }
        }

        // Test Webflow connection
        const testResponse = await testWebflowConnection(
          apiKey as string,
          siteId as string | undefined,
          connection.collection_id as string | undefined
        );

        if (testResponse.success) {
          testResult = {
            success: true,
            status: 'active',
            message: testResponse.message,
          };

          // Update integration status with detected site_id if available
          const updateData: any = {
            status: 'active',
            last_tested_at: new Date().toISOString(),
            error_message: undefined,
          };

          // If site_id was auto-detected, update the connection config
          const updatedConnection: any = { ...connection };
          if (siteId && !connection.site_id) {
            updatedConnection.site_id = siteId;
          }
          if (testResponse.siteName && !connection.site_name) {
            updatedConnection.site_name = testResponse.siteName;
          }
          
          if (siteId || testResponse.siteName) {
            updateData.connection = updatedConnection;
          }

          await dbAdapter.updateIntegration(id, updateData, userProfile.org_id);
          
          // Update connection reference for response
          Object.assign(connection, updatedConnection);

          if (logId) {
            await integrationLogger.updateLog(logId, {
              status: 'connection_test_success',
              api_duration_ms: Date.now() - startTime,
              connection_metadata: {
                site_id: siteId,
                site_name: testResponse.siteName,
              },
            });
          }
        } else {
          throw new Error(testResponse.message);
        }
      } else {
        // Generic validation for other providers
        const isValid = connection.accessToken || connection.apiToken || connection.apiKey;
        
        if (isValid) {
          testResult = {
            success: true,
            status: 'active',
            message: 'Connection test successful',
          };

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
        // Include site_id and site_name for Webflow integrations
        ...(integration.type === 'webflow' && {
          site_id: integration.config.site_id,
          site_name: integration.config.site_name,
        }),
      }
    });

  } catch (error) {
    logger.error('Error testing integration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to test integration' },
      { status: 500 }
    );
  }
}

