import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';

/**
 * GET /api/blog-queue/[id]/status
 * Server-Sent Events (SSE) endpoint for real-time queue status updates
 * 
 * This endpoint streams status updates for a queue item in real-time.
 * Clients can connect and receive updates as the queue item progresses.
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
      return new Response('Unauthorized', { status: 401 });
    }

    // Get user's org_id
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userProfile) {
      return new Response('User profile not found', { status: 404 });
    }

    // Verify queue item exists and belongs to user's org
    const { data: queueItem, error: queueError } = await supabase
      .from('blog_generation_queue')
      .select('queue_id, org_id, status, progress_percentage, current_stage')
      .eq('queue_id', id)
      .eq('org_id', userProfile.org_id)
      .single();

    if (queueError || !queueItem) {
      return new Response('Queue item not found', { status: 404 });
    }

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Send initial connection message
        const send = (data: any) => {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // Send initial status
        send({
          type: 'connected',
          queue_id: id,
          status: queueItem.status,
          progress_percentage: queueItem.progress_percentage,
          current_stage: queueItem.current_stage,
          timestamp: new Date().toISOString()
        });

        // Poll for updates every 2 seconds
        const pollInterval = setInterval(async () => {
          try {
            const { data: updatedItem, error } = await supabase
              .from('blog_generation_queue')
              .select('status, progress_percentage, current_stage, progress_updates, generation_error')
              .eq('queue_id', id)
              .single();

            if (error) {
              send({
                type: 'error',
                message: 'Failed to fetch queue status',
                timestamp: new Date().toISOString()
              });
              return;
            }

            if (updatedItem) {
              // Get latest progress update
              const progressUpdates = (updatedItem.progress_updates as any[]) || [];
              const latestUpdate = progressUpdates.length > 0 
                ? progressUpdates[progressUpdates.length - 1]
                : null;

              send({
                type: 'status_update',
                queue_id: id,
                status: updatedItem.status,
                progress_percentage: updatedItem.progress_percentage,
                current_stage: updatedItem.current_stage,
                latest_progress: latestUpdate,
                error: updatedItem.generation_error,
                timestamp: new Date().toISOString()
              });

              // Close stream if status is terminal
              if (['published', 'failed', 'cancelled'].includes(updatedItem.status)) {
                send({
                  type: 'complete',
                  status: updatedItem.status,
                  timestamp: new Date().toISOString()
                });
                clearInterval(pollInterval);
                controller.close();
              }
            }
          } catch (error) {
            logger.error('Error polling queue status:', error);
            send({
              type: 'error',
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString()
            });
          }
        }, 2000); // Poll every 2 seconds

        // Cleanup on client disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(pollInterval);
          controller.close();
        });

        // Timeout after 10 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          send({
            type: 'timeout',
            message: 'Connection timeout after 10 minutes',
            timestamp: new Date().toISOString()
          });
          controller.close();
        }, 10 * 60 * 1000);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable buffering for nginx
      }
    });
  } catch (error) {
    logger.error('Error in SSE endpoint:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

