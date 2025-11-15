import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';

// GET - Get brand settings for organization
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

    // Get active brand settings for the organization
    const { data: brandSettings, error } = await supabase
      .from('brand_settings')
      .select('*')
      .eq('org_id', userProfile.org_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching brand settings:', error);
      return NextResponse.json({ error: 'Failed to fetch brand settings' }, { status: 500 });
    }

    return NextResponse.json({ brand_settings: brandSettings });
  } catch (error) {
    logger.error('Error in GET /api/brand-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create or update brand settings
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
      tone,
      style_guidelines,
      vocabulary,
      target_audience,
      industry_specific_terms,
      brand_voice_description,
      examples,
      is_active = true
    } = body;

    // Check if brand settings already exist for this org
    const { data: existing } = await supabase
      .from('brand_settings')
      .select('brand_setting_id')
      .eq('org_id', userProfile.org_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const brandSettingData = {
      org_id: userProfile.org_id,
      created_by: user.id,
      tone: tone || 'professional',
      style_guidelines: style_guidelines || null,
      vocabulary: vocabulary || [],
      target_audience: target_audience || null,
      industry_specific_terms: industry_specific_terms || [],
      brand_voice_description: brand_voice_description || null,
      examples: examples || [],
      is_active
    };

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('brand_settings')
        .update(brandSettingData)
        .eq('brand_setting_id', existing.brand_setting_id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating brand settings:', error);
        return NextResponse.json({ error: 'Failed to update brand settings' }, { status: 500 });
      }
      result = data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('brand_settings')
        .insert(brandSettingData)
        .select()
        .single();

      if (error) {
        logger.error('Error creating brand settings:', error);
        return NextResponse.json({ error: 'Failed to create brand settings' }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json({ brand_settings: result });
  } catch (error) {
    logger.error('Error in POST /api/brand-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

