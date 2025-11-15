import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, handleApiError } from '@/lib/api-utils';

// GET - Get internal links for a post or organization
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const sourcePostId = searchParams.get('source_post_id');
    const targetPostId = searchParams.get('target_post_id');
    const linkType = searchParams.get('link_type');

    let query = supabase
      .from('internal_link_graph')
      .select(`
        *,
        source_post:blog_posts!internal_link_graph_source_post_id_fkey(post_id, title, status),
        target_post:blog_posts!internal_link_graph_target_post_id_fkey(post_id, title, status)
      `)
      .eq('org_id', userProfile.org_id);

    if (sourcePostId) {
      query = query.eq('source_post_id', sourcePostId);
    }
    if (targetPostId) {
      query = query.eq('target_post_id', targetPostId);
    }
    if (linkType) {
      query = query.eq('link_type', linkType);
    }

    const { data: links, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching internal links', { error });
      return NextResponse.json({ error: 'Failed to fetch internal links' }, { status: 500 });
    }

    return NextResponse.json({ links });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'internal-links-get',
    });
    return handleApiError(error);
  }
}

// POST - Create internal link
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const body = await request.json();
    const {
      source_post_id,
      target_post_id,
      anchor_text,
      link_context,
      link_type = 'related',
      link_position,
      is_auto_generated = false
    } = body;

    if (!source_post_id || !target_post_id || !anchor_text) {
      return NextResponse.json(
        { error: 'source_post_id, target_post_id, and anchor_text are required' },
        { status: 400 }
      );
    }

    // Verify both posts belong to the same org
    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select('post_id, org_id')
      .in('post_id', [source_post_id, target_post_id])
      .eq('org_id', userProfile.org_id);

    if (postsError || !posts || posts.length !== 2) {
      return NextResponse.json({ error: 'Invalid post IDs or posts not found' }, { status: 400 });
    }

    const linkData = {
      org_id: user.org_id,
      source_post_id,
      target_post_id,
      anchor_text,
      link_context: link_context || null,
      link_type,
      link_position: link_position || null,
      is_auto_generated,
      created_by: user.id
    };

    const { data: link, error } = await supabase
      .from('internal_link_graph')
      .insert(linkData)
      .select()
      .single();

    if (error) {
      // Check if it's a unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Link already exists' },
          { status: 409 }
        );
      }
      logger.error('Error creating internal link', { error });
      return NextResponse.json({ error: 'Failed to create internal link' }, { status: 500 });
    }

    return NextResponse.json({ link });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'internal-links-post',
    });
    return handleApiError(error);
  }
}

// DELETE - Delete internal link
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('link_id');

    if (!linkId) {
      return NextResponse.json({ error: 'link_id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('internal_link_graph')
      .delete()
      .eq('link_id', linkId)
      .eq('org_id', user.org_id);

    if (error) {
      logger.error('Error deleting internal link', { error });
      return NextResponse.json({ error: 'Failed to delete internal link' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'internal-links-delete',
    });
    return handleApiError(error);
  }
}





