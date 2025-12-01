/**
 * Content Type Field Mappings API Routes
 * 
 * Handles CRUD operations for field mappings within a content type profile
 * GET /api/integrations/[id]/content-types/[profileId]/fields - List all field mappings
 * POST /api/integrations/[id]/content-types/[profileId]/fields - Create/update field mappings (bulk)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, requireRole, parseJsonBody, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/integrations/[id]/content-types/[profileId]/fields
 * Get all field mappings for a content type profile
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

    // Verify profile exists
    const { data: profile } = await supabase
      .from('content_type_profiles')
      .select('id')
      .eq('id', profileId)
      .eq('integration_id', id)
      .eq('org_id', user.org_id)
      .single();

    if (!profile) {
      return NextResponse.json({ 
        error: 'Content type profile not found' 
      }, { status: 404 });
    }

    // Get all field mappings for this profile
    const { data: mappings, error } = await supabase
      .from('content_type_field_mappings')
      .select('*')
      .eq('profile_id', profileId)
      .order('display_order', { ascending: true })
      .order('blog_field', { ascending: true });

    if (error) {
      logger.error('Error fetching field mappings', { error, profileId });
      return NextResponse.json({ 
        error: 'Failed to fetch field mappings' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: mappings || [] 
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-field-mappings-get',
    });
    return handleApiError(error);
  }
}

/**
 * POST /api/integrations/[id]/content-types/[profileId]/fields
 * Create or update field mappings (bulk operation)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) {
  try {
    const user = await requireRole(request, ['system_admin', 'super_admin', 'admin', 'manager']);

    const { id, profileId } = await params;
    const body = await parseJsonBody<{
      mappings: Array<{
        blog_field: string;
        target_field: string;
        is_required?: boolean;
        is_visible?: boolean;
        transform_config?: Record<string, unknown>;
        default_value?: string;
        validation_rules?: Record<string, unknown>;
        display_order?: number;
        display_label?: string;
        help_text?: string;
      }>;
      replace_all?: boolean; // If true, delete existing mappings and create new ones
    }>(request);

    if (!body.mappings || !Array.isArray(body.mappings)) {
      return NextResponse.json({ 
        error: 'mappings array is required' 
      }, { status: 400 });
    }

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
    const { data: profile } = await supabase
      .from('content_type_profiles')
      .select('id')
      .eq('id', profileId)
      .eq('integration_id', id)
      .eq('org_id', user.org_id)
      .single();

    if (!profile) {
      return NextResponse.json({ 
        error: 'Content type profile not found' 
      }, { status: 404 });
    }

    // If replace_all is true, delete existing mappings
    if (body.replace_all) {
      const { error: deleteError } = await supabase
        .from('content_type_field_mappings')
        .delete()
        .eq('profile_id', profileId);

      if (deleteError) {
        logger.error('Error deleting existing mappings', { error: deleteError, profileId });
        return NextResponse.json({ 
          error: 'Failed to delete existing mappings',
          details: deleteError.message 
        }, { status: 500 });
      }
    }

    // Prepare mappings for insert/update
    const mappingsToInsert = body.mappings.map((mapping, index) => ({
      profile_id: profileId,
      blog_field: mapping.blog_field,
      target_field: mapping.target_field,
      is_required: mapping.is_required ?? false,
      is_visible: mapping.is_visible ?? true,
      transform_config: mapping.transform_config || {},
      default_value: mapping.default_value || null,
      validation_rules: mapping.validation_rules || {},
      display_order: mapping.display_order ?? index,
      display_label: mapping.display_label || null,
      help_text: mapping.help_text || null,
    }));

    // Use upsert to handle both insert and update
    const { data: mappings, error } = await supabase
      .from('content_type_field_mappings')
      .upsert(mappingsToInsert, {
        onConflict: 'profile_id,blog_field',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      logger.error('Error saving field mappings', { error, profileId });
      return NextResponse.json({ 
        error: 'Failed to save field mappings',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: mappings,
      message: `Successfully saved ${mappings?.length || 0} field mapping(s)`
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'integrations-field-mappings-post',
    });
    return handleApiError(error);
  }
}

