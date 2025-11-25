import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import type { Database } from '@/types/database';

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
    const { content, title, excerpt, queue_item_id } = body;

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

    const supabase = createServiceClient();
    const userSupabase = await createClient();

    // Get current user for created_by
    const { data: { user } } = await userSupabase.auth.getUser();
    const userId = user?.id || null;

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

    // Build metadata with edit history
    const metadata: Record<string, unknown> = {
      queue_id: queueId,
      last_edited_at: new Date().toISOString(),
      ...(userId ? { last_edited_by: userId } : {}),
      auto_saved: true,
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
        metadata: metadata as Database['public']['Tables']['blog_posts']['Row']['metadata'],
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
        metadata: metadata as Database['public']['Tables']['blog_posts']['Row']['metadata'],
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
      await supabase
        .from('blog_generation_queue')
        .update({ post_id: newPost.post_id })
        .eq('queue_id', queueId);

      result = newPost;
      logger.debug('✅ Draft created successfully', { postId: newPost.post_id });
    }

    return NextResponse.json({
      success: true,
      data: result,
      post_id: result.post_id,
    });
  } catch (error) {
    logger.error('❌ Error in save-content:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

