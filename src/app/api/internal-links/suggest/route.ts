import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';

// GET - Suggest internal links for a post based on content and existing links
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's org_id
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('post_id');
    const content = searchParams.get('content');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!postId) {
      return NextResponse.json({ error: 'post_id is required' }, { status: 400 });
    }

    // Get the current post
    const { data: currentPost, error: postError } = await supabase
      .from('blog_posts')
      .select('post_id, title, content, org_id')
      .eq('post_id', postId)
      .eq('org_id', userProfile.org_id)
      .single();

    if (postError || !currentPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Get all published posts from the same organization (excluding current post)
    const { data: availablePosts, error: postsError } = await supabase
      .from('blog_posts')
      .select('post_id, title, content, excerpt, status')
      .eq('org_id', userProfile.org_id)
      .neq('post_id', postId)
      .in('status', ['published', 'draft'])
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(50); // Get more posts for better matching

    if (postsError) {
      logger.error('Error fetching available posts:', postsError);
      return NextResponse.json({ error: 'Failed to fetch available posts' }, { status: 500 });
    }

    // Get existing links for this post
    const { data: existingLinks, error: linksError } = await supabase
      .from('internal_link_graph')
      .select('target_post_id')
      .eq('source_post_id', postId);

    const linkedPostIds = new Set(existingLinks?.map(link => link.target_post_id) || []);

    // Simple keyword-based matching (can be enhanced with NLP)
    const postContent = content || currentPost.content || '';
    const contentWords = new Set<string>(
      postContent
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((word: string) => word.length > 3)
    );

    // Score and rank potential links
    const suggestions = (availablePosts || [])
      .filter(post => !linkedPostIds.has(post.post_id))
      .map(post => {
        const postTitle = (post.title || '').toLowerCase();
        const postContent = (post.content || post.excerpt || '').toLowerCase();
        const postText = `${postTitle} ${postContent}`;
        const postWords = new Set<string>(
          postText
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter((word: string) => word.length > 3)
        );

        // Calculate similarity score
        let score = 0;
        contentWords.forEach(word => {
          if (postWords.has(word)) {
            score += 1;
          }
        });

        // Boost score if title words match
        const titleWords = postTitle.split(/\s+/).filter((w: string) => w.length > 3);
        titleWords.forEach((word: string) => {
          if (contentWords.has(word)) {
            score += 2; // Title matches are more valuable
          }
        });

        return {
          post_id: post.post_id,
          title: post.title,
          excerpt: post.excerpt,
          score,
          suggested_anchor_text: post.title,
          link_type: 'related'
        };
      })
      .filter(suggestion => suggestion.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return NextResponse.json({ suggestions });
  } catch (error) {
    logger.error('Error in GET /api/internal-links/suggest:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


