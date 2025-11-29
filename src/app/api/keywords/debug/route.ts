/**
 * API Route: Debug Keyword Storage
 * 
 * GET /api/keywords/debug
 * 
 * Diagnostic endpoint to check if keyword data is being stored correctly
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

    // Check if tables exist and are accessible
    const checks: Record<string, any> = {};

    // Check keyword_research_results table
    const { data: researchResults, error: researchError, count: researchCount } = await supabase
      .from('keyword_research_results')
      .select('*', { count: 'exact', head: false })
      .eq('user_id', user.id)
      .limit(5);

    checks.keyword_research_results = {
      accessible: !researchError,
      error: researchError?.message,
      count: researchCount || 0,
      sample: researchResults?.slice(0, 2) || [],
    };

    // Check keyword_terms table
    const { data: keywordTerms, error: termsError, count: termsCount } = await supabase
      .from('keyword_terms')
      .select('*', { count: 'exact', head: false })
      .eq('user_id', user.id)
      .limit(5);

    checks.keyword_terms = {
      accessible: !termsError,
      error: termsError?.message,
      count: termsCount || 0,
      sample: keywordTerms?.slice(0, 2) || [],
    };

    // Check keyword_cache table
    const { data: cacheResults, error: cacheError, count: cacheCount } = await supabase
      .from('keyword_cache')
      .select('*', { count: 'exact', head: false })
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .limit(5);

    checks.keyword_cache = {
      accessible: !cacheError,
      error: cacheError?.message,
      count: cacheCount || 0,
      sample: cacheResults?.slice(0, 2) || [],
    };

    logger.debug('Keyword storage diagnostic check', {
      userId: user.id,
      checks,
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      checks,
    });
  } catch (error) {
    logger.error('Error in debug endpoint', { error });
    return NextResponse.json(
      { error: 'Debug check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

