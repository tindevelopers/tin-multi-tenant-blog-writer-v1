import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canTransitionQueueStatus, type QueueStatus } from '@/lib/blog-queue-state-machine';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, parseJsonBody, validateRequiredFields, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/blog-queue
 * List all queue items for the user's organization
 * 
 * Query params:
 * - status: Filter by status
 * - priority: Filter by priority
 * - limit: Number of items to return
 * - offset: Pagination offset
 * - sort: Sort field (priority, created_at, etc.)
 * - order: Sort order (asc, desc)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const orgId = user.org_id;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sort = searchParams.get('sort') || 'queued_at';
    const order = searchParams.get('order') || 'desc';

    // Build query - using simpler select without explicit FK names
    let query = supabase
      .from('blog_generation_queue')
      .select(`
        *,
        post:blog_posts(post_id, title, status)
      `)
      .eq('org_id', orgId)
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', parseInt(priority, 10));
    }

    const { data: queueItems, error } = await query;

    // Fetch created_by users for all items
    if (queueItems && queueItems.length > 0) {
      const userIds = [...new Set(queueItems.map(item => item.created_by).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('user_id, email, full_name')
          .in('user_id', userIds);
        
        if (users) {
          const usersMap = new Map(users.map(u => [u.user_id, u]));
          queueItems.forEach((item: any) => {
            item.created_by_user = usersMap.get(item.created_by) || null;
          });
        }
      }
    }

    if (error) {
      logger.error('Error fetching queue items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch queue items', details: error.message },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('blog_generation_queue')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }
    if (priority) {
      countQuery = countQuery.eq('priority', parseInt(priority, 10));
    }

    const { count } = await countQuery;

    return NextResponse.json({
      items: queueItems || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'blog-queue-get',
    });
    return handleApiError(error);
  }
}

/**
 * POST /api/blog-queue
 * Submit a new blog for generation
 * 
 * Body:
 * {
 *   topic: string;
 *   keywords?: string[];
 *   target_audience?: string;
 *   tone?: string;
 *   word_count?: number;
 *   quality_level?: string;
 *   custom_instructions?: string;
 *   template_type?: string;
 *   priority?: number; // 1-10, default 5
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const orgId = user.org_id;
    
    const body = await parseJsonBody<{
      topic: string;
      keywords?: string[];
      target_audience?: string;
      tone?: string;
      word_count?: number;
      quality_level?: string;
      custom_instructions?: string;
      template_type?: string;
      priority?: number;
      metadata?: Record<string, unknown>;
    }>(request);

    validateRequiredFields(body, ['topic']);

    // Create queue entry
    const { data: queueItem, error: insertError } = await supabase
      .from('blog_generation_queue')
      .insert({
        org_id: orgId,
        created_by: user.id,
        topic: body.topic,
        keywords: body.keywords || [],
        target_audience: body.target_audience || null,
        tone: body.tone || null,
        word_count: body.word_count || null,
        quality_level: body.quality_level || null,
        custom_instructions: body.custom_instructions || null,
        template_type: body.template_type || null,
        priority: body.priority || 5,
        status: 'queued',
        progress_percentage: 0,
        metadata: body.metadata || {}
      })
      .select('*')
      .single();

    // Fetch created_by user
    if (queueItem) {
      const { data: createdByUser } = await supabase
        .from('users')
        .select('user_id, email, full_name')
        .eq('user_id', user.id)
        .single();
      
      if (createdByUser) {
        (queueItem as any).created_by_user = createdByUser;
      }
    }

    if (insertError) {
      logger.error('Error creating queue item:', insertError);
      return NextResponse.json(
        { error: 'Failed to create queue item', details: insertError.message },
        { status: 500 }
      );
    }

    // TODO: Trigger background job to start generation
    // For now, we'll return the queue item and generation will be triggered separately

    return NextResponse.json({
      success: true,
      queue_item: queueItem
    }, { status: 201 });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'blog-queue-post',
    });
    return handleApiError(error);
  }
}

