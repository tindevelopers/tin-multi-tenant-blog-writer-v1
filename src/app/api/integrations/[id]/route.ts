/**
 * Individual Integration API Routes
 * 
 * Handles operations on a specific integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { integrationManager } from '@/lib/integrations/integration-manager';
import type { ConnectionConfig, FieldMapping } from '@/lib/integrations/types';

/**
 * GET /api/integrations/[id]
 * Get a specific integration
 */
export async function GET(
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
    const integration = await integrationManager.getIntegration(id);

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Verify user has access to this integration's organization
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile || userProfile.org_id !== integration.org_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
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
  try {
    const supabase = await createClient();
    
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

    if (!['owner', 'admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { 
      name, 
      config, 
      field_mappings, 
      status 
    }: {
      name?: string;
      config?: ConnectionConfig;
      field_mappings?: FieldMapping[];
      status?: 'active' | 'inactive' | 'error';
    } = body;

    // Verify integration exists and belongs to user's org
    const existing = await integrationManager.getIntegration(id);
    if (!existing || existing.org_id !== userProfile.org_id) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Update integration
    const integration = await integrationManager.updateIntegration(id, {
      name,
      config,
      field_mappings,
      status,
    });

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
    const supabase = await createClient();
    
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

    if (!['owner', 'admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Verify integration exists and belongs to user's org
    const existing = await integrationManager.getIntegration(id);
    if (!existing || existing.org_id !== userProfile.org_id) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Delete integration
    await integrationManager.deleteIntegration(id);

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

