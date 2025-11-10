/**
 * API Route: Connect Integration and Get Recommendations
 * 
 * POST /api/integrations/connect-and-recommend
 * 
 * Connects to an integration via Blog Writer API (v1.1.0+) and gets keyword-based recommendations.
 * The Blog Writer API handles persistence to Supabase automatically (best-effort):
 * - integrations_{ENV} table for integration metadata
 * - recommendations_{ENV} table for computed recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { blogWriterAPI } from '@/lib/blog-writer-api';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/integrations/connect-and-recommend');

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Unauthorized:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization (tenant_id)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('❌ User profile not found:', profileError);
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 404 }
      );
    }

    // Check admin permissions - allow system_admin, super_admin, admin, and manager
    const allowedRoles = ['system_admin', 'super_admin', 'admin', 'manager'];
    if (!allowedRoles.includes(userProfile.role)) {
      console.error('❌ Insufficient permissions:', userProfile.role);
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin, Manager, or higher role required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { provider, connection, keywords } = body;

    // Validate required fields
    if (!provider || !connection) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, connection' },
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

    // Validate keywords - API requires at least 1 keyword
    const keywordArray = keywords || [];
    if (!Array.isArray(keywordArray)) {
      return NextResponse.json(
        { error: 'Keywords must be an array' },
        { status: 400 }
      );
    }

    if (keywordArray.length === 0) {
      return NextResponse.json(
        { error: 'At least one keyword is required. Please add at least one keyword to get recommendations.' },
        { status: 400 }
      );
    }

    if (keywordArray.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 keywords allowed' },
        { status: 400 }
      );
    }

    console.log(`📝 Connecting to ${provider} with ${keywordArray.length} keywords`);

    // Call Blog Writer API
    const apiResult = await blogWriterAPI.connectAndRecommend({
      tenant_id: userProfile.org_id,
      provider: provider as 'webflow' | 'wordpress' | 'shopify',
      connection: connection as Record<string, unknown>,
      keywords: keywordArray,
    });

    console.log('✅ Blog Writer API response:', {
      saved_integration: apiResult.saved_integration,
      recommended_backlinks: apiResult.recommended_backlinks,
      recommended_interlinks: apiResult.recommended_interlinks,
      per_keyword_count: apiResult.per_keyword?.length || 0,
    });

    // Note: The Blog Writer API (v1.1.0+) handles persistence to Supabase automatically:
    // - Saves to integrations_{ENV} table for integration metadata
    // - Saves to recommendations_{ENV} table for computed recommendations
    // We don't need to manually save here unless we want to maintain a local cache.
    // The API's best-effort persistence means it may or may not succeed,
    // but the recommendations are still returned in the response.

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        ...apiResult,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error in connect-and-recommend:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to connect integration and get recommendations',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

