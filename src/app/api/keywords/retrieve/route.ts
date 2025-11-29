/**
 * API Route: Retrieve Keyword Research Results
 * 
 * GET /api/keywords/retrieve?keyword=...&location=...&language=...&search_type=...
 * 
 * Retrieves keyword research results from cache or database
 * Checks cache first (7-day expiration), then falls back to database
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
    const keyword = searchParams.get('keyword');
    const location = searchParams.get('location') || 'United States';
    const language = searchParams.get('language') || 'en';
    const searchType = (searchParams.get('search_type') || 'traditional') as SearchType;
    const useCache = searchParams.get('use_cache') !== 'false'; // Default: true

    if (!keyword) {
      return NextResponse.json(
        { error: 'Keyword parameter is required' },
        { status: 400 }
      );
    }

    // Try cache first if enabled
    if (useCache) {
      const cached = await enhancedKeywordStorage.getCachedKeyword(
        keyword,
        location,
        language,
        searchType,
        user.id
      );

      if (cached) {
        logger.debug('Returning cached keyword data', { keyword, source: 'cache' });
        return NextResponse.json({
          success: true,
          data: cached,
          source: 'cache',
        });
      }
    }

    // Fall back to database
    const stored = await enhancedKeywordStorage.getKeywordResearch(
      user.id,
      keyword,
      location,
      language,
      searchType
    );

    if (stored) {
      logger.debug('Returning stored keyword data', { keyword, source: 'database' });
      return NextResponse.json({
        success: true,
        data: stored,
        source: 'database',
      });
    }

    // Not found in cache or database
    return NextResponse.json({
      success: false,
      message: 'Keyword research not found',
      data: null,
    }, { status: 404 });
  } catch (error) {
    logger.error('Error retrieving keyword research', { error });
    return handleApiError(error);
  }
}

