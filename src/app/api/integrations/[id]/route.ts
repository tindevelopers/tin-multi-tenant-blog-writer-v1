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

    // Support both 'connection' and 'config' for backward compatibility
    let connectionConfig = connection || config;

    // If field_mappings are provided, merge them into connection config
    if (field_mappings !== undefined) {
      connectionConfig = {
        ...(connectionConfig || {}),
        field_mappings: field_mappings,
      } as ConnectionConfig;
    }

    // Get integration using new database adapter
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

    // Determine connection_method from connection if provided
    const connectionMethod = connection_method || (connectionConfig?.access_token ? 'oauth' : (connectionConfig ? 'api_key' : undefined));

    // Update integration
    const integration = await dbAdapter.updateIntegration(
      id,
      {
        connection: connectionConfig as ConnectionConfig,
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

