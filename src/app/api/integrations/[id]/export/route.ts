/**
 * Integration Export Config API
 * 
 * Exports integration configuration as JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import { logger } from '@/utils/logger';

/**
 * GET /api/integrations/[id]/export
 * Export integration configuration
 */
export async function GET(
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

    // Get integration
    const dbAdapter = new EnvironmentIntegrationsDB();
    const integration = await dbAdapter.getIntegration(id, userProfile.org_id);
    
    if (!integration) {
      logger.error(`[Export] Integration ${id} not found for org ${userProfile.org_id}`);
      return NextResponse.json({ 
        error: 'Integration not found or does not belong to your organization' 
      }, { status: 404 });
    }
    
    // Verify integration belongs to user's organization
    if (integration.org_id !== userProfile.org_id) {
      logger.error(`[Export] Integration ${id} org_id ${integration.org_id} does not match user org ${userProfile.org_id}`);
      return NextResponse.json({ 
        error: 'Integration does not belong to your organization' 
      }, { status: 403 });
    }

    // Prepare export data (mask sensitive information)
    const exportData = {
      integration_id: integration.integration_id,
      type: integration.type,
      name: integration.name,
      status: integration.status,
      connection_method: integration.connection_method || null,
      config: {
        ...integration.config,
        // Mask API keys and tokens
        api_key: integration.config.api_key 
          ? `${String(integration.config.api_key).substring(0, 4)}${'*'.repeat(20)}`
          : undefined,
        apiToken: integration.config.apiToken
          ? `${String(integration.config.apiToken).substring(0, 4)}${'*'.repeat(20)}`
          : undefined,
        accessToken: integration.config.accessToken
          ? `${String(integration.config.accessToken).substring(0, 4)}${'*'.repeat(20)}`
          : undefined,
        // Keep collection_id and other non-sensitive config
        collection_id: integration.config.collection_id,
        endpoints: integration.config.endpoints,
      },
      created_at: integration.created_at,
      updated_at: integration.updated_at,
      last_tested_at: integration.last_tested_at,
      last_synced_at: integration.last_synced_at,
    };

    return NextResponse.json({ 
      success: true,
      data: exportData
    });

  } catch (error) {
    logger.error('Error exporting integration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export integration' },
      { status: 500 }
    );
  }
}

