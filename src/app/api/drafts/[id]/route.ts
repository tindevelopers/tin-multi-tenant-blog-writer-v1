import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    console.log('📝 Fetching draft:', draftId);

    // Fetch the draft
    const { data: draft, error: draftError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', draftId)
      .eq('created_by', user.id)
      .single();

    if (draftError) {
      console.error('❌ Error fetching draft:', draftError);
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    console.log('✅ Draft fetched successfully:', draft.title);
    return NextResponse.json({ data: draft });

  } catch (error) {
    console.error('❌ Error in GET /api/drafts/[id]:', error);
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
    const { title, content, excerpt, status } = body;

    console.log('📝 Updating draft:', draftId);

    // Update the draft
    const { data: updatedDraft, error: updateError } = await supabase
      .from('blog_posts')
      .update({
        title,
        content,
        excerpt,
        status: status || 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', draftId)
      .eq('created_by', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating draft:', updateError);
      return NextResponse.json({ error: 'Failed to update draft' }, { status: 400 });
    }

    console.log('✅ Draft updated successfully:', updatedDraft.title);
    return NextResponse.json({ data: updatedDraft });

  } catch (error) {
    console.error('❌ Error in PUT /api/drafts/[id]:', error);
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
    console.log('📝 Deleting draft:', draftId);

    // Delete the draft
    const { error: deleteError } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', draftId)
      .eq('created_by', user.id);

    if (deleteError) {
      console.error('❌ Error deleting draft:', deleteError);
      return NextResponse.json({ error: 'Failed to delete draft' }, { status: 400 });
    }

    console.log('✅ Draft deleted successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Error in DELETE /api/drafts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
