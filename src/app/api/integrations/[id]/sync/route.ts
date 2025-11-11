/**
 * Integration Sync API
 * 
 * Initiates a sync operation for an integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import { integrationLogger } from '@/lib/integrations/logging/integration-logger';

/**
 * POST /api/integrations/[id]/sync
 * Initiate sync for an integration
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

    // Get integration
    const dbAdapter = new EnvironmentIntegrationsDB();
    const integration = await dbAdapter.getIntegration(id, userProfile.org_id);
    
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Log sync initiation
    const logId = await integrationLogger.log({
      org_id: userProfile.org_id,
      user_id: user.id,
      provider: integration.type as 'webflow' | 'wordpress' | 'shopify',
      status: 'sync_initiated',
      connection_metadata: {
        connection_method: 'sync',
      },
    });

    const startTime = Date.now();

    try {
      // TODO: Implement provider-specific sync logic
      // For Webflow, this would sync blog posts to Webflow CMS
      // For now, we'll simulate a successful sync
      
      // Update integration last_synced_at
      await dbAdapter.updateIntegration(
        id,
        {
          last_synced_at: new Date().toISOString(),
        },
        userProfile.org_id
      );

      if (logId) {
        await integrationLogger.updateLog(logId, {
          status: 'sync_completed',
          api_duration_ms: Date.now() - startTime,
        });
      }

      return NextResponse.json({ 
        success: true,
        data: {
          message: 'Sync initiated successfully',
          integration_id: id,
          last_synced_at: new Date().toISOString(),
        }
      });

    } catch (error: any) {
      if (logId) {
        await integrationLogger.updateLog(logId, {
          status: 'sync_failed',
          error_message: error.message,
          api_duration_ms: Date.now() - startTime,
        });
      }

      return NextResponse.json(
        { error: error.message || 'Sync failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error syncing integration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync integration' },
      { status: 500 }
    );
  }
}

