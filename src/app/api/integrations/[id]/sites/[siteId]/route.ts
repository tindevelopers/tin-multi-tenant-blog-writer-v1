/**
 * Individual Integration Site API Routes
 * 
 * PUT /api/integrations/[id]/sites/[siteId] - Update a site
 * DELETE /api/integrations/[id]/sites/[siteId] - Delete a site
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, requireRole, parseJsonBody, handleApiError } from '@/lib/api-utils';

/**
 * PUT /api/integrations/[id]/sites/[siteId]
 * Update an integration site
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; siteId: string }> }
) {
  try {
    const user = await requireRole(request, ['system_admin', 'super_admin', 'admin', 'manager']);

    const { id, siteId } = await params;
    const body = await parseJsonBody<{
      site_name?: string;
      site_id?: string;
      site_url?: string;
      is_default?: boolean;
      is_active?: boolean;
      metadata?: Record<string, unknown>;
    }>(request);

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

    // Verify site exists and belongs to this integration
    const { data: existingSite } = await supabase
      .from('integration_sites')
      .select('*')
      .eq('id', siteId)
      .eq('integration_id', id)
      .eq('org_id', user.org_id)
      .single();

    if (!existingSite) {
      return NextResponse.json({ 
        error: 'Site not found or does not belong to this integration' 
      }, { status: 404 });
    }

    // If setting as default, unset other defaults
    if (body.is_default === true) {
      await supabase
        .from('integration_sites')
        .update({ is_default: false })
        .eq('integration_id', id)
        .eq('org_id', user.org_id)
        .neq('id', siteId);
    }

    // Update site
    const updateData: Record<string, unknown> = {};
    if (body.site_name !== undefined) updateData.site_name = body.site_name;
    if (body.site_id !== undefined) updateData.site_id = body.site_id;
    if (body.site_url !== undefined) updateData.site_url = body.site_url;
    if (body.is_default !== undefined) updateData.is_default = body.is_default;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    const { data: site, error } = await supabase
      .from('integration_sites')
      .update(updateData)
      .eq('id', siteId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating integration site', { error, siteId });
      return NextResponse.json({ 
        error: 'Failed to update site',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: site 
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-sites-update',
    });
    return handleApiError(error);
  }
}

/**
 * DELETE /api/integrations/[id]/sites/[siteId]
 * Delete an integration site
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; siteId: string }> }
) {
  try {
    const user = await requireRole(request, ['system_admin', 'super_admin', 'admin', 'manager']);

    const { id, siteId } = await params;
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

    // Verify site exists and belongs to this integration
    const { data: existingSite } = await supabase
      .from('integration_sites')
      .select('*')
      .eq('id', siteId)
      .eq('integration_id', id)
      .eq('org_id', user.org_id)
      .single();

    if (!existingSite) {
      return NextResponse.json({ 
        error: 'Site not found or does not belong to this integration' 
      }, { status: 404 });
    }

    // Delete site (CASCADE will handle related content_type_profiles)
    const { error } = await supabase
      .from('integration_sites')
      .delete()
      .eq('id', siteId);

    if (error) {
      logger.error('Error deleting integration site', { error, siteId });
      return NextResponse.json({ 
        error: 'Failed to delete site',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Site deleted successfully'
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-sites-delete',
    });
    return handleApiError(error);
  }
}

