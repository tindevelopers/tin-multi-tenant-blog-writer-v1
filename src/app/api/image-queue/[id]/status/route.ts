import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';

/**
 * GET /api/image-queue/[id]/status
 * Get the status of an image generation queue item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: queueId } = await params;

    if (!queueId) {
      return NextResponse.json(
        { error: 'Queue ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get the queue item
    const { data: queueItem, error: queueError } = await supabase
      .from('image_generation_queue')
      .select('*')
      .eq('queue_id', queueId)
      .single();

    if (queueError || !queueItem) {
      logger.error('❌ Error fetching queue item:', queueError);
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    // Return the queue item status
    return NextResponse.json({
      success: true,
      queue_id: queueItem.queue_id,
      status: queueItem.status,
      progress_percentage: queueItem.progress_percentage,
      current_stage: queueItem.current_stage,
      progress_updates: queueItem.progress_updates || [],
      generated_image_url: queueItem.generated_image_url,
      generated_image_id: queueItem.generated_image_id,
      image_width: queueItem.image_width,
      image_height: queueItem.image_height,
      image_format: queueItem.image_format,
      alt_text: queueItem.alt_text,
      quality_score: queueItem.quality_score,
      safety_score: queueItem.safety_score,
      asset_id: queueItem.asset_id,
      generation_error: queueItem.generation_error,
      queued_at: queueItem.queued_at,
      generation_started_at: queueItem.generation_started_at,
      generation_completed_at: queueItem.generation_completed_at,
      metadata: queueItem.metadata || {}
    });

  } catch (error) {
    logger.error('❌ Error in image queue status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

