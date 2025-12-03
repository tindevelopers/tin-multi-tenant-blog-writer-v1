import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canTransitionQueueStatus, transitionQueueStatus, type QueueStatus } from '@/lib/blog-queue-state-machine';
import { logger } from '@/utils/logger';
import { generateSlug, calculateReadTime } from '@/lib/blog-field-validator';
import { extractExcerptFromContent, extractFeaturedImageFromContent, calculateWordCountFromContent } from '@/lib/content-extraction-utils';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import { getWebflowFieldMappings, autoDetectFieldMappings, getDefaultWebflowFieldMappings } from '@/lib/integrations/webflow-field-mapping';
import { getWebflowCollectionById } from '@/lib/integrations/webflow-api';

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

    // Use simpler query without explicit FK names to avoid constraint name mismatches
    const { data: queueItem, error } = await supabase
      .from('blog_generation_queue')
      .select(`
        *,
        post:blog_posts(post_id, title, status, content, excerpt),
        approvals:blog_approvals(*),
        publishing:blog_platform_publishing(*)
      `)
      .eq('queue_id', id)
      .eq('org_id', userProfile.org_id)
      .single();

    // Fetch created_by user separately to avoid FK constraint issues
    if (queueItem && queueItem.created_by) {
      const { data: createdByUser } = await supabase
        .from('users')
        .select('user_id, email, full_name')
        .eq('user_id', queueItem.created_by)
        .single();
      
      if (createdByUser) {
        (queueItem as any).created_by_user = createdByUser;
      }
    }

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
            // Phase 1 & 2: Extract all fields from generation response
            const title = currentItem.generated_title;
            const content = currentItem.generated_content;
            
            // Extract excerpt (from metadata or auto-extract from content)
            const excerpt = currentItem.generation_metadata?.excerpt || 
                          extractExcerptFromContent(content, 200);
            
            // Extract featured image (from metadata or auto-extract from content)
            const featuredImageFromMetadata = currentItem.generation_metadata?.featured_image_url 
              ? { url: currentItem.generation_metadata.featured_image_url, alt: currentItem.generation_metadata?.featured_image_alt_text || '' }
              : null;
            const featuredImage = featuredImageFromMetadata || extractFeaturedImageFromContent(content);
            
            // Calculate word count and read time
            const wordCount = currentItem.word_count || calculateWordCountFromContent(content);
            const readTime = calculateReadTime(wordCount);
            
            // Generate slug
            const slug = generateSlug(title);
            
            // Get author info from user profile (if available)
            const { data: authorProfile } = await supabase
              .from('users')
              .select('full_name, avatar_url, bio')
              .eq('user_id', currentItem.created_by || user.id)
              .single();
            
            // Extract SEO metadata from generation_metadata (includes Twitter OG tags, etc.)
            const seoMetadata = currentItem.generation_metadata?.seo_metadata || {};
            const structuredData = currentItem.generation_metadata?.structured_data || null;
            
            // Build comprehensive SEO data including Twitter OG tags
            const seoData = {
              ...seoMetadata,
              // Include standard SEO fields
              meta_title: currentItem.generation_metadata?.meta_title || title,
              meta_description: currentItem.generation_metadata?.meta_description || excerpt,
              // Include Twitter OG tags from API response
              twitter_card: seoMetadata.twitter_card || 'summary_large_image',
              twitter_title: seoMetadata.twitter_title || title,
              twitter_description: seoMetadata.twitter_description || excerpt,
              twitter_image: seoMetadata.twitter_image || featuredImage?.url || null,
              // Include Open Graph tags
              og_title: seoMetadata.og_title || title,
              og_description: seoMetadata.og_description || excerpt,
              og_image: seoMetadata.og_image || featuredImage?.url || null,
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
            
            // Build comprehensive metadata with all fields
            const metadata = {
              ...currentItem.generation_metadata,
              queue_id: id,
              generated_at: new Date().toISOString(),
              topic: currentItem.topic,
              keywords: currentItem.keywords,
              target_audience: currentItem.target_audience,
              tone: currentItem.tone,
              word_count: wordCount,
              read_time: readTime,
              quality_level: currentItem.quality_level,
              // Slug
              slug: slug,
              // Featured image
              featured_image: featuredImage?.url || null,
              featured_image_alt: featuredImage?.alt || null,
              featured_image_url: featuredImage?.url || null,
              featured_image_alt_text: featuredImage?.alt || null,
              // Author info
              author_name: authorProfile?.full_name || null,
              author_image: authorProfile?.avatar_url || null,
              author_bio: authorProfile?.bio || null,
              // Locale (default to 'en')
              locale: 'en',
              // Include generated images
              generated_images: currentItem.generation_metadata?.generated_images || [],
              // Include internal links
              internal_links: currentItem.generation_metadata?.internal_links || [],
              // Include content metadata (H1, H2, H3 counts, etc.)
              content_metadata: currentItem.generation_metadata?.content_metadata || {},
            };
            
            const { data: draftPost, error: draftError } = await supabase
              .from('blog_posts')
              .insert({
                org_id: userProfile.org_id,
                created_by: currentItem.created_by || user.id,
                title: title,
                content: content,
                excerpt: excerpt || null,
                status: 'draft',
                metadata: metadata,
                seo_data: seoData,
              })
              .select('post_id, title')
              .single();

            if (!draftError && draftPost) {
              logger.info('✅ Auto-created draft from queue item with all fields populated', {
                queue_id: id,
                post_id: draftPost.post_id,
                hasExcerpt: !!excerpt,
                hasFeaturedImage: !!featuredImage,
                wordCount,
                readTime,
                slug,
              });
              
              // Phase 6: Pre-populate Webflow field mappings if Webflow integration exists
              try {
                const dbAdapter = new EnvironmentIntegrationsDB();
                const integrations = await dbAdapter.getIntegrations(userProfile.org_id);
                const webflowIntegration = integrations.find(i => i.type === 'webflow' && i.status === 'active');
                
                if (webflowIntegration) {
                  logger.debug('Webflow integration found, checking field mappings', {
                    orgId: userProfile.org_id,
                    integrationId: webflowIntegration.integration_id,
                  });
                  
                  // Get Webflow collection ID from integration config
                  const collectionId = webflowIntegration.config?.collection_id as string | undefined;
                  
                  if (collectionId) {
                    try {
                      // Get API key from integration config
                      const apiKey = webflowIntegration.config?.api_key as string | undefined;
                      
                      if (apiKey) {
                        // Fetch collection schema to get available fields
                        const collection = await getWebflowCollectionById(apiKey, collectionId);
                        
                        // Get existing field mappings or use auto-detection
                        let fieldMappings = await getWebflowFieldMappings(userProfile.org_id);
                        
                        // If no custom mappings or using defaults, try auto-detection
                        const defaultMappings = getDefaultWebflowFieldMappings();
                        const isUsingDefaults = fieldMappings.length === 0 || 
                          fieldMappings.every(m => defaultMappings.find(d => d.blogField === m.blogField && d.targetField === m.targetField));
                        
                        if (isUsingDefaults && collection.fields.length > 0) {
                          logger.debug('Using default mappings, attempting auto-detection', { orgId: userProfile.org_id });
                          
                          // Prepare field slugs and type map for auto-detection
                          const availableFieldSlugs = collection.fields.map(f => f.slug);
                          const fieldTypeMap = new Map(collection.fields.map(f => [f.slug, f.type]));
                          
                          // Auto-detect field mappings
                          const autoMappings = autoDetectFieldMappings(availableFieldSlugs, fieldTypeMap);
                          
                          if (autoMappings.length > 0) {
                            fieldMappings = autoMappings;
                            logger.info('Auto-detected Webflow field mappings', {
                              orgId: userProfile.org_id,
                              mappingCount: autoMappings.length,
                            });
                          }
                        }
                        
                        // Store field mappings in draft metadata for later use during publishing
                        if (fieldMappings.length > 0) {
                          const updatedMetadata = {
                            ...metadata,
                            webflow_field_mappings: fieldMappings,
                            webflow_collection_id: collectionId,
                            webflow_integration_id: webflowIntegration.integration_id,
                          };
                          
                          // Update draft with Webflow field mappings
                          await supabase
                            .from('blog_posts')
                            .update({ metadata: updatedMetadata })
                            .eq('post_id', draftPost.post_id);
                          
                          logger.info('✅ Pre-populated Webflow field mappings in draft metadata', {
                            post_id: draftPost.post_id,
                            mappingCount: fieldMappings.length,
                            collectionId,
                          });
                        }
                      } else {
                        logger.warn('Webflow integration found but API key missing', {
                          orgId: userProfile.org_id,
                          integrationId: webflowIntegration.integration_id,
                        });
                      }
                    } catch (webflowErr) {
                      logger.warn('Error pre-populating Webflow field mappings (non-critical)', {
                        error: webflowErr instanceof Error ? webflowErr.message : 'Unknown error',
                        orgId: userProfile.org_id,
                      });
                      // Don't fail draft creation if Webflow mapping fails
                    }
                  } else {
                    logger.debug('Webflow integration found but collection_id not configured', {
                      orgId: userProfile.org_id,
                      integrationId: webflowIntegration.integration_id,
                    });
                  }
                } else {
                  logger.debug('No active Webflow integration found, skipping field mapping', {
                    orgId: userProfile.org_id,
                  });
                }
              } catch (integrationErr) {
                logger.warn('Error checking Webflow integration (non-critical)', {
                  error: integrationErr instanceof Error ? integrationErr.message : 'Unknown error',
                  orgId: userProfile.org_id,
                });
                // Don't fail draft creation if integration check fails
              }
              
              // Update queue item with post_id
              updates.post_id = draftPost.post_id;
              
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
      .select('*')
      .single();

    // Fetch created_by user separately
    if (updatedItem && updatedItem.created_by) {
      const { data: createdByUser } = await supabase
        .from('users')
        .select('user_id, email, full_name')
        .eq('user_id', updatedItem.created_by)
        .single();
      
      if (createdByUser) {
        (updatedItem as any).created_by_user = createdByUser;
      }
    }

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

