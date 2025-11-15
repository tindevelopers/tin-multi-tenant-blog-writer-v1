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

/**
 * GET /api/integrations
 * Get all integrations for the current user's organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(request);
    
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

    // Get integrations using new database adapter
    const dbAdapter = new EnvironmentIntegrationsDB();
    const integrations = await dbAdapter.getIntegrations(userProfile.org_id);

    return NextResponse.json({ 
      success: true, 
      data: integrations 
    });

  } catch (error) {
    logger.error('Error fetching integrations:', error);
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

    // Create integration using new database adapter
    const dbAdapter = new EnvironmentIntegrationsDB();
    // Determine connection_method from config
    const connectionMethod = config.access_token ? 'oauth' : 'api_key';
    const integration = await dbAdapter.createIntegration(
      userProfile.org_id,
      type,
      config,
      connectionMethod,
      'inactive' // Will be updated after testing
    );

    return NextResponse.json({ 
      success: true, 
      data: integration 
    }, { status: 201 });

  } catch (error) {
    logger.error('Error creating integration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create integration' },
      { status: 500 }
    );
  }
}

