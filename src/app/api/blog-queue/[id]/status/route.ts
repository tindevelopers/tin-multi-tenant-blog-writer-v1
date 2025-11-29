import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser } from '@/lib/api-utils';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import cloudRunHealth from '@/lib/cloud-run-health';

const API_BASE_URL = BLOG_WRITER_API_URL;
const API_KEY = process.env.BLOG_WRITER_API_KEY;

/**
 * GET /api/blog-queue/[id]/status
 * Server-Sent Events (SSE) endpoint for real-time queue status updates
 * 
 * This endpoint streams status updates for a queue item in real-time.
 * For async jobs (with backend_job_id), it also polls the backend API
 * and updates the queue when jobs complete.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const supabase = await createClient();

    // Verify queue item exists and belongs to user's org
    const { data: queueItem, error: queueError } = await supabase
      .from('blog_generation_queue')
      .select('queue_id, org_id, status, progress_percentage, current_stage, metadata')
      .eq('queue_id', id)
      .eq('org_id', user.org_id)
      .single();

    if (queueError || !queueItem) {
      return new Response('Queue item not found', { status: 404 });
    }

    // Extract backend_job_id from metadata if it exists
    const metadata = queueItem.metadata as Record<string, unknown> | null;
    const backendJobId = metadata?.backend_job_id as string | undefined;

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Send initial connection message
        const send = (data: Record<string, unknown>) => {
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
            // First, check database for updates
            const { data: updatedItem, error } = await supabase
              .from('blog_generation_queue')
              .select('status, progress_percentage, current_stage, progress_updates, generation_error, metadata, generated_content, generated_title, generation_metadata')
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
              // If we have a backend_job_id and the job is still in progress, poll the backend API
              const currentMetadata = updatedItem.metadata as Record<string, unknown> | null;
              const currentBackendJobId = currentMetadata?.backend_job_id as string | undefined;
              
              if (currentBackendJobId && ['queued', 'generating'].includes(updatedItem.status)) {
                try {
                  // Ensure Cloud Run is awake
                  const healthStatus = await cloudRunHealth.wakeUpAndWait();
                  
                  if (healthStatus.isHealthy) {
                    // Poll backend API for job status
                    const jobResponse = await fetch(`${API_BASE_URL}/api/v1/blog/jobs/${currentBackendJobId}`, {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
                      },
                    });

                    if (jobResponse.ok) {
                      const jobStatus = await jobResponse.json();
                      
                      logger.debug('📊 Backend job status:', {
                        job_id: currentBackendJobId,
                        status: jobStatus.status,
                        progress: jobStatus.progress_percentage
                      });

                      // Update queue based on backend job status
                      if (jobStatus.status === 'completed' && jobStatus.result) {
                        // Job completed - update queue with generated content
                        const result = jobStatus.result;
                        const content = result.content || result.blog_post?.content || '';
                        const title = result.title || result.blog_post?.title || updatedItem.generated_title || '';
                        const excerpt = result.excerpt || result.blog_post?.excerpt || result.meta_description || '';
                        
                        // Extract progress updates
                        const progressUpdates = (jobStatus.progress_updates || result.progress_updates || []) as Array<Record<string, unknown>>;
                        const latestProgress = progressUpdates.length > 0 
                          ? progressUpdates[progressUpdates.length - 1]
                          : null;
                        
                        // Update queue entry with generated content
                        await supabase
                          .from('blog_generation_queue')
                          .update({
                            status: 'generated',
                            generated_content: content,
                            generated_title: title,
                            generation_metadata: {
                              ...(updatedItem.generation_metadata as Record<string, unknown> || {}),
                              excerpt: excerpt,
                              meta_description: result.meta_description || excerpt,
                              seo_score: result.seo_score,
                              word_count: result.word_count,
                              quality_scores: result.quality_scores,
                              ...result
                            },
                            progress_percentage: latestProgress?.progress_percentage || 100,
                            current_stage: latestProgress?.stage || 'completed',
                            progress_updates: progressUpdates,
                            generation_completed_at: new Date().toISOString()
                          })
                          .eq('queue_id', id);
                        
                        logger.info('✅ Queue updated with completed job results', {
                          queue_id: id,
                          job_id: currentBackendJobId,
                          contentLength: content.length
                        });
                        
                        // Send completion update
                        send({
                          type: 'status_update',
                          queue_id: id,
                          status: 'generated',
                          progress_percentage: 100,
                          current_stage: 'completed',
                          latest_progress: latestProgress,
                          timestamp: new Date().toISOString()
                        });
                      } else if (jobStatus.status === 'failed') {
                        // Job failed - update queue
                        await supabase
                          .from('blog_generation_queue')
                          .update({
                            status: 'failed',
                            generation_error: jobStatus.error || jobStatus.error_message || 'Job failed',
                            generation_completed_at: new Date().toISOString()
                          })
                          .eq('queue_id', id);
                        
                        send({
                          type: 'status_update',
                          queue_id: id,
                          status: 'failed',
                          error: jobStatus.error || jobStatus.error_message,
                          timestamp: new Date().toISOString()
                        });
                      } else if (jobStatus.status === 'processing' || jobStatus.status === 'queued') {
                        // Job still in progress - update progress
                        const progressUpdates = (jobStatus.progress_updates || []) as Array<Record<string, unknown>>;
                        const latestProgress = progressUpdates.length > 0 
                          ? progressUpdates[progressUpdates.length - 1]
                          : null;
                        
                        await supabase
                          .from('blog_generation_queue')
                          .update({
                            status: 'generating',
                            progress_percentage: jobStatus.progress_percentage || latestProgress?.progress_percentage || 0,
                            current_stage: jobStatus.current_stage || latestProgress?.stage || 'processing',
                            progress_updates: progressUpdates
                          })
                          .eq('queue_id', id);
                        
                        send({
                          type: 'status_update',
                          queue_id: id,
                          status: 'generating',
                          progress_percentage: jobStatus.progress_percentage || latestProgress?.progress_percentage || 0,
                          current_stage: jobStatus.current_stage || latestProgress?.stage || 'processing',
                          latest_progress: latestProgress,
                          timestamp: new Date().toISOString()
                        });
                      }
                    }
                  }
                } catch (backendError) {
                  logger.warn('⚠️ Error polling backend job status:', {
                    error: backendError instanceof Error ? backendError.message : 'Unknown error',
                    job_id: currentBackendJobId
                  });
                  // Continue with database polling even if backend poll fails
                }
              }

              // Get latest progress update from database
              const progressUpdates = (updatedItem.progress_updates as Array<Record<string, unknown>>) || [];
              const latestUpdate = progressUpdates.length > 0 
                ? progressUpdates[progressUpdates.length - 1]
                : null;

              // Send database status update (only if we didn't just send a backend update)
              if (!currentBackendJobId || !['queued', 'generating'].includes(updatedItem.status)) {
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
              }

              // Close stream if status is terminal
              if (['generated', 'published', 'failed', 'cancelled'].includes(updatedItem.status)) {
                send({
                  type: 'complete',
                  status: updatedItem.status,
                  timestamp: new Date().toISOString()
                });
                clearInterval(pollInterval);
                controller.close();
              }
            }
          } catch (error: unknown) {
            logger.error('Error polling queue status', {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
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
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'blog-queue-status-sse',
    });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

