/**
 * Integration Sites API Routes
 * 
 * Handles CRUD operations for integration sites
 * GET /api/integrations/[id]/sites - List all sites for an integration
 * POST /api/integrations/[id]/sites - Create a new site
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, requireRole, parseJsonBody, validateRequiredFields, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/integrations/[id]/sites
 * Get all sites for an integration
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
    const supabase = await createClient();

    // Verify integration exists and belongs to user's org
    const { data: integration } = await supabase
      .from('integrations')
      .select('integration_id, org_id')
      .eq('integration_id', id)
      .eq('org_id', user.org_id)
      .single();

    if (!integration) {
      return NextResponse.json({ 
        error: 'Integration not found or does not belong to your organization' 
      }, { status: 404 });
    }

    // Get all sites for this integration
    const { data: sites, error } = await supabase
      .from('integration_sites')
      .select('*')
      .eq('integration_id', id)
      .eq('org_id', user.org_id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching integration sites', { error, integrationId: id });
      return NextResponse.json({ 
        error: 'Failed to fetch sites' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: sites || [] 
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-sites-get',
    });
    return handleApiError(error);
  }
}

/**
 * POST /api/integrations/[id]/sites
 * Create a new site for an integration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['system_admin', 'super_admin', 'admin', 'manager']);

    const { id } = await params;
    const body = await parseJsonBody<{
      site_name: string;
      site_id: string;
      site_url?: string;
      is_default?: boolean;
      metadata?: Record<string, unknown>;
    }>(request);

    validateRequiredFields(body, ['site_name', 'site_id']);

    const { site_name, site_id, site_url, is_default = false, metadata } = body;

    const supabase = await createClient();

    // Verify integration exists and belongs to user's org
    const { data: integration } = await supabase
      .from('integrations')
      .select('integration_id, org_id')
      .eq('integration_id', id)
      .eq('org_id', user.org_id)
      .single();

    if (!integration) {
      return NextResponse.json({ 
        error: 'Integration not found or does not belong to your organization' 
      }, { status: 404 });
    }

    // If this is set as default, unset other defaults
    if (is_default) {
      await supabase
        .from('integration_sites')
        .update({ is_default: false })
        .eq('integration_id', id)
        .eq('org_id', user.org_id);
    }

    // Create new site
    const { data: site, error } = await supabase
      .from('integration_sites')
      .insert({
        integration_id: id,
        org_id: user.org_id,
        site_name,
        site_id,
        site_url,
        is_default,
        metadata: metadata || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating integration site', { error, integrationId: id });
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'A site with this site_id already exists for this integration' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create site',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: site 
    }, { status: 201 });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-sites-post',
    });
    return handleApiError(error);
  }
}

