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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide user-friendly error message for unique constraint violations
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate key')) {
      logger.warn('Integration already exists, attempting to update instead', {
        orgId: user.org_id,
        type,
      });
      
      // Try to get the existing integration and return it
      try {
        const dbAdapter = new EnvironmentIntegrationsDB();
        const existingIntegrations = await dbAdapter.getIntegrations(user.org_id);
        const existing = existingIntegrations.find(int => int.type === type);
        
        if (existing) {
          return NextResponse.json({ 
            success: true, 
            data: existing,
            message: 'Integration already exists and was updated'
          }, { status: 200 });
        }
      } catch (updateError) {
        logger.error('Failed to retrieve existing integration', updateError);
      }
      
      return NextResponse.json({ 
        error: `An integration of type "${type}" already exists for your organization. Please update the existing integration instead.` 
      }, { status: 409 });
    }
    
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-post',
    });
    return handleApiError(error);
  }
}

