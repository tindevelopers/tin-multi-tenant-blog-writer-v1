/**
 * API Route: Get Recommendations
 * 
 * POST /api/integrations/recommend
 * 
 * Gets keyword-based recommendations from Blog Writer API without connecting.
 * Useful for previewing recommendations before connecting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { blogWriterAPI } from '@/lib/blog-writer-api';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    logger.debug('🚀 POST /api/integrations/recommend');

    const supabase = await createClient(request);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error('❌ Unauthorized:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization (tenant_id)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      logger.error('❌ User profile not found:', profileError);
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { provider, keywords } = body;

    // Validate required fields
    if (!provider || !keywords) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, keywords' },
        { status: 400 }
      );
    }

    // Validate provider type
    const validProviders = ['webflow', 'wordpress', 'shopify'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate keywords
    if (!Array.isArray(keywords)) {
      return NextResponse.json(
        { error: 'Keywords must be an array' },
        { status: 400 }
      );
    }

    if (keywords.length === 0) {
      return NextResponse.json(
        { error: 'At least one keyword is required' },
        { status: 400 }
      );
    }

    if (keywords.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 keywords allowed' },
        { status: 400 }
      );
    }

    logger.debug(`📊 Getting recommendations for ${provider} with ${keywords.length} keywords`);

    // Call Blog Writer API
    const result = await blogWriterAPI.getRecommendations({
      tenant_id: userProfile.org_id,
      provider: provider as 'webflow' | 'wordpress' | 'shopify',
      keywords,
    });

    logger.debug('✅ Recommendations received:', {
      recommended_backlinks: result.recommended_backlinks,
      recommended_interlinks: result.recommended_interlinks,
      per_keyword_count: result.per_keyword?.length || 0,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error: any) {
    logger.error('❌ Error in recommend:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to get recommendations',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

