/**
 * API Route: Verify Keyword Storage
 * 
 * GET /api/keywords/verify-storage?keyword=...&research_result_id=...
 * 
 * Diagnostic endpoint to verify if keyword data is being stored correctly
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

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
    const researchResultId = searchParams.get('research_result_id');

    const checks: Record<string, any> = {};

    // Check keyword_research_results
    let researchQuery = supabase
      .from('keyword_research_results')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (keyword) {
      researchQuery = researchQuery.ilike('keyword', `%${keyword}%`);
    }
    if (researchResultId) {
      researchQuery = researchQuery.eq('id', researchResultId);
    }

    const { data: researchResults, error: researchError } = await researchQuery;

    checks.keyword_research_results = {
      accessible: !researchError,
      error: researchError?.message,
      count: researchResults?.length || 0,
      results: researchResults || [],
    };

    // Check keyword_terms for each research result
    if (researchResults && researchResults.length > 0) {
      const resultIds = researchResults.map(r => r.id);
      const { data: keywordTerms, error: termsError } = await supabase
        .from('keyword_terms')
        .select('*')
        .in('research_result_id', resultIds)
        .eq('user_id', user.id);

      checks.keyword_terms = {
        accessible: !termsError,
        error: termsError?.message,
        count: keywordTerms?.length || 0,
        byResearchResult: resultIds.reduce((acc, id) => {
          const terms = keywordTerms?.filter(t => t.research_result_id === id) || [];
          acc[id] = {
            count: terms.length,
            keywords: terms.map(t => t.keyword).slice(0, 5),
          };
          return acc;
        }, {} as Record<string, any>),
        sample: keywordTerms?.slice(0, 3) || [],
      };
    } else {
      checks.keyword_terms = {
        accessible: true,
        count: 0,
        message: 'No research results found to check terms for',
      };
    }

    // Check if there are any terms without research_result_id
    const { data: orphanedTerms, error: orphanError } = await supabase
      .from('keyword_terms')
      .select('*')
      .eq('user_id', user.id)
      .is('research_result_id', null)
      .limit(5);

    checks.orphaned_keyword_terms = {
      accessible: !orphanError,
      error: orphanError?.message,
      count: orphanedTerms?.length || 0,
      sample: orphanedTerms || [],
    };

    logger.debug('Keyword storage verification', {
      userId: user.id,
      keyword,
      researchResultId,
      checks,
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      checks,
    });
  } catch (error) {
    logger.error('Error in verify-storage endpoint', { error });
    return NextResponse.json(
      { error: 'Verification failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

