import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { Database } from '@/types/database';

type BlogPostInsert = Database['public']['Tables']['blog_posts']['Insert'];

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 API route /api/drafts/save called');
    const body = await request.json();
    console.log('📝 Request body:', { 
      title: body.title, 
      contentLength: body.content?.length, 
      excerpt: body.excerpt,
      status: body.status 
    });
    
    const { title, content, excerpt, status = 'draft' } = body;

    if (!title || !content) {
      console.log('❌ Missing required fields:', { title: !!title, content: !!content });
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    console.log('💾 Saving draft via API route:', title);
    console.log('📄 Content length:', content.length);

    // Use service client for server-side operations
    console.log('🔧 Creating service client...');
    const supabase = createServiceClient();
    console.log('✅ Service client created');
    
    // Use default system values
    const orgId = '00000000-0000-0000-0000-000000000001';
    const userId = '00000000-0000-0000-0000-000000000002';
    console.log('🏢 Using orgId:', orgId, 'userId:', userId);

    const draftData: BlogPostInsert = {
      org_id: orgId,
      // created_by: userId, // Leave null for system-created posts
      title,
      content,
      excerpt: excerpt || '',
      status: status as 'draft' | 'published' | 'scheduled' | 'archived',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('📝 Inserting draft data:', {
      title: draftData.title,
      contentLength: draftData.content?.length || 0,
      orgId: draftData.org_id,
      userId: draftData.created_by
    });

    console.log('📝 Inserting draft data:', {
      title: draftData.title,
      contentLength: draftData.content?.length || 0,
      orgId: draftData.org_id,
      userId: draftData.created_by
    });

    const { data, error } = await supabase
      .from('blog_posts')
      .insert(draftData)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { error: 'Failed to save draft', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Draft saved successfully:', data.id);
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
