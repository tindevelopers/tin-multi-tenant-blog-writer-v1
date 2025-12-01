/**
 * Individual Integration API Routes
 * 
 * Handles operations on a specific integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import type { ConnectionConfig, FieldMapping, IntegrationStatus, ConnectionMethod } from '@/lib/integrations/types';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, requireRole, parseJsonBody, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/integrations/[id]
 * Get a specific integration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;

    // Get integration using new database adapter
    const dbAdapter = new EnvironmentIntegrationsDB();
    const integration = await dbAdapter.getIntegration(id, user.org_id);
    
    if (!integration) {
      logger.error('Integration not found', { integrationId: id, orgId: user.org_id });
      return NextResponse.json({ 
        error: 'Integration not found or does not belong to your organization' 
      }, { status: 404 });
    }

    // Double-check organization ownership
    if (integration.org_id !== user.org_id) {
      logger.error('Integration org mismatch', { integrationId: id, integrationOrgId: integration.org_id, userOrgId: user.org_id });
      return NextResponse.json({ 
        error: 'Integration does not belong to your organization' 
      }, { status: 403 });
    }

    return NextResponse.json({ 
      success: true, 
      data: integration 
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-get-by-id',
    });
    return handleApiError(error);
  }
}

/**
 * PUT /api/integrations/[id]
 * Update an integration
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, params);
}

/**
 * PATCH /api/integrations/[id]
 * Update an integration (alias for PUT)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, params);
}

/**
 * Shared update handler for PUT and PATCH
 */
async function handleUpdate(
  request: NextRequest,
  params: Promise<{ id: string }>
) {
  try {
    const user = await requireRole(request, ['system_admin', 'super_admin', 'admin', 'manager']);

    const { id } = await params;
    const body = await parseJsonBody<{
      connection?: ConnectionConfig;
      config?: Record<string, unknown>;
      connection_method?: ConnectionMethod;
      status?: IntegrationStatus;
      field_mappings?: FieldMapping[];
      metadata?: Record<string, unknown>;
    }>(request);
    const { 
      connection,
      config,
      connection_method,
      status,
      field_mappings,
      metadata
    } = body;

    // Get integration using new database adapter FIRST to preserve existing credentials
    const dbAdapter = new EnvironmentIntegrationsDB();
    
    // Verify integration exists and belongs to user's org
    const existing = await dbAdapter.getIntegration(id, user.org_id);
    if (!existing) {
      logger.error('Integration not found for update', { integrationId: id, orgId: user.org_id });
      return NextResponse.json({ 
        error: 'Integration not found or does not belong to your organization' 
      }, { status: 404 });
    }
    
    // Double-check organization ownership
    if (existing.org_id !== user.org_id) {
      logger.error('Integration org mismatch on update', { integrationId: id, integrationOrgId: existing.org_id, userOrgId: user.org_id });
      return NextResponse.json({ 
        error: 'Integration does not belong to your organization' 
      }, { status: 403 });
    }

    /**
     * CREDENTIAL PERSISTENCE STRATEGY:
     * 
     * This endpoint supports a two-stage integration setup:
     * 1. Stage 1: Save credentials (API key, site_id, collection_id, etc.) - encrypted in DB
     * 2. Stage 2: Configure field mappings - credentials must persist
     * 
     * To ensure credentials persist when updating field_mappings:
     * - Always fetch existing integration FIRST (line 116)
     * - Start with existing config (includes encrypted credentials)
     * - Merge new updates into existing config
     * - Field mappings update only adds/updates field_mappings, preserving all credentials
     */
    
    // Start with existing connection config to preserve credentials
    const existingConfig = (existing.config || existing.connection || {}) as Record<string, unknown>;
    
    // Support both 'connection' and 'config' for backward compatibility
    const newConnectionConfig = connection || config;
    
    // Merge new connection config into existing (preserves credentials)
    // This ensures that when updating credentials, field_mappings are preserved
    // And when updating field_mappings, credentials are preserved
    let mergedConfig: ConnectionConfig = {
      ...existingConfig,
      ...(newConnectionConfig || {}),
    } as ConnectionConfig;

    // If field_mappings are provided, merge them into the merged config (preserves credentials)
    // This is Stage 2 of the integration setup - field mapping configuration
    if (field_mappings !== undefined) {
      mergedConfig = {
        ...mergedConfig,
        field_mappings: field_mappings,
      } as ConnectionConfig;
      
      logger.debug('Updating field mappings (Stage 2)', {
        integrationId: id,
        mappingCount: field_mappings.length,
        preservedCredentials: {
          hasApiKey: !!mergedConfig.api_key,
          hasCollectionId: !!mergedConfig.collection_id,
          hasSiteId: !!mergedConfig.site_id,
        }
      });
    }

    // Determine connection_method from connection if provided
    const connectionMethod = connection_method || (mergedConfig?.access_token ? 'oauth' : (mergedConfig ? 'api_key' : existing.connection_method));

    // Update integration with merged config (credentials preserved)
    const integration = await dbAdapter.updateIntegration(
      id,
      {
        connection: mergedConfig,
        connection_method: connectionMethod,
        status: status,
        ...(metadata && { metadata }),
      },
      user.org_id
    );

    return NextResponse.json({ 
      success: true, 
      data: integration 
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-update',
    });
    return handleApiError(error);
  }
}

/**
 * DELETE /api/integrations/[id]
 * Delete an integration
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['system_admin', 'super_admin', 'admin', 'manager']);

    const { id } = await params;

    // Get integration using new database adapter
    const dbAdapter = new EnvironmentIntegrationsDB();
    
    // Verify integration exists and belongs to user's org
    const existing = await dbAdapter.getIntegration(id, user.org_id);
    if (!existing) {
      logger.error('Integration not found for delete', { integrationId: id, orgId: user.org_id });
      return NextResponse.json({ 
        error: 'Integration not found or does not belong to your organization' 
      }, { status: 404 });
    }
    
    // Double-check organization ownership
    if (existing.org_id !== user.org_id) {
      logger.error('Integration org mismatch on delete', { integrationId: id, integrationOrgId: existing.org_id, userOrgId: user.org_id });
      return NextResponse.json({ 
        error: 'Integration does not belong to your organization' 
      }, { status: 403 });
    }

    // Delete integration
    await dbAdapter.deleteIntegration(id, user.org_id);

    return NextResponse.json({ 
      success: true,
      message: 'Integration deleted successfully'
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-delete',
    });
    return handleApiError(error);
  }
}

