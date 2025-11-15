import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, requireRole, parseJsonBody, handleApiError } from '@/lib/api-utils';

// GET - Get brand settings for organization
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Get active brand settings for the organization
    const { data: brandSettings, error } = await supabase
      .from('brand_settings')
      .select('*')
      .eq('org_id', user.org_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching brand settings:', error);
      return NextResponse.json({ error: 'Failed to fetch brand settings' }, { status: 500 });
    }

    return NextResponse.json({ brand_settings: brandSettings });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'brand-settings-get',
    });
    return handleApiError(error);
  }
}

// POST - Create or update brand settings
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin', 'manager', 'editor']);

    const supabase = await createClient();
    
    const body = await parseJsonBody<{
      tone?: string;
      style_guidelines?: string;
      vocabulary?: string[];
      target_audience?: string;
      industry_specific_terms?: string[];
      brand_voice_description?: string;
      examples?: string[];
      is_active?: boolean;
    }>(request);
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
      .eq('org_id', user.org_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const brandSettingData = {
      org_id: user.org_id,
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
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'brand-settings-post',
    });
    return handleApiError(error);
  }
}

