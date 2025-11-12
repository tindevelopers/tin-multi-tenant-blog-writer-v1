import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Get content presets for organization
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's org_id
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const presetId = searchParams.get('preset_id');
    const defaultOnly = searchParams.get('default') === 'true';

    let result;
    if (presetId) {
      result = await supabase
        .from('content_presets')
        .select('*')
        .eq('org_id', userProfile.org_id)
        .eq('is_active', true)
        .eq('preset_id', presetId)
        .maybeSingle();
    } else if (defaultOnly) {
      result = await supabase
        .from('content_presets')
        .select('*')
        .eq('org_id', userProfile.org_id)
        .eq('is_active', true)
        .eq('is_default', true)
        .maybeSingle();
    } else {
      result = await supabase
        .from('content_presets')
        .select('*')
        .eq('org_id', userProfile.org_id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
    }

    const { data: presets, error } = result;

    if (error) {
      console.error('Error fetching content presets:', error);
      return NextResponse.json({ error: 'Failed to fetch content presets' }, { status: 500 });
    }

    return NextResponse.json({ presets });
  } catch (error) {
    console.error('Error in GET /api/content-presets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create or update content preset
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's org_id
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }

    // Check permissions (only admin, manager, editor can update)
    if (!['admin', 'manager', 'editor'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
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

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await supabase
        .from('content_presets')
        .update({ is_default: false })
        .eq('org_id', userProfile.org_id)
        .eq('is_default', true);
    }

    const presetData = {
      org_id: userProfile.org_id,
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
        .eq('org_id', userProfile.org_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating content preset:', error);
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
        console.error('Error creating content preset:', error);
        return NextResponse.json({ error: 'Failed to create content preset' }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json({ preset: result });
  } catch (error) {
    console.error('Error in POST /api/content-presets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete content preset
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's org_id
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }

    // Check permissions (only admin, manager can delete)
    if (!['admin', 'manager'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const presetId = searchParams.get('preset_id');

    if (!presetId) {
      return NextResponse.json({ error: 'preset_id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('content_presets')
      .delete()
      .eq('preset_id', presetId)
      .eq('org_id', userProfile.org_id);

    if (error) {
      console.error('Error deleting content preset:', error);
      return NextResponse.json({ error: 'Failed to delete content preset' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/content-presets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

