import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import type { Database } from '@/types/database';
import { generateSlug, calculateReadTime } from '@/lib/blog-field-validator';

type BlogPostInsert = Database['public']['Tables']['blog_posts']['Insert'];
type BlogPostUpdate = Database['public']['Tables']['blog_posts']['Update'];

/**
 * Save or update blog content from queue item
 * This endpoint handles auto-saving edited content
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: queueId } = await params;
    const body = await request.json();
    const { 
      content, 
      title, 
      excerpt, 
      queue_item_id,
      // Additional fields for complete blog creation
      slug,
      author_name,
      author_image,
      author_bio,
      thumbnail_image,
      thumbnail_image_alt,
      locale,
      is_featured,
      published_at,
      seo_data,
      metadata,
      word_count,
    } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    logger.debug('💾 Saving content from queue item', {
      queueId,
      contentLength: content?.length,
      title,
    });

    // Use service client to bypass RLS - this is necessary for system operations
    const supabase = createServiceClient();
    
    // Try to get authenticated user, but don't fail if not available
    let userId: string | null = null;
    try {
      const userSupabase = await createClient();
      const { data: { user } } = await userSupabase.auth.getUser();
      userId = user?.id || null;
    } catch (authError) {
      logger.warn('Could not get authenticated user, proceeding with system user', {
        error: authError instanceof Error ? authError.message : 'Unknown error'
      });
    }

    // Get queue item to check if post_id exists
    const { data: queueItem, error: queueError } = await supabase
      .from('blog_generation_queue')
      .select('post_id, topic, generated_title, org_id')
      .eq('queue_id', queueId)
      .single();

    if (queueError) {
      logger.error('❌ Error fetching queue item:', queueError);
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    const orgId = queueItem.org_id || '00000000-0000-0000-0000-000000000001';
    const postId = queueItem.post_id;
    const finalTitle = title || queueItem.generated_title || queueItem.topic || 'Untitled';
    const finalSlug = slug || generateSlug(finalTitle);
    const finalWordCount = word_count || (content ? content.split(/\s+/).filter(w => w.length > 0).length : 0);
    const readTime = finalWordCount ? calculateReadTime(finalWordCount) : null;

    // Build comprehensive metadata with all fields
    const finalMetadata: Record<string, unknown> = {
      queue_id: queueId,
      last_edited_at: new Date().toISOString(),
      ...(userId ? { last_edited_by: userId } : {}),
      auto_saved: true,
      // Include all configured fields
      slug: finalSlug,
      ...(featured_image ? { featured_image } : {}),
      ...(featured_image_alt ? { featured_image_alt } : {}),
      ...(thumbnail_image ? { thumbnail_image } : {}),
      ...(thumbnail_image_alt ? { thumbnail_image_alt } : {}),
      ...(author_name ? { author_name } : {}),
      ...(author_image ? { author_image } : {}),
      ...(author_bio ? { author_bio } : {}),
      locale: locale || 'en',
      ...(is_featured !== undefined ? { is_featured } : {}),
      ...(readTime ? { read_time: readTime } : {}),
      word_count: finalWordCount,
      ...(published_at ? { published_at } : {}),
      // Merge with any existing metadata
      ...(metadata || {}),
    };

    // Build comprehensive SEO data
    const finalSeoData: Record<string, unknown> = {
      ...(seo_data || {}),
      meta_title: seo_data?.meta_title || finalTitle,
      meta_description: seo_data?.meta_description || excerpt || '',
    };

    let result;

    if (postId) {
      // Update existing post
      logger.debug('📝 Updating existing blog post', { postId });

      const updateData: BlogPostUpdate = {
        content,
        title: finalTitle,
        excerpt: excerpt || null,
        updated_at: new Date().toISOString(),
        seo_data: finalSeoData as Database['public']['Tables']['blog_posts']['Row']['seo_data'],
        metadata: finalMetadata as Database['public']['Tables']['blog_posts']['Row']['metadata'],
        published_at: published_at || null,
      };

      const { data: updatedPost, error: updateError } = await supabase
        .from('blog_posts')
        .update(updateData)
        .eq('post_id', postId)
        .select()
        .single();

      if (updateError) {
        logger.error('❌ Error updating post:', updateError);
        return NextResponse.json(
          { error: 'Failed to update post', details: updateError.message },
          { status: 500 }
        );
      }

      result = updatedPost;
      logger.debug('✅ Post updated successfully', { postId });
    } else {
      // Create new draft
      logger.debug('📝 Creating new blog post draft');

      const insertData: BlogPostInsert = {
        org_id: orgId,
        created_by: userId,
        title: finalTitle,
        content,
        excerpt: excerpt || null,
        status: 'draft',
        seo_data: finalSeoData as Database['public']['Tables']['blog_posts']['Row']['seo_data'],
        metadata: finalMetadata as Database['public']['Tables']['blog_posts']['Row']['metadata'],
        published_at: published_at || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newPost, error: insertError } = await supabase
        .from('blog_posts')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        logger.error('❌ Error creating post:', insertError);
        return NextResponse.json(
          { error: 'Failed to create post', details: insertError.message },
          { status: 500 }
        );
      }

      // Update queue item with post_id
      const { error: queueUpdateError } = await supabase
        .from('blog_generation_queue')
        .update({ post_id: newPost.post_id })
        .eq('queue_id', queueId);

      if (queueUpdateError) {
        logger.warn('⚠️ Failed to update queue item with post_id (non-critical):', {
          queueId,
          postId: newPost.post_id,
          error: queueUpdateError.message
        });
        // Don't fail the save if queue update fails
      } else {
        logger.debug('✅ Queue item updated with post_id', {
          queueId,
          postId: newPost.post_id
        });
      }

      result = newPost;
    }

    logger.debug('✅ Content saved successfully', {
      queueId,
      postId: result.post_id,
      wasUpdate: !!postId,
      wasCreate: !postId,
      contentLength: content.length,
      title: finalTitle,
    });

    return NextResponse.json({
      success: true,
      post_id: result.post_id,
      data: {
        post_id: result.post_id,
        title: result.title,
        content: result.content,
        updated_at: result.updated_at,
      },
    });
  } catch (error) {
    logger.error('❌ Error in save-content:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

