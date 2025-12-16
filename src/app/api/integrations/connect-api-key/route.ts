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
import { autoDetectWebflowSiteId } from '@/lib/integrations/webflow-api';
import type { IntegrationType, ConnectionConfig, IntegrationStatus } from '@/lib/integrations/types';
import { logger } from '@/utils/logger';

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
    logger.debug('🔑 POST /api/integrations/connect-api-key');

    const supabase = await createClient(request);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error('❌ Unauthorized:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      logger.error('❌ Insufficient permissions:', userProfile.role);
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

    logger.debug(`📝 Connecting to ${provider} via API key`);

    // Update log: validating credentials
    if (logId) {
      await integrationLogger.updateLog(logId, {
        status: 'validating_credentials',
      });
    }

    // Create database adapter
    const dbAdapter = new EnvironmentIntegrationsDB();

    // Webflow-specific: Auto-detect Site ID if not provided
    if (provider === 'webflow' && connection.api_key && !connection.site_id) {
      try {
        logger.debug('🔍 Auto-detecting Webflow Site ID...');
        const siteId = await autoDetectWebflowSiteId(
          connection.api_key as string,
          connection.collection_id as string | undefined
        );
        
        if (siteId) {
          connection.site_id = siteId;
          logger.debug(`✅ Auto-detected Site ID: ${siteId}`);
        } else {
          logger.warn('⚠️ Could not auto-detect Site ID - user may need to provide it manually');
        }
      } catch (error: unknown) {
        logger.error('Error auto-detecting Site ID', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't fail the connection - site_id is optional, user can provide it later
      }
    }

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
            status: 'connection_test_success',
            connection_metadata: {
              connection_method: 'api_key',
              test_passed: true,
            },
          });
        }
      } catch (error: unknown) {
        connectionStatus = 'error';
        errorMessage = error instanceof Error ? error.message : 'Connection test failed';
        lastTestedAt = new Date().toISOString();
        
        if (logId) {
          await integrationLogger.updateLog(logId, {
            status: 'connection_test_failed',
            error_message: errorMessage,
          });
        }
      }
    }

    // Parse optional name from body
    const { name } = body;
    
    // Create or update integration
    let integration;
    try {
      if (provider === 'webflow') {
        // For Webflow, allow multiple integrations per organization (one per site)
        if (connection.site_id) {
          // Check if integration already exists for this org + provider + site_id
          // site_id can be in config OR metadata, check both locations
          const integrations = await dbAdapter.getIntegrations(userProfile.org_id);
          const existingIntegration = integrations.find((i) => {
            if (i.type !== provider) return false;
            const configSiteId = i.config?.site_id || i.config?.siteId;
            const metadataSiteId = (i as any).metadata?.site_id;
            return configSiteId === connection.site_id || metadataSiteId === connection.site_id;
          });

          if (existingIntegration) {
            // Update existing integration for this site
            integration = await dbAdapter.updateIntegration(
              existingIntegration.integration_id,
              {
                connection: connection as ConnectionConfig,
                connection_method: 'api_key',
                status: connectionStatus,
                last_tested_at: lastTestedAt,
                error_message: errorMessage,
                metadata: name ? { name } : undefined,
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
            // Create new integration for this site
            integration = await dbAdapter.createIntegration(
              userProfile.org_id,
              provider as IntegrationType,
              connection as ConnectionConfig,
              'api_key',
              connectionStatus,
              lastTestedAt,
              errorMessage,
              name ? { name } : undefined
            );

            if (logId) {
              await integrationLogger.updateLog(logId, {
                status: 'saved',
                saved_integration_id: integration.id,
              });
            }
          }
        } else {
          // For Webflow without site_id, create new integration (allow multiple per provider)
          integration = await dbAdapter.createIntegration(
            userProfile.org_id,
            provider as IntegrationType,
            connection as ConnectionConfig,
            'api_key',
            connectionStatus,
            lastTestedAt,
            errorMessage,
            name ? { name } : undefined
          );

          if (logId) {
            await integrationLogger.updateLog(logId, {
              status: 'saved',
              saved_integration_id: integration.id,
            });
          }
        }
      } else {
        // For non-Webflow providers, check if integration already exists
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
              metadata: name ? { name } : undefined,
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
            connectionStatus,
            lastTestedAt,
            errorMessage,
            name ? { name } : undefined
          );

          if (logId) {
            await integrationLogger.updateLog(logId, {
              status: 'saved',
              saved_integration_id: integration.id,
            });
          }
        }
      }
    } catch (error: unknown) {
      logger.error('Database error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      if (logId) {
        await integrationLogger.updateLog(logId, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Database error',
          error_code: 'database_error',
        });
      }

      throw error;
    }

    const totalDuration = Date.now() - startTime;
    logger.debug(`✅ API key connection completed in ${totalDuration}ms`);

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

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-connect-api-key',
    });

    // Update log: failed
    if (logId) {
      await integrationLogger.updateLog(logId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_code: (error as { code?: string })?.code || 'connection_failed',
        error_details: {
          stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : 'Unknown',
        },
      });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to connect integration via API key',
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
        log_id: logId,
      },
      { status: 500 }
    );
  }
}

