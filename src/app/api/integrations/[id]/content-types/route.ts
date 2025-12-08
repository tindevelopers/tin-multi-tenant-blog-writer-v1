/**
 * Content Type Profiles API Routes
 * 
 * Handles CRUD operations for content type profiles
 * GET /api/integrations/[id]/content-types - List all content type profiles
 * POST /api/integrations/[id]/content-types - Create a new content type profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, requireRole, parseJsonBody, validateRequiredFields, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/integrations/[id]/content-types
 * Get all content type profiles for an integration
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
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id'); // Optional filter by site

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

    // Build query
    let query = supabase
      .from('content_type_profiles')
      .select(`
        *,
        site:integration_sites(id, site_name, site_id)
      `)
      .eq('integration_id', id)
      .eq('org_id', user.org_id);

    if (siteId) {
      query = query.eq('site_id', siteId);
    }

    const { data: profiles, error } = await query
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching content type profiles', { error, integrationId: id });
      return NextResponse.json({ 
        error: 'Failed to fetch content type profiles' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: profiles || [] 
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-content-types-get',
    });
    return handleApiError(error);
  }
}

/**
 * POST /api/integrations/[id]/content-types
 * Create a new content type profile
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['system_admin', 'super_admin', 'admin', 'manager']);

    const { id } = await params;
    const body = await parseJsonBody<{
      profile_name: string;
      content_type: string;
      target_collection_id?: string;
      target_collection_name?: string;
      site_id?: string;
      description?: string;
      is_default?: boolean;
      metadata?: Record<string, unknown>;
    }>(request);

    validateRequiredFields(body, ['profile_name', 'content_type']);

    const {
      profile_name,
      content_type,
      target_collection_id,
      target_collection_name,
      site_id,
      description,
      is_default = false,
      metadata
    } = body;

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

    // If site_id provided, verify it exists and belongs to this integration
    if (site_id) {
      const { data: site } = await supabase
        .from('integration_sites')
        .select('id')
        .eq('id', site_id)
        .eq('integration_id', id)
        .eq('org_id', user.org_id)
        .single();

      if (!site) {
        return NextResponse.json({ 
          error: 'Site not found or does not belong to this integration' 
        }, { status: 404 });
      }
    }

    // If this is set as default, unset other defaults for the same integration/site
    if (is_default) {
      await supabase
        .from('content_type_profiles')
        .update({ is_default: false })
        .eq('integration_id', id)
        .eq('org_id', user.org_id)
        .eq('site_id', site_id || null);
    }

    // Create new profile
    const { data: profile, error } = await supabase
      .from('content_type_profiles')
      .insert({
        integration_id: id,
        org_id: user.org_id,
        site_id: site_id || null,
        profile_name,
        content_type,
        target_collection_id,
        target_collection_name,
        description,
        is_default,
        metadata: metadata || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating content type profile', { error, integrationId: id });
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'A content type profile with this name already exists for this integration' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create content type profile',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: profile 
    }, { status: 201 });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-content-types-post',
    });
    return handleApiError(error);
  }
}

