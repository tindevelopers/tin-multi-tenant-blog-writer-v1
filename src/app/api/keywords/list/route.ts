/**
 * API Route: List User's Keyword Terms
 * 
 * GET /api/keywords/list?search_type=...&location=...&language=...&parent_keyword=...
 * 
 * Retrieves all keyword terms for the authenticated user with optional filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/api-utils';
import enhancedKeywordStorage, { SearchType } from '@/lib/keyword-storage-enhanced';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const researchResultId = searchParams.get('research_result_id') || undefined;
    const searchType = searchParams.get('search_type') as SearchType | undefined;
    const location = searchParams.get('location') || undefined;
    const language = searchParams.get('language') || undefined;
    const parentKeyword = searchParams.get('parent_keyword') || undefined;
    const isRelatedTerm = searchParams.get('is_related_term') === 'true' ? true : 
                         searchParams.get('is_related_term') === 'false' ? false : undefined;
    const isMatchingTerm = searchParams.get('is_matching_term') === 'true' ? true :
                          searchParams.get('is_matching_term') === 'false' ? false : undefined;
    const minSearchVolume = searchParams.get('min_search_volume') ? 
                           parseInt(searchParams.get('min_search_volume')!) : undefined;
    const maxDifficulty = searchParams.get('max_difficulty') ?
                         parseInt(searchParams.get('max_difficulty')!) : undefined;

    const filters = {
      researchResultId,
      searchType,
      location,
      language,
      parentKeyword,
      isRelatedTerm,
      isMatchingTerm,
      minSearchVolume,
      maxDifficulty,
    };

    const terms = await enhancedKeywordStorage.getUserKeywordTerms(user.id, filters);

    logger.debug('Retrieved user keyword terms', {
      userId: user.id,
      count: terms.length,
      filters,
    });

    return NextResponse.json({
      success: true,
      count: terms.length,
      terms,
    });
  } catch (error) {
    logger.error('Error listing keyword terms', { error });
    return handleApiError(error);
  }
}

