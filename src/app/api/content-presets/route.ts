import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, requireRole, parseJsonBody, validateRequiredFields, handleApiError } from '@/lib/api-utils';

// GET - Get content presets for organization
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const presetId = searchParams.get('preset_id');
    const defaultOnly = searchParams.get('default') === 'true';

    let result;
    if (presetId) {
      result = await supabase
      .from('content_presets')
      .select('*')
      .eq('org_id', user.org_id)
        .eq('is_active', true)
        .eq('preset_id', presetId)
        .maybeSingle();
    } else if (defaultOnly) {
      result = await supabase
        .from('content_presets')
        .select('*')
        .eq('org_id', user.org_id)
        .eq('is_active', true)
        .eq('is_default', true)
        .maybeSingle();
    } else {
      result = await supabase
        .from('content_presets')
        .select('*')
        .eq('org_id', user.org_id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
    }

    const { data: presets, error } = result;

    if (error) {
      logger.error('Error fetching content presets:', error);
      return NextResponse.json({ error: 'Failed to fetch content presets' }, { status: 500 });
    }

    return NextResponse.json({ presets });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'content-presets-get',
    });
    return handleApiError(error);
  }
}

// POST - Create or update content preset
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin', 'manager', 'editor']);

    const supabase = await createClient();
    
    const body = await parseJsonBody<{
      preset_id?: string;
      name: string;
      description?: string;
      word_count?: number;
      content_format?: string;
      seo_template?: Record<string, unknown>;
      publishing_schedule?: Record<string, unknown>;
      integration_field_mappings?: Record<string, unknown>;
      quality_level?: string;
      preset_config?: Record<string, unknown>;
      is_default?: boolean;
      is_active?: boolean;
    }>(request);

    validateRequiredFields(body, ['name']);

    const {
      preset_id,
      name,
      description,
      word_count,
      content_format,
      seo_template,
      publishing_schedule,
      integration_field_mappings,
      quality_level = 'standard',
      preset_config,
      is_default = false,
      is_active = true
    } = body;

    // If setting as default, unset other defaults
    if (is_default) {
      await supabase
        .from('content_presets')
        .update({ is_default: false })
        .eq('org_id', user.org_id)
        .eq('is_default', true);
    }

    const presetData = {
      org_id: user.org_id,
      created_by: user.id,
      name,
      description: description || null,
      word_count: word_count || null,
      content_format: content_format || null,
      seo_template: seo_template || {},
      publishing_schedule: publishing_schedule || {},
      integration_field_mappings: integration_field_mappings || {},
      quality_level,
      preset_config: preset_config || {},
      is_default,
      is_active
    };

    let result;
    if (preset_id) {
      // Update existing
      const { data, error } = await supabase
        .from('content_presets')
        .update(presetData)
        .eq('preset_id', preset_id)
        .eq('org_id', user.org_id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating content preset:', error);
        return NextResponse.json({ error: 'Failed to update content preset' }, { status: 500 });
      }
      result = data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('content_presets')
        .insert(presetData)
        .select()
        .single();

      if (error) {
        // Check if it's a unique constraint violation
        if (error.code === '23505') {
          return NextResponse.json(
            { error: 'Preset with this name already exists' },
            { status: 409 }
          );
        }
        logger.error('Error creating content preset:', error);
        return NextResponse.json({ error: 'Failed to create content preset' }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json({ preset: result });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'content-presets-post',
    });
    return handleApiError(error);
  }
}

// DELETE - Delete content preset
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin', 'manager']);

    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const presetId = searchParams.get('preset_id');

    if (!presetId) {
      return NextResponse.json({ error: 'preset_id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('content_presets')
      .delete()
      .eq('preset_id', presetId)
      .eq('org_id', user.org_id);

    if (error) {
      logger.error('Error deleting content preset:', error);
      return NextResponse.json({ error: 'Failed to delete content preset' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'content-presets-delete',
    });
    return handleApiError(error);
  }
}

