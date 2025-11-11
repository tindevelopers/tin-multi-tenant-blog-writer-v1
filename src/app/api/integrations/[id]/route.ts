/**
 * Individual Integration API Routes
 * 
 * Handles operations on a specific integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import type { ConnectionConfig, FieldMapping, IntegrationStatus, ConnectionMethod } from '@/lib/integrations/types';

/**
 * GET /api/integrations/[id]
 * Get a specific integration
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
    
    // Get user's organization first
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }

    // Get integration using new database adapter
    const dbAdapter = new EnvironmentIntegrationsDB();
    const integration = await dbAdapter.getIntegration(id, userProfile.org_id);
    
    if (!integration) {
      console.error(`[GET] Integration ${id} not found for org ${userProfile.org_id}`);
      return NextResponse.json({ 
        error: 'Integration not found or does not belong to your organization' 
      }, { status: 404 });
    }

    // Double-check organization ownership
    if (integration.org_id !== userProfile.org_id) {
      console.error(`[GET] Integration ${id} org_id ${integration.org_id} does not match user org ${userProfile.org_id}`);
      return NextResponse.json({ 
        error: 'Integration does not belong to your organization' 
      }, { status: 403 });
    }

    return NextResponse.json({ 
      success: true, 
      data: integration 
    });

  } catch (error) {
    console.error('Error fetching integration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch integration' },
      { status: 500 }
    );
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
    const supabase = await createClient(request);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }

    // Check admin permissions - allow system_admin, super_admin, admin, and manager
    const allowedRoles = ['system_admin', 'super_admin', 'admin', 'manager'];
    if (!allowedRoles.includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions. Admin, Manager, or higher role required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { 
      connection,
      config,
      connection_method,
      status 
    }: {
      connection?: ConnectionConfig;
      config?: Record<string, unknown>;
      connection_method?: ConnectionMethod;
      status?: IntegrationStatus;
    } = body;

    // Support both 'connection' and 'config' for backward compatibility
    const connectionConfig = connection || config;

    // Get integration using new database adapter
    const dbAdapter = new EnvironmentIntegrationsDB();
    
    // Verify integration exists and belongs to user's org
    const existing = await dbAdapter.getIntegration(id, userProfile.org_id);
    if (!existing) {
      console.error(`[Update] Integration ${id} not found for org ${userProfile.org_id}`);
      return NextResponse.json({ 
        error: 'Integration not found or does not belong to your organization' 
      }, { status: 404 });
    }
    
    // Double-check organization ownership
    if (existing.org_id !== userProfile.org_id) {
      console.error(`[Update] Integration ${id} org_id ${existing.org_id} does not match user org ${userProfile.org_id}`);
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
      },
      userProfile.org_id
    );

    return NextResponse.json({ 
      success: true, 
      data: integration 
    });

  } catch (error) {
    console.error('Error updating integration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update integration' },
      { status: 500 }
    );
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
    const supabase = await createClient(request);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }

    // Check admin permissions - allow system_admin, super_admin, admin, and manager
    const allowedRoles = ['system_admin', 'super_admin', 'admin', 'manager'];
    if (!allowedRoles.includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions. Admin, Manager, or higher role required.' }, { status: 403 });
    }

    const { id } = await params;

    // Get integration using new database adapter
    const dbAdapter = new EnvironmentIntegrationsDB();
    
    // Verify integration exists and belongs to user's org
    const existing = await dbAdapter.getIntegration(id, userProfile.org_id);
    if (!existing) {
      console.error(`[Delete] Integration ${id} not found for org ${userProfile.org_id}`);
      return NextResponse.json({ 
        error: 'Integration not found or does not belong to your organization' 
      }, { status: 404 });
    }
    
    // Double-check organization ownership
    if (existing.org_id !== userProfile.org_id) {
      console.error(`[Delete] Integration ${id} org_id ${existing.org_id} does not match user org ${userProfile.org_id}`);
      return NextResponse.json({ 
        error: 'Integration does not belong to your organization' 
      }, { status: 403 });
    }

    // Delete integration
    await dbAdapter.deleteIntegration(id, userProfile.org_id);

    return NextResponse.json({ 
      success: true,
      message: 'Integration deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting integration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete integration' },
      { status: 500 }
    );
  }
}

