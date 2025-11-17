import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { logger } from '@/utils/logger';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    logger.debug('Fetching drafts via API route');
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'draft';
    
    // Use service client for server-side operations
    const supabase = createServiceClient();
    
    // Use default system organization
    const orgId = '00000000-0000-0000-0000-000000000001';
    
    logger.debug('Fetching posts', { orgId, status });
    
    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('org_id', orgId);
    
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    // Order by updated_at first (most recently modified), then created_at (newest first)
    query = query.order('updated_at', { ascending: false }).order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      logger.error('Database error fetching drafts', { error: error.message });
      return NextResponse.json(
        { error: 'Failed to fetch posts', details: error.message },
        { status: 500 }
      );
    }
    
    logger.debug('Fetched posts successfully', { count: data?.length || 0 });
    return NextResponse.json({ success: true, data: data || [] });
    
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'drafts-list',
    });
    return handleApiError(error);
  }
}

