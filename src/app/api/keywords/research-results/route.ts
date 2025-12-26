/**
 * API Route: List User's Keyword Research Results
 * 
 * GET /api/keywords/research-results?limit=...&offset=...&search_type=...&location=...&language=...
 * 
 * Retrieves all keyword research results for the authenticated user with optional filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/api-utils';
import { SearchType } from '@/lib/keyword-storage-enhanced';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    // If id is provided, return single result
    if (id) {
      const { data: result, error } = await supabase
        .from('keyword_research_results')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !result) {
        logger.error('Error fetching research result by id', { 
          error, 
          id,
          userId: user.id,
        });
        return NextResponse.json(
          { success: false, error: 'Research result not found' },
          { status: 404 }
        );
      }

      // Get keyword count for this result
      const { data: termsData } = await supabase
        .from('keyword_terms')
        .select('research_result_id')
        .eq('research_result_id', result.id);

      const keywordCount = termsData?.length || 0;

      return NextResponse.json({
        success: true,
        result: {
          ...result,
          keyword_count: keywordCount,
        },
      });
    }

    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const searchType = searchParams.get('search_type') as SearchType | undefined;
    const location = searchParams.get('location') || undefined;
    const language = searchParams.get('language') || undefined;
    const keyword = searchParams.get('keyword') || undefined;

    // Build query with proper error handling
    let query = supabase
      .from('keyword_research_results')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (searchType) {
      query = query.eq('search_type', searchType);
    }
    if (location) {
      query = query.eq('location', location);
    }
    if (language) {
      query = query.eq('language', language);
    }
    if (keyword) {
      // Use ilike for case-insensitive search, but ensure proper encoding
      const encodedKeyword = decodeURIComponent(keyword);
      query = query.ilike('keyword', `%${encodedKeyword}%`);
    }

    const { data: results, error } = await query;

    if (error) {
      logger.error('Error fetching research results', { 
        error, 
        userId: user.id,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
      });
      return NextResponse.json(
        { error: 'Failed to fetch research results', details: error.message },
        { status: 500 }
      );
    }

    logger.debug('Fetched research results', {
      userId: user.id,
      count: results?.length || 0,
      searchType,
      location,
      language,
      keyword,
    });

    // Get count for pagination (use the same query but with count only)
    let countQuery = supabase
      .from('keyword_research_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (searchType) {
      countQuery = countQuery.eq('search_type', searchType);
    }
    if (location) {
      countQuery = countQuery.eq('location', location);
    }
    if (language) {
      countQuery = countQuery.eq('language', language);
    }
    if (keyword) {
      const encodedKeyword = decodeURIComponent(keyword);
      countQuery = countQuery.ilike('keyword', `%${encodedKeyword}%`);
    }

    const { count, error: countError } = await countQuery;
    
    if (countError) {
      logger.error('Error counting research results', {
        error: countError,
        errorCode: countError.code,
        errorMessage: countError.message,
      });
    }

    // Get related keyword terms count for each result
    const resultIds = (results || []).map(r => r.id);
    const { data: termsData } = await supabase
      .from('keyword_terms')
      .select('research_result_id')
      .in('research_result_id', resultIds);

    const termsCountByResult = (termsData || []).reduce((acc, term) => {
      acc[term.research_result_id] = (acc[term.research_result_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const resultsWithCounts = (results || []).map(result => ({
      ...result,
      keyword_count: termsCountByResult[result.id] || 0,
    }));

    logger.debug('Retrieved research results', {
      userId: user.id,
      count: resultsWithCounts.length,
      total: count,
    });

    return NextResponse.json({
      success: true,
      results: resultsWithCounts,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Error listing research results', { error });
    return handleApiError(error);
  }
}

