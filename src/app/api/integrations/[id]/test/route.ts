/**
 * Integration Test Connection API
 * 
 * Tests the connection to an integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { integrationManager } from '@/lib/integrations/integration-manager';

/**
 * POST /api/integrations/[id]/test
 * Test connection to an integration
 */
export async function POST(
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

    // Verify integration exists and user has access
    const integration = await integrationManager.getIntegration(id);
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Verify user has access
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile || userProfile.org_id !== integration.org_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Test connection
    const result = await integrationManager.testIntegration(id);

    return NextResponse.json({ 
      success: true, 
      data: result 
    });

  } catch (error) {
    console.error('Error testing integration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to test integration' },
      { status: 500 }
    );
  }
}

