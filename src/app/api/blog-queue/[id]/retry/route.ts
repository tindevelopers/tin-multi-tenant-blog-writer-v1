import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canTransitionQueueStatus, type QueueStatus } from '@/lib/blog-queue-state-machine';
import { logger } from '@/utils/logger';

/**
 * POST /api/blog-queue/[id]/retry
 * Retry a failed queue item
 */
export async function POST(
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

    // Check if item can be retried
    if (currentItem.status !== 'failed') {
      return NextResponse.json(
        { error: `Cannot retry queue item with status: ${currentItem.status}. Only 'failed' items can be retried.` },
        { status: 400 }
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

    // Reset queue item to queued status
    const { data: updatedItem, error: updateError } = await supabase
      .from('blog_generation_queue')
      .update({
        status: 'queued',
        progress_percentage: 0,
        current_stage: null,
        generation_error: null,
        generation_started_at: null,
        generation_completed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('queue_id', id)
      .select(`
        *,
        created_by_user:users!blog_generation_queue_created_by_fkey(user_id, email, full_name)
      `)
      .single();

    if (updateError) {
      logger.error('Error retrying queue item:', updateError);
      return NextResponse.json(
        { error: 'Failed to retry queue item', details: updateError.message },
        { status: 500 }
      );
    }

    // TODO: Trigger background job to start generation

    return NextResponse.json({
      success: true,
      message: 'Queue item queued for retry',
      queue_item: updatedItem
    });
  } catch (error) {
    logger.error('Error in POST /api/blog-queue/[id]/retry:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

