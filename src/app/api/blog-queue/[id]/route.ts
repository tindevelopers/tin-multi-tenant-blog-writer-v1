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
        
        // Auto-create draft when generation completes
        if (currentItem.generated_content && currentItem.generated_title) {
          try {
            // Extract SEO metadata from generation_metadata (includes Twitter OG tags, etc.)
            const seoMetadata = currentItem.generation_metadata?.seo_metadata || {};
            const structuredData = currentItem.generation_metadata?.structured_data || null;
            
            // Build comprehensive SEO data including Twitter OG tags
            const seoData = {
              ...seoMetadata,
              // Include standard SEO fields
              meta_title: currentItem.generation_metadata?.meta_title || currentItem.generated_title,
              meta_description: currentItem.generation_metadata?.meta_description || currentItem.generation_metadata?.excerpt || '',
              // Include Twitter OG tags from API response
              twitter_card: seoMetadata.twitter_card || 'summary_large_image',
              twitter_title: seoMetadata.twitter_title || currentItem.generated_title,
              twitter_description: seoMetadata.twitter_description || currentItem.generation_metadata?.excerpt || '',
              twitter_image: seoMetadata.twitter_image || currentItem.generation_metadata?.featured_image_url || null,
              // Include Open Graph tags
              og_title: seoMetadata.og_title || currentItem.generated_title,
              og_description: seoMetadata.og_description || currentItem.generation_metadata?.excerpt || '',
              og_image: seoMetadata.og_image || currentItem.generation_metadata?.featured_image_url || null,
              og_type: seoMetadata.og_type || 'article',
              // Include structured data
              structured_data: structuredData,
              // Include keywords and topic
              keywords: currentItem.keywords || [],
              topic: currentItem.topic,
              // Include SEO scores
              seo_score: currentItem.generation_metadata?.seo_score || null,
              readability_score: currentItem.generation_metadata?.readability_score || null,
              quality_score: currentItem.generation_metadata?.quality_score || null,
            };
            
            const { data: draftPost, error: draftError } = await supabase
              .from('blog_posts')
              .insert({
                org_id: userProfile.org_id,
                created_by: currentItem.created_by || user.id,
                title: currentItem.generated_title,
                content: currentItem.generated_content, // This is now enhanced content with Cloudinary URLs and HTML structure
                excerpt: currentItem.generation_metadata?.excerpt || null,
                status: 'draft',
                metadata: {
                  ...currentItem.generation_metadata,
                  queue_id: id,
                  generated_at: new Date().toISOString(),
                  topic: currentItem.topic,
                  keywords: currentItem.keywords,
                  target_audience: currentItem.target_audience,
                  tone: currentItem.tone,
                  word_count: currentItem.word_count,
                  quality_level: currentItem.quality_level,
                  // Include featured image metadata
                  featured_image_url: currentItem.generation_metadata?.featured_image_url || null,
                  featured_image_alt_text: currentItem.generation_metadata?.featured_image_alt_text || null,
                  // Include generated images
                  generated_images: currentItem.generation_metadata?.generated_images || [],
                  // Include internal links
                  internal_links: currentItem.generation_metadata?.internal_links || [],
                  // Include content metadata (H1, H2, H3 counts, etc.)
                  content_metadata: currentItem.generation_metadata?.content_metadata || {},
                },
                seo_data: seoData, // Comprehensive SEO data including Twitter OG tags
              })
              .select('post_id, title')
              .single();

            if (!draftError && draftPost) {
              logger.info('Auto-created draft from queue item', {
                queue_id: id,
                post_id: draftPost.post_id,
              });
              
              // Link draft to queue item in metadata
              updates.metadata = {
                ...(currentItem.metadata || {}),
                draft_post_id: draftPost.post_id,
              };
            } else if (draftError) {
              logger.error('Failed to auto-create draft', {
                queue_id: id,
                error: draftError.message,
              });
            }
          } catch (draftErr) {
            logger.error('Error auto-creating draft', {
              queue_id: id,
              error: draftErr instanceof Error ? draftErr.message : 'Unknown error',
            });
            // Don't fail the queue update if draft creation fails
          }
        }
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

    // Determine if we should hard delete or soft delete
    const unsuccessfulStatuses = ['failed', 'cancelled'];
    const isUnsuccessful = unsuccessfulStatuses.includes(currentItem.status);
    
    // Prevent deletion of published items (they should remain for audit trail)
    if (currentItem.status === 'published') {
      return NextResponse.json(
        { error: 'Cannot delete published queue items. They must remain for audit trail.' },
        { status: 400 }
      );
    }

    // Hard delete failed/cancelled items (not successfully generated)
    if (isUnsuccessful) {
      const { error: deleteError } = await supabase
        .from('blog_generation_queue')
        .delete()
        .eq('queue_id', id)
        .eq('org_id', userProfile.org_id);

      if (deleteError) {
        logger.error('Error deleting queue item:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete queue item', details: deleteError.message },
          { status: 500 }
        );
      }

      logger.info('Deleted unsuccessful queue item', {
        queue_id: id,
        status: currentItem.status,
        user_id: user.id
      });

      return NextResponse.json({
        success: true,
        message: 'Queue item deleted successfully'
      });
    }

    // Soft delete (set to cancelled) for items that are still in progress
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

