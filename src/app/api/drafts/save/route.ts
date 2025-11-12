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
    
    const { title, content, excerpt, status = 'draft', seo_data, metadata, featured_image } = body;

    if (!title || !content) {
      console.log('❌ Missing required fields:', { title: !!title, content: !!content });
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    console.log('💾 Saving draft via API route:', title);
    console.log('📄 Content length:', content.length);

    // Extract featured image from content if not provided
    let featuredImageUrl = featured_image?.image_url || null;
    if (!featuredImageUrl && content) {
      // Try to extract from content HTML
      const imageMatch = String(content).match(/<figure[^>]*class="[^"]*featured[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>/i) ||
                       String(content).match(/<img[^>]+class="[^"]*featured[^"]*"[^>]+src="([^"]+)"[^>]*>/i);
      if (imageMatch) {
        featuredImageUrl = imageMatch[1];
        console.log('🖼️ Extracted featured image from content:', featuredImageUrl);
      }
    }

    // Build metadata object
    const finalMetadata: Record<string, unknown> = {
      ...(metadata || {}),
      ...(featuredImageUrl ? { featured_image: featuredImageUrl } : {}),
      ...(featured_image ? { 
        featured_image_data: {
          image_id: featured_image.image_id,
          image_url: featured_image.image_url,
          alt_text: featured_image.alt_text,
          width: featured_image.width,
          height: featured_image.height
        }
      } : {})
    };

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
      seo_data: seo_data || {},
      metadata: finalMetadata,
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
