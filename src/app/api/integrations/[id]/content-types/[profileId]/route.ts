/**
 * Individual Content Type Profile API Routes
 * 
 * GET /api/integrations/[id]/content-types/[profileId] - Get a profile
 * PUT /api/integrations/[id]/content-types/[profileId] - Update a profile
 * DELETE /api/integrations/[id]/content-types/[profileId] - Delete a profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, requireRole, parseJsonBody, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/integrations/[id]/content-types/[profileId]
 * Get a specific content type profile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, profileId } = await params;
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

    // Get profile with site info
    const { data: profile, error } = await supabase
      .from('content_type_profiles')
      .select(`
        *,
        site:integration_sites(id, site_name, site_id)
      `)
      .eq('id', profileId)
      .eq('integration_id', id)
      .eq('org_id', user.org_id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ 
        error: 'Content type profile not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: profile 
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-content-types-get-by-id',
    });
    return handleApiError(error);
  }
}

/**
 * PUT /api/integrations/[id]/content-types/[profileId]
 * Update a content type profile
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) {
  try {
    const user = await requireRole(request, ['system_admin', 'super_admin', 'admin', 'manager']);

    const { id, profileId } = await params;
    const body = await parseJsonBody<{
      profile_name?: string;
      content_type?: string;
      target_collection_id?: string;
      target_collection_name?: string;
      site_id?: string;
      description?: string;
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

    // Verify profile exists
    const { data: existingProfile } = await supabase
      .from('content_type_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('integration_id', id)
      .eq('org_id', user.org_id)
      .single();

    if (!existingProfile) {
      return NextResponse.json({ 
        error: 'Content type profile not found' 
      }, { status: 404 });
    }

    // If site_id provided, verify it exists
    if (body.site_id !== undefined && body.site_id !== null) {
      const { data: site } = await supabase
        .from('integration_sites')
        .select('id')
        .eq('id', body.site_id)
        .eq('integration_id', id)
        .eq('org_id', user.org_id)
        .single();

      if (!site) {
        return NextResponse.json({ 
          error: 'Site not found or does not belong to this integration' 
        }, { status: 404 });
      }
    }

    // If setting as default, unset other defaults
    if (body.is_default === true) {
      await supabase
        .from('content_type_profiles')
        .update({ is_default: false })
        .eq('integration_id', id)
        .eq('org_id', user.org_id)
        .eq('site_id', body.site_id !== undefined ? body.site_id : existingProfile.site_id)
        .neq('id', profileId);
    }

    // Update profile
    const updateData: Record<string, unknown> = {};
    if (body.profile_name !== undefined) updateData.profile_name = body.profile_name;
    if (body.content_type !== undefined) updateData.content_type = body.content_type;
    if (body.target_collection_id !== undefined) updateData.target_collection_id = body.target_collection_id;
    if (body.target_collection_name !== undefined) updateData.target_collection_name = body.target_collection_name;
    if (body.site_id !== undefined) updateData.site_id = body.site_id;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.is_default !== undefined) updateData.is_default = body.is_default;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    const { data: profile, error } = await supabase
      .from('content_type_profiles')
      .update(updateData)
      .eq('id', profileId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating content type profile', { error, profileId });
      return NextResponse.json({ 
        error: 'Failed to update content type profile',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: profile 
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-content-types-update',
    });
    return handleApiError(error);
  }
}

/**
 * DELETE /api/integrations/[id]/content-types/[profileId]
 * Delete a content type profile
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) {
  try {
    const user = await requireRole(request, ['system_admin', 'super_admin', 'admin', 'manager']);

    const { id, profileId } = await params;
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

    // Verify profile exists
    const { data: existingProfile } = await supabase
      .from('content_type_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('integration_id', id)
      .eq('org_id', user.org_id)
      .single();

    if (!existingProfile) {
      return NextResponse.json({ 
        error: 'Content type profile not found' 
      }, { status: 404 });
    }

    // Delete profile (CASCADE will handle related field mappings)
    const { error } = await supabase
      .from('content_type_profiles')
      .delete()
      .eq('id', profileId);

    if (error) {
      logger.error('Error deleting content type profile', { error, profileId });
      return NextResponse.json({ 
        error: 'Failed to delete content type profile',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Content type profile deleted successfully'
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-content-types-delete',
    });
    return handleApiError(error);
  }
}

