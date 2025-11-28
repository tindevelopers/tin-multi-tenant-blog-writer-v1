import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: draftId } = await params;
    logger.debug('📝 Fetching draft:', draftId);
    logger.debug('👤 Current user ID:', user.id);

    // Fetch the draft - RLS policies will ensure user can only access their org's posts
    const { data: draft, error: draftError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('post_id', draftId)
      .single();

    if (draftError) {
      logger.error('❌ Error fetching draft:', draftError);
      logger.error('❌ Error details:', JSON.stringify(draftError, null, 2));
      
      // Provide more specific error messages
      if (draftError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Draft not found',
          details: 'The draft does not exist or you do not have permission to access it'
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch draft',
        details: draftError.message 
      }, { status: 404 });
    }

    logger.debug('✅ Draft fetched successfully:', draft.title);
    return NextResponse.json({ data: draft });

  } catch (error) {
    logger.error('❌ Error in GET /api/drafts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: draftId } = await params;
    const body = await request.json();
    const { 
      title, 
      content, 
      excerpt, 
      status, 
      metadata, 
      seo_data, 
      published_at 
    } = body as {
      title?: string;
      content?: string;
      excerpt?: string;
      status?: 'draft' | 'published' | 'scheduled' | 'archived';
      metadata?: Record<string, unknown>;
      seo_data?: Record<string, unknown>;
      published_at?: string | null;
    };

    logger.debug('📝 Updating draft:', draftId);

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (excerpt !== undefined) updates.excerpt = excerpt;
    if (status) updates.status = status;
    if (metadata !== undefined) updates.metadata = metadata;
    if (seo_data !== undefined) updates.seo_data = seo_data;
    if (published_at !== undefined) updates.published_at = published_at;

    // Update the draft - RLS policies will ensure user can only update their org's posts
    const { data: updatedDraft, error: updateError } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('post_id', draftId)
      .select()
      .single();

    if (updateError) {
      logger.error('❌ Error updating draft:', updateError);
      return NextResponse.json({ error: 'Failed to update draft' }, { status: 400 });
    }

    logger.debug('✅ Draft updated successfully:', updatedDraft.title);
    return NextResponse.json({ data: updatedDraft });

  } catch (error) {
    logger.error('❌ Error in PUT /api/drafts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: draftId } = await params;
    logger.debug('📝 Deleting draft:', draftId);

    // Delete the draft - RLS policies will ensure user can only delete their org's posts
    const { error: deleteError } = await supabase
      .from('blog_posts')
      .delete()
      .eq('post_id', draftId);

    if (deleteError) {
      logger.error('❌ Error deleting draft:', deleteError);
      return NextResponse.json({ error: 'Failed to delete draft' }, { status: 400 });
    }

    logger.debug('✅ Draft deleted successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('❌ Error in DELETE /api/drafts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
