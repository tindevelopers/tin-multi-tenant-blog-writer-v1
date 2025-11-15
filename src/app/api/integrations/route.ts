/**
 * Integration Management API Routes
 * 
 * Handles CRUD operations for integrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import type { IntegrationType, ConnectionConfig, FieldMapping } from '@/lib/integrations/types';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, requireRole, parseJsonBody, validateRequiredFields, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/integrations
 * Get all integrations for the current user's organization
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get integrations using new database adapter
    const dbAdapter = new EnvironmentIntegrationsDB();
    const integrations = await dbAdapter.getIntegrations(user.org_id);

    return NextResponse.json({ 
      success: true, 
      data: integrations 
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-get',
    });
    return handleApiError(error);
  }
}

/**
 * POST /api/integrations
 * Create a new integration connection
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['system_admin', 'super_admin', 'admin', 'manager']);

    // Parse request body
    const body = await parseJsonBody<{
      type: IntegrationType;
      name: string;
      config: ConnectionConfig;
      field_mappings?: FieldMapping[];
    }>(request);

    validateRequiredFields(body, ['type', 'name', 'config']);
    
    const { type, name, config, field_mappings } = body;

    // Create integration using new database adapter
    const dbAdapter = new EnvironmentIntegrationsDB();
    // Determine connection_method from config
    const connectionMethod = config.access_token ? 'oauth' : 'api_key';
    const integration = await dbAdapter.createIntegration(
      user.org_id,
      type,
      config,
      connectionMethod,
      'inactive' // Will be updated after testing
    );

    return NextResponse.json({ 
      success: true, 
      data: integration 
    }, { status: 201 });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-post',
    });
    return handleApiError(error);
  }
}

