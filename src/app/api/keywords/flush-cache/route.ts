/**
 * API Route: Flush Keyword Cache
 * 
 * DELETE /api/keywords/flush-cache?keyword=...&search_type=...
 * 
 * Flushes keyword cache entries for the authenticated user
 * Optionally filter by keyword and search_type
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/api-utils';
import enhancedKeywordStorage, { SearchType } from '@/lib/keyword-storage-enhanced';

export async function DELETE(request: NextRequest) {
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
    const keyword = searchParams.get('keyword') || undefined;
    const searchType = searchParams.get('search_type') as SearchType | undefined;

    // Flush cache for the authenticated user
    const result = await enhancedKeywordStorage.flushCache(
      user.id,
      keyword,
      searchType
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to flush cache' },
        { status: 500 }
      );
    }

    logger.debug('Cache flushed successfully', {
      userId: user.id,
      keyword,
      searchType,
      deletedCount: result.deletedCount,
    });

    return NextResponse.json({
      success: true,
      message: `Cache flushed successfully. ${result.deletedCount || 0} entries deleted.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    logger.error('Error flushing cache', { error });
    return handleApiError(error);
  }
}

