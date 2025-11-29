import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const query = searchParams.get('query') || null;
    const location = searchParams.get('location') || null;
    const searchType = searchParams.get('search_type') || null;
    const dateFrom = searchParams.get('date_from') || null;
    const dateTo = searchParams.get('date_to') || null;
    
    // Build query
    let dbQuery = supabase
      .from('keyword_research_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('save_search', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Apply filters
    if (query) {
      dbQuery = dbQuery.or(`search_query.ilike.%${query}%,topic.ilike.%${query}%`);
    }
    
    if (location) {
      dbQuery = dbQuery.eq('location', location);
    }
    
    if (searchType) {
      dbQuery = dbQuery.eq('search_type', searchType);
    }
    
    if (dateFrom) {
      dbQuery = dbQuery.gte('created_at', dateFrom);
    }
    
    if (dateTo) {
      dbQuery = dbQuery.lte('created_at', dateTo);
    }
    
    const { data: sessions, error } = await dbQuery;
    
    if (error) {
      logger.error('Failed to fetch keyword search history', { error });
      return NextResponse.json(
        { error: 'Failed to fetch search history' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      searches: sessions || [],
      total: sessions?.length || 0,
      limit,
      offset
    });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'keywords-history',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Re-run a saved search
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { search_id } = body;
    
    if (!search_id) {
      return NextResponse.json(
        { error: 'search_id is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch the saved search
    const { data: savedSearch, error: fetchError } = await supabase
      .from('keyword_research_sessions')
      .select('*')
      .eq('id', search_id)
      .eq('user_id', user.id)
      .single();
    
    if (fetchError || !savedSearch) {
      return NextResponse.json(
        { error: 'Search not found' },
        { status: 404 }
      );
    }
    
    // Return the full API response for replay
    return NextResponse.json({
      success: true,
      search: savedSearch,
      // Return the full API response so frontend can replay it
      api_response: savedSearch.full_api_response || savedSearch.research_results
    });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'keywords-history-rerun',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

