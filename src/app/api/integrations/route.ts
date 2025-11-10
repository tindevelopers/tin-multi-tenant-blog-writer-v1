/**
 * Integration Management API Routes
 * 
 * Handles CRUD operations for integrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { integrationManager } from '@/lib/integrations/integration-manager';
import type { IntegrationType, ConnectionConfig, FieldMapping } from '@/lib/integrations/types';

/**
 * GET /api/integrations
 * Get all integrations for the current user's organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }

    // Get integrations
    const integrations = await integrationManager.getIntegrations(userProfile.org_id);

    return NextResponse.json({ 
      success: true, 
      data: integrations 
    });

  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations
 * Create a new integration connection
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { 
      type, 
      name, 
      config, 
      field_mappings 
    }: {
      type: IntegrationType;
      name: string;
      config: ConnectionConfig;
      field_mappings?: FieldMapping[];
    } = body;

    // Validate required fields
    if (!type || !name || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: type, name, config' },
        { status: 400 }
      );
    }

    // Create integration
    const integration = await integrationManager.createIntegration(
      userProfile.org_id,
      type,
      name,
      config,
      field_mappings,
      user.id
    );

    return NextResponse.json({ 
      success: true, 
      data: integration 
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating integration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create integration' },
      { status: 500 }
    );
  }
}

