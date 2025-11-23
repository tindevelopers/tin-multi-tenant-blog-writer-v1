/**
 * API Route: Store Keyword Research Results
 * 
 * POST /api/keywords/store
 * 
 * Stores keyword research results (traditional and/or AI) with automatic caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { parseJsonBody, handleApiError } from '@/lib/api-utils';
import enhancedKeywordStorage, { KeywordResearchResult, SearchType } from '@/lib/keyword-storage-enhanced';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await parseJsonBody<{
      keyword: string;
      location?: string;
      language?: string;
      search_type?: SearchType;
      traditional_data?: any;
      ai_data?: any;
      related_terms?: any[];
      matching_terms?: any[];
      comprehensive_data?: Record<string, unknown>;
      full_api_response?: Record<string, unknown>;
      auto_cache?: boolean; // Default: true
    }>(request);

    const {
      keyword,
      location = 'United States',
      language = 'en',
      search_type = 'traditional',
      traditional_data,
      ai_data,
      related_terms,
      matching_terms,
      comprehensive_data,
      full_api_response,
      auto_cache = true,
    } = body;

    if (!keyword) {
      return NextResponse.json(
        { error: 'Keyword is required' },
        { status: 400 }
      );
    }

    // Get user's org_id
    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    const orgId = userData?.org_id;

    // Prepare research result
    const researchResult: KeywordResearchResult = {
      keyword,
      location,
      language,
      search_type,
      traditional_data,
      ai_data,
      related_terms,
      matching_terms,
      comprehensive_data,
      full_api_response,
    };

    // Store in database (pass supabase client to use authenticated session)
    const storeResult = await enhancedKeywordStorage.storeKeywordResearch(
      user.id,
      researchResult,
      orgId,
      supabase
    );

    if (!storeResult.success) {
      return NextResponse.json(
        { error: storeResult.error || 'Failed to store keyword research' },
        { status: 500 }
      );
    }

    // Cache the result if auto_cache is enabled
    if (auto_cache) {
      await enhancedKeywordStorage.cacheKeyword(
        keyword,
        researchResult,
        user.id,
        orgId
      );
    }

    logger.debug('Keyword research stored successfully', {
      keyword,
      search_type,
      id: storeResult.id,
    });

    return NextResponse.json({
      success: true,
      id: storeResult.id,
      message: 'Keyword research stored successfully',
    });
  } catch (error) {
    logger.error('Error storing keyword research', { error });
    return handleApiError(error);
  }
}

