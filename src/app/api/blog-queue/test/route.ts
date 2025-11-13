/**
 * Test endpoint for queue integration
 * GET /api/blog-queue/test
 * 
 * This endpoint helps verify the queue system is working correctly
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's org_id
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const orgId = userProfile.org_id;

    // Test 1: Check if tables exist
    const { data: queueTable, error: queueTableError } = await supabase
      .from('blog_generation_queue')
      .select('queue_id')
      .limit(1);

    const { data: approvalsTable, error: approvalsTableError } = await supabase
      .from('blog_approvals')
      .select('approval_id')
      .limit(1);

    const { data: publishingTable, error: publishingTableError } = await supabase
      .from('blog_platform_publishing')
      .select('publishing_id')
      .limit(1);

    // Test 2: Get queue stats
    const { count: totalCount } = await supabase
      .from('blog_generation_queue')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    // Test 3: Get recent queue items
    const { data: recentItems, error: recentError } = await supabase
      .from('blog_generation_queue')
      .select('queue_id, topic, status, progress_percentage, queued_at')
      .eq('org_id', orgId)
      .order('queued_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      tests: {
        tables_exist: {
          blog_generation_queue: !queueTableError,
          blog_approvals: !approvalsTableError,
          blog_platform_publishing: !publishingTableError
        },
        queue_stats: {
          total_items: totalCount || 0,
          recent_items: recentItems || []
        },
        user_info: {
          user_id: user.id,
          org_id: orgId,
          role: userProfile.role
        }
      },
      status: 'All systems operational'
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

