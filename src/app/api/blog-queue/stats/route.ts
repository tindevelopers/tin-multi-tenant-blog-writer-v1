import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';

/**
 * GET /api/blog-queue/stats
 * Get queue statistics for the user's organization
 */
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
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const orgId = userProfile.org_id;

    // Get counts by status
    const statuses = ['queued', 'generating', 'generated', 'in_review', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'cancelled'];
    
    const stats: Record<string, number> = {};
    let total = 0;

    for (const status of statuses) {
      const { count, error } = await supabase
        .from('blog_generation_queue')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', status);

      if (!error) {
        stats[status] = count || 0;
        total += count || 0;
      }
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('blog_generation_queue')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    // Get recent activity (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { count: recentCount } = await supabase
      .from('blog_generation_queue')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', oneDayAgo.toISOString());

    // Get average generation time (for completed items)
    const { data: completedItems } = await supabase
      .from('blog_generation_queue')
      .select('generation_started_at, generation_completed_at')
      .eq('org_id', orgId)
      .eq('status', 'generated')
      .not('generation_started_at', 'is', null)
      .not('generation_completed_at', 'is', null)
      .limit(100);

    let avgGenerationTime = 0;
    if (completedItems && completedItems.length > 0) {
      const times = completedItems
        .filter(item => item.generation_started_at && item.generation_completed_at)
        .map(item => {
          const start = new Date(item.generation_started_at).getTime();
          const end = new Date(item.generation_completed_at).getTime();
          return (end - start) / 1000 / 60; // Convert to minutes
        });
      
      if (times.length > 0) {
        avgGenerationTime = times.reduce((a, b) => a + b, 0) / times.length;
      }
    }

    return NextResponse.json({
      total: totalCount || 0,
      by_status: stats,
      recent_24h: recentCount || 0,
      average_generation_time_minutes: Math.round(avgGenerationTime * 10) / 10
    });
  } catch (error) {
    logger.error('Error in GET /api/blog-queue/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

