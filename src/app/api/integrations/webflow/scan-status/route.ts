/**
 * GET /api/integrations/webflow/scan-status
 * Get scan status summary for debugging
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    
    // Get all recent scans ordered by completion time
    const { data: scans, error } = await supabase
      .from('webflow_structure_scans')
      .select('*')
      .order('scan_completed_at', { ascending: false })
      .order('scan_started_at', { ascending: false })
      .limit(20);

    if (error) {
      logger.error('Error querying scans', { error: error.message });
      return NextResponse.json(
        { error: 'Failed to query scans', details: error.message },
        { status: 500 }
      );
    }

    if (!scans || scans.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        scans: [],
        summary: {
          completed: 0,
          failed: 0,
          in_progress: 0,
        },
        message: 'No scans found in database',
      });
    }

    // Calculate summary
    const completed = scans.filter(s => s.status === 'completed').length;
    const failed = scans.filter(s => s.status === 'failed').length;
    const inProgress = scans.filter(s => s.status === 'scanning' || s.status === 'pending').length;

    // Format scans for response
    const formattedScans = scans.map(scan => ({
      scan_id: scan.scan_id,
      site_id: scan.site_id,
      status: scan.status,
      scan_type: scan.scan_type,
      collections_count: scan.collections_count || 0,
      static_pages_count: scan.static_pages_count || 0,
      cms_items_count: scan.cms_items_count || 0,
      total_content_items: scan.total_content_items || 0,
      scan_started_at: scan.scan_started_at,
      scan_completed_at: scan.scan_completed_at,
      error_message: scan.error_message,
      // Include sample content items for completed scans
      sample_content: scan.status === 'completed' && scan.existing_content && Array.isArray(scan.existing_content)
        ? scan.existing_content.slice(0, 10).map((item: any) => ({
            type: item.type,
            title: item.title,
            url: item.url,
            slug: item.slug,
          }))
        : [],
    }));

    const latestScan = scans[0];

    return NextResponse.json({
      success: true,
      count: scans.length,
      scans: formattedScans,
      summary: {
        completed,
        failed,
        in_progress: inProgress,
      },
      latest_scan: {
        scan_id: latestScan.scan_id,
        site_id: latestScan.site_id,
        status: latestScan.status,
        collections_count: latestScan.collections_count || 0,
        static_pages_count: latestScan.static_pages_count || 0,
        cms_items_count: latestScan.cms_items_count || 0,
        total_content_items: latestScan.total_content_items || 0,
        scan_started_at: latestScan.scan_started_at,
        scan_completed_at: latestScan.scan_completed_at,
        error_message: latestScan.error_message,
        is_successful: latestScan.status === 'completed' && (latestScan.total_content_items || 0) > 0,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get scan status', { error: error.message, stack: error.stack });
    return NextResponse.json(
      { 
        error: error.message || 'Failed to get scan status',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

