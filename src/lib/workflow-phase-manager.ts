/**
 * Workflow Phase Manager
 * 
 * Manages staged progression of multi-phase blog generation workflow:
 * - Phase 1: Content Generation → Auto-create draft
 * - Phase 2: Image Generation → Update draft with images
 * - Phase 3: Content Enhancement → Update draft with enhanced metadata
 * 
 * Allows users to resume workflow from any phase
 */

import { createServiceClient } from '@/lib/supabase/service';
import { logger } from '@/utils/logger';
import type { Database } from '@/types/database';

type BlogPostUpdate = Database['public']['Tables']['blog_posts']['Update'];

export type WorkflowPhase = 'phase_1_content' | 'phase_2_images' | 'phase_3_enhancement' | 'completed';

export interface PhaseCompletionResult {
  success: boolean;
  phase: WorkflowPhase;
  post_id?: string;
  draft_updated?: boolean;
  error?: string;
}

/**
 * Create or update draft after Phase 1 (Content Generation) completes
 */
export async function handlePhase1Completion(
  queueId: string,
  content: {
    title: string;
    content: string;
    excerpt?: string;
    word_count?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<PhaseCompletionResult> {
  try {
    const supabase = createServiceClient();
    
    // Get queue item
    const { data: queueItem, error: queueError } = await supabase
      .from('blog_generation_queue')
      .select('post_id, org_id, created_by, topic, keywords, generation_metadata')
      .eq('queue_id', queueId)
      .single();

    if (queueError || !queueItem) {
      throw new Error(`Queue item not found: ${queueError?.message || 'Unknown error'}`);
    }

    const orgId = queueItem.org_id;
    const existingPostId = queueItem.post_id;

    // Build draft data
    const draftData: BlogPostUpdate = {
      title: content.title,
      content: content.content,
      excerpt: content.excerpt || null,
      updated_at: new Date().toISOString(),
      metadata: {
        ...(queueItem.generation_metadata || {}),
        workflow_phase: 'phase_1_content',
        workflow_queue_id: queueId,
        word_count: content.word_count,
        ...(content.metadata || {}),
      },
      seo_data: {
        meta_title: content.title,
        meta_description: content.excerpt || content.content.substring(0, 160),
        keywords: queueItem.keywords || [],
      },
    };

    if (existingPostId) {
      // Update existing draft
      const { data: updatedPost, error: updateError } = await supabase
        .from('blog_posts')
        .update(draftData)
        .eq('post_id', existingPostId)
        .select('post_id')
        .single();

      if (updateError) {
        throw new Error(`Failed to update draft: ${updateError.message}`);
      }

      // Update queue metadata
      await supabase
        .from('blog_generation_queue')
        .update({
          metadata: {
            ...(queueItem.generation_metadata || {}),
            workflow_phase: 'phase_1_content',
            draft_post_id: existingPostId,
          },
        })
        .eq('queue_id', queueId);

      logger.info('✅ Phase 1: Draft updated', { queueId, post_id: existingPostId });

      return {
        success: true,
        phase: 'phase_1_content',
        post_id: existingPostId,
        draft_updated: true,
      };
    } else {
      // Create new draft
      const { data: newPost, error: createError } = await supabase
        .from('blog_posts')
        .insert({
          org_id: orgId,
          created_by: queueItem.created_by,
          title: content.title,
          content: content.content,
          excerpt: content.excerpt || null,
          status: 'draft',
          metadata: draftData.metadata,
          seo_data: draftData.seo_data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('post_id')
        .single();

      if (createError) {
        throw new Error(`Failed to create draft: ${createError.message}`);
      }

      // Update queue with post_id
      await supabase
        .from('blog_generation_queue')
        .update({
          post_id: newPost.post_id,
          metadata: {
            ...(queueItem.generation_metadata || {}),
            workflow_phase: 'phase_1_content',
            draft_post_id: newPost.post_id,
          },
        })
        .eq('queue_id', queueId);

      logger.info('✅ Phase 1: Draft created', { queueId, post_id: newPost.post_id });

      return {
        success: true,
        phase: 'phase_1_content',
        post_id: newPost.post_id,
        draft_updated: false,
      };
    }
  } catch (error: any) {
    logger.error('❌ Phase 1 completion error', {
      queueId,
      error: error.message,
    });
    return {
      success: false,
      phase: 'phase_1_content',
      error: error.message,
    };
  }
}

/**
 * Update draft after Phase 2 (Image Generation) completes
 */
export async function handlePhase2Completion(
  queueId: string,
  images: {
    featured_image?: { url: string; alt: string };
    content_images?: Array<{ url: string; alt: string }>;
  }
): Promise<PhaseCompletionResult> {
  try {
    const supabase = createServiceClient();
    
    // Get queue item
    const { data: queueItem, error: queueError } = await supabase
      .from('blog_generation_queue')
      .select('post_id, generation_metadata')
      .eq('queue_id', queueId)
      .single();

    if (queueError || !queueItem) {
      throw new Error(`Queue item not found: ${queueError?.message || 'Unknown error'}`);
    }

    if (!queueItem.post_id) {
      throw new Error('Draft not found. Phase 1 must complete first.');
    }

    // Update draft with images
    const updateData: BlogPostUpdate = {
      updated_at: new Date().toISOString(),
      metadata: {
        ...(queueItem.generation_metadata || {}),
        workflow_phase: 'phase_2_images',
        workflow_queue_id: queueId,
        featured_image: images.featured_image?.url || null,
        featured_image_alt: images.featured_image?.alt || null,
        content_images: images.content_images || [],
      },
    };

    // Update featured image in content if provided
    if (images.featured_image?.url) {
      // Get current content
      const { data: currentPost } = await supabase
        .from('blog_posts')
        .select('content')
        .eq('post_id', queueItem.post_id)
        .single();

      if (currentPost?.content) {
        // Check if featured image already exists in content
        const hasFeaturedImage = /<figure[^>]*class="[^"]*featured[^"]*"/i.test(currentPost.content);
        
        if (!hasFeaturedImage) {
          // Prepend featured image to content
          const featuredImageHtml = `
<figure class="featured-image">
  <img src="${images.featured_image.url}" alt="${images.featured_image.alt || ''}" />
</figure>
`;
          updateData.content = featuredImageHtml + currentPost.content;
        }
      }
    }

    const { error: updateError } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('post_id', queueItem.post_id);

    if (updateError) {
      throw new Error(`Failed to update draft: ${updateError.message}`);
    }

    // Update queue metadata
    await supabase
      .from('blog_generation_queue')
      .update({
        metadata: {
          ...(queueItem.generation_metadata || {}),
          workflow_phase: 'phase_2_images',
          featured_image_url: images.featured_image?.url,
          featured_image_alt: images.featured_image?.alt,
        },
      })
      .eq('queue_id', queueId);

    logger.info('✅ Phase 2: Draft updated with images', {
      queueId,
      post_id: queueItem.post_id,
      hasFeaturedImage: !!images.featured_image,
      contentImagesCount: images.content_images?.length || 0,
    });

    return {
      success: true,
      phase: 'phase_2_images',
      post_id: queueItem.post_id,
      draft_updated: true,
    };
  } catch (error: any) {
    logger.error('❌ Phase 2 completion error', {
      queueId,
      error: error.message,
    });
    return {
      success: false,
      phase: 'phase_2_images',
      error: error.message,
    };
  }
}

/**
 * Update draft after Phase 3 (Content Enhancement) completes
 */
export async function handlePhase3Completion(
  queueId: string,
  enhancements: {
    seo_title?: string;
    meta_description?: string;
    excerpt?: string;
    slug?: string;
    structured_data?: Record<string, unknown>;
    seo_score?: number;
    readability_score?: number;
  }
): Promise<PhaseCompletionResult> {
  try {
    const supabase = createServiceClient();
    
    // Get queue item
    const { data: queueItem, error: queueError } = await supabase
      .from('blog_generation_queue')
      .select('post_id, generation_metadata')
      .eq('queue_id', queueId)
      .single();

    if (queueError || !queueItem) {
      throw new Error(`Queue item not found: ${queueError?.message || 'Unknown error'}`);
    }

    if (!queueItem.post_id) {
      throw new Error('Draft not found. Phase 1 must complete first.');
    }

    // Update draft with enhancements
    const updateData: BlogPostUpdate = {
      updated_at: new Date().toISOString(),
      excerpt: enhancements.excerpt || null,
      metadata: {
        ...(queueItem.generation_metadata || {}),
        workflow_phase: 'phase_3_enhancement',
        workflow_queue_id: queueId,
        slug: enhancements.slug,
        structured_data: enhancements.structured_data,
        seo_score: enhancements.seo_score,
        readability_score: enhancements.readability_score,
      },
      seo_data: {
        meta_title: enhancements.seo_title,
        meta_description: enhancements.meta_description,
        structured_data: enhancements.structured_data,
      },
    };

    const { error: updateError } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('post_id', queueItem.post_id);

    if (updateError) {
      throw new Error(`Failed to update draft: ${updateError.message}`);
    }

    // Update queue metadata
    await supabase
      .from('blog_generation_queue')
      .update({
        metadata: {
          ...(queueItem.generation_metadata || {}),
          workflow_phase: 'phase_3_enhancement',
        },
      })
      .eq('queue_id', queueId);

    logger.info('✅ Phase 3: Draft updated with enhancements', {
      queueId,
      post_id: queueItem.post_id,
      hasSeoTitle: !!enhancements.seo_title,
      hasStructuredData: !!enhancements.structured_data,
    });

    return {
      success: true,
      phase: 'phase_3_enhancement',
      post_id: queueItem.post_id,
      draft_updated: true,
    };
  } catch (error: any) {
    logger.error('❌ Phase 3 completion error', {
      queueId,
      error: error.message,
    });
    return {
      success: false,
      phase: 'phase_3_enhancement',
      error: error.message,
    };
  }
}

/**
 * Get current workflow phase from queue item
 */
export async function getWorkflowPhase(queueId: string): Promise<WorkflowPhase | null> {
  try {
    const supabase = createServiceClient();
    const { data: queueItem } = await supabase
      .from('blog_generation_queue')
      .select('metadata')
      .eq('queue_id', queueId)
      .single();

    return (queueItem?.metadata as any)?.workflow_phase || null;
  } catch {
    return null;
  }
}

