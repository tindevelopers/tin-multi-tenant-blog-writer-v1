import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  try {
    console.log('📝 Fetching drafts via API route');
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'draft';
    
    // Use service client for server-side operations
    const supabase = createServiceClient();
    
    // Use default system organization
    const orgId = '00000000-0000-0000-0000-000000000001';
    
    console.log('🔍 Fetching posts for org:', orgId, 'status:', status);
    
    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('org_id', orgId);
    
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch posts', details: error.message },
        { status: 500 }
      );
    }
    
    console.log('✅ Fetched posts successfully:', data?.length || 0, 'posts');
    return NextResponse.json({ success: true, data: data || [] });
    
  } catch (error) {
    console.error('❌ Error in drafts list API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

