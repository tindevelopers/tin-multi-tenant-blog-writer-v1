import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canTransitionQueueStatus, transitionQueueStatus, type QueueStatus } from '@/lib/blog-queue-state-machine';
import { logger } from '@/utils/logger';

/**
 * GET /api/blog-queue/[id]
 * Get a specific queue item with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's org_id
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const { data: queueItem, error } = await supabase
      .from('blog_generation_queue')
      .select(`
        *,
        created_by_user:users!blog_generation_queue_created_by_fkey(user_id, email, full_name),
        post:blog_posts(post_id, title, status, content, excerpt),
        approvals:blog_approvals(*, requested_by_user:users!blog_approvals_requested_by_fkey(user_id, email, full_name), reviewed_by_user:users!blog_approvals_reviewed_by_fkey(user_id, email, full_name)),
        publishing:blog_platform_publishing(*)
      `)
      .eq('queue_id', id)
      .eq('org_id', userProfile.org_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Queue item not found' },
          { status: 404 }
        );
      }
      logger.error('Error fetching queue item:', error);
      return NextResponse.json(
        { error: 'Failed to fetch queue item', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ queue_item: queueItem });
  } catch (error) {
    logger.error('Error in GET /api/blog-queue/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/blog-queue/[id]
 * Update a queue item (status, priority, etc.)
 * 
 * Body:
 * {
 *   status?: QueueStatus;
 *   priority?: number;
 *   progress_percentage?: number;
 *   current_stage?: string;
 *   progress_updates?: ProgressUpdate[];
 *   generation_error?: string;
 *   metadata?: Record<string, any>;
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's org_id and role
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get current queue item
    const { data: currentItem, error: fetchError } = await supabase
      .from('blog_generation_queue')
      .select('*')
      .eq('queue_id', id)
      .eq('org_id', userProfile.org_id)
      .single();

    if (fetchError || !currentItem) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    // Check permissions: users can only update their own items unless they're managers
    const isManager = ['admin', 'manager', 'editor'].includes(userProfile.role);
    const isOwner = currentItem.created_by === user.id;

    if (!isOwner && !isManager) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    // Validate status transition if status is being updated
    if (body.status && body.status !== currentItem.status) {
      if (!canTransitionQueueStatus(currentItem.status as QueueStatus, body.status as QueueStatus)) {
        return NextResponse.json(
          { 
            error: 'Invalid status transition',
            current_status: currentItem.status,
            requested_status: body.status
          },
          { status: 400 }
        );
      }
      updates.status = body.status;

      // Update timestamps based on status
      if (body.status === 'generating' && !currentItem.generation_started_at) {
        updates.generation_started_at = new Date().toISOString();
      }
      if (body.status === 'generated' && !currentItem.generation_completed_at) {
        updates.generation_completed_at = new Date().toISOString();
      }
    }

    // Update other fields
    if (body.priority !== undefined) {
      updates.priority = body.priority;
    }
    if (body.progress_percentage !== undefined) {
      updates.progress_percentage = body.progress_percentage;
    }
    if (body.current_stage !== undefined) {
      updates.current_stage = body.current_stage;
    }
    if (body.progress_updates !== undefined) {
      updates.progress_updates = body.progress_updates;
    }
    if (body.generation_error !== undefined) {
      updates.generation_error = body.generation_error;
    }
    if (body.generated_content !== undefined) {
      updates.generated_content = body.generated_content;
    }
    if (body.generated_title !== undefined) {
      updates.generated_title = body.generated_title;
    }
    if (body.generation_metadata !== undefined) {
      updates.generation_metadata = body.generation_metadata;
    }
    if (body.metadata !== undefined) {
      updates.metadata = { ...currentItem.metadata, ...body.metadata };
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from('blog_generation_queue')
      .update(updates)
      .eq('queue_id', id)
      .select(`
        *,
        created_by_user:users!blog_generation_queue_created_by_fkey(user_id, email, full_name)
      `)
      .single();

    if (updateError) {
      logger.error('Error updating queue item:', updateError);
      return NextResponse.json(
        { error: 'Failed to update queue item', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      queue_item: updatedItem
    });
  } catch (error) {
    logger.error('Error in PATCH /api/blog-queue/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/blog-queue/[id]
 * Cancel/delete a queue item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's org_id and role
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get current queue item
    const { data: currentItem, error: fetchError } = await supabase
      .from('blog_generation_queue')
      .select('*')
      .eq('queue_id', id)
      .eq('org_id', userProfile.org_id)
      .single();

    if (fetchError || !currentItem) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isManager = ['admin', 'manager', 'editor'].includes(userProfile.role);
    const isOwner = currentItem.created_by === user.id;

    if (!isOwner && !isManager) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Only allow cancellation if not already published or cancelled
    if (['published', 'cancelled'].includes(currentItem.status)) {
      return NextResponse.json(
        { error: `Cannot delete queue item with status: ${currentItem.status}` },
        { status: 400 }
      );
    }

    // Update status to cancelled instead of deleting (for audit trail)
    const { data: updatedItem, error: updateError } = await supabase
      .from('blog_generation_queue')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('queue_id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error cancelling queue item:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel queue item', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Queue item cancelled',
      queue_item: updatedItem
    });
  } catch (error) {
    logger.error('Error in DELETE /api/blog-queue/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

