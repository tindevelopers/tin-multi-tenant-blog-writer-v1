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
type Json = Database['public']['Tables']['blog_posts']['Row']['seo_data'];

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
 * Insert content images inline after their corresponding section headings
 * Uses position (which corresponds to heading order) to place images
 */
function insertContentImagesInline(
  content: string,
  contentImages: Array<{ url: string; alt: string; position?: number }>
): string {
  if (!contentImages || contentImages.length === 0) return content;

  // Find all h2 and h3 headings with their positions
  const headingRegex = /<(h[2-3])[^>]*>[\s\S]*?<\/\1>/gi;
  const headings: Array<{ match: string; index: number; endIndex: number }> = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({
      match: match[0],
      index: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  if (headings.length === 0) {
    // No headings found - append images at the end of content
    logger.info('No headings found, appending images at end of content');
    let result = content;
    for (const image of contentImages) {
      result += `
<figure class="content-image my-8">
  <img src="${image.url}" alt="${image.alt || 'Content image'}" class="w-full h-auto rounded-lg" />
  <figcaption class="text-sm text-gray-500 mt-2 text-center">${image.alt || ''}</figcaption>
</figure>
`;
    }
    return result;
  }

  // Sort images by position
  const sortedImages = [...contentImages].sort((a, b) => (a.position || 0) - (b.position || 0));

  // Build new content with images inserted after corresponding headings
  let result = content;
  let offset = 0; // Track offset as we insert content

  for (let i = 0; i < sortedImages.length; i++) {
    const image = sortedImages[i];
    const position = image.position !== undefined ? image.position : i;
    
    // Find the heading to insert after (use position or distribute evenly)
    const headingIndex = Math.min(position, headings.length - 1);
    const heading = headings[headingIndex];
    
    if (!heading) continue;

    // Find the end of the first paragraph after this heading
    const afterHeading = result.substring(heading.endIndex + offset);
    const firstParagraphEnd = afterHeading.match(/<\/p>/i);
    
    let insertPosition: number;
    if (firstParagraphEnd && firstParagraphEnd.index !== undefined) {
      // Insert after the first paragraph following the heading
      insertPosition = heading.endIndex + offset + firstParagraphEnd.index + 4; // +4 for </p>
    } else {
      // Insert directly after the heading
      insertPosition = heading.endIndex + offset;
    }

    const imageHtml = `
<figure class="content-image my-8">
  <img src="${image.url}" alt="${image.alt || 'Content image'}" class="w-full h-auto rounded-lg" />
  <figcaption class="text-sm text-gray-500 mt-2 text-center">${image.alt || ''}</figcaption>
</figure>
`;

    result = result.slice(0, insertPosition) + imageHtml + result.slice(insertPosition);
    offset += imageHtml.length;
  }

  return result;
}

/**
 * Update draft after Phase 2 (Image Generation) completes
 * Inserts featured image at top and content images inline after headings
 */
export async function handlePhase2Completion(
  queueId: string,
  images: {
    featured_image?: { url: string; alt: string };
    header_image?: { url: string; alt: string }; // Header image for Webflow
    thumbnail_image?: { url: string; alt: string }; // Thumbnail image for listings
    content_images?: Array<{ url: string; alt: string; position?: number }>;
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

    // Get current content
    const { data: currentPost } = await supabase
      .from('blog_posts')
      .select('content')
      .eq('post_id', queueItem.post_id)
      .single();

    let updatedContent = currentPost?.content || '';

    // 1. Insert featured image at top if not already present
    if (images.featured_image?.url || images.header_image?.url) {
      const featuredUrl = images.header_image?.url || images.featured_image?.url;
      const featuredAlt = images.header_image?.alt || images.featured_image?.alt || '';
      
      const hasFeaturedImage = /<figure[^>]*class="[^"]*featured[^"]*"/i.test(updatedContent);
      
      if (!hasFeaturedImage && featuredUrl) {
        const featuredImageHtml = `<figure class="featured-image mb-8">
  <img src="${featuredUrl}" alt="${featuredAlt}" class="w-full h-auto rounded-lg" />
</figure>
`;
        updatedContent = featuredImageHtml + updatedContent;
        logger.info('Featured image inserted at top of content');
      }
    }

    // 2. Insert content images inline after their corresponding headings
    if (images.content_images && images.content_images.length > 0) {
      updatedContent = insertContentImagesInline(updatedContent, images.content_images);
      logger.info('Content images inserted inline', {
        count: images.content_images.length,
      });
    }

    // Update draft with images in both content and metadata
    const updateData: BlogPostUpdate = {
      content: updatedContent,
      updated_at: new Date().toISOString(),
      metadata: {
        ...(queueItem.generation_metadata || {}),
        workflow_phase: 'phase_2_images',
        workflow_queue_id: queueId,
        // Featured/Header image (for Webflow header)
        featured_image: images.header_image?.url || images.featured_image?.url || null,
        featured_image_alt: images.header_image?.alt || images.featured_image?.alt || null,
        // Header image (explicit for Webflow)
        header_image: images.header_image?.url || null,
        header_image_alt: images.header_image?.alt || null,
        // Thumbnail image (for Webflow thumbnail)
        thumbnail_image: images.thumbnail_image?.url || null,
        thumbnail_image_alt: images.thumbnail_image?.alt || null,
        // Content images (keep reference in metadata too)
        content_images: images.content_images || [],
        // Flag to indicate images were inserted inline
        images_inserted_inline: true,
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
          workflow_phase: 'phase_2_images',
          featured_image_url: images.featured_image?.url || images.header_image?.url,
          featured_image_alt: images.featured_image?.alt || images.header_image?.alt,
          thumbnail_image_url: images.thumbnail_image?.url,
          content_images: images.content_images || [],
          images_inserted_inline: true,
        },
      })
      .eq('queue_id', queueId);

    logger.info('✅ Phase 2: Draft updated with inline images', {
      queueId,
      post_id: queueItem.post_id,
      hasFeaturedImage: !!(images.featured_image || images.header_image),
      hasThumbnail: !!images.thumbnail_image,
      contentImagesCount: images.content_images?.length || 0,
      imagesInsertedInline: true,
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
      } as Json,
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
      .select('metadata, status')
      .eq('queue_id', queueId)
      .single();

    if (!queueItem) return null;

    // Check metadata first
    const phaseFromMetadata = (queueItem.metadata as any)?.workflow_phase;
    if (phaseFromMetadata) {
      return phaseFromMetadata as WorkflowPhase;
    }

    // Infer phase from status
    if (queueItem.status === 'generated' || queueItem.status === 'completed') {
      // Check if we have post_id to determine if draft was created
      const { data: queueItemWithPost } = await supabase
        .from('blog_generation_queue')
        .select('post_id')
        .eq('queue_id', queueId)
        .single();
      
      if (queueItemWithPost?.post_id) {
        return 'phase_1_content'; // At least Phase 1 is done
      }
    }

    return null;
  } catch (error) {
    logger.error('Error getting workflow phase', { error, queueId });
    return null;
  }
}

