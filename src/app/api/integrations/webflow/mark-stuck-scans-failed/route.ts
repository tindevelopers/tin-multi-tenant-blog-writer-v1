/**
 * POST /api/integrations/webflow/mark-stuck-scans-failed
 * Mark scans that have been stuck in 'scanning' or 'pending' status for too long as failed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    
    // Default timeout: 10 minutes (scans stuck longer than this will be marked as failed)
    const body = await request.json().catch(() => ({}));
    const timeoutMinutes = body.timeout_minutes || 10;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const cutoffTime = new Date(Date.now() - timeoutMs).toISOString();

    logger.info('Marking stuck scans as failed', { timeoutMinutes, cutoffTime });

    // Find scans that are stuck
    const { data: stuckScans, error: findError } = await supabase
      .from('webflow_structure_scans')
      .select('scan_id, site_id, org_id, status, scan_started_at')
      .in('status', ['scanning', 'pending'])
      .lt('scan_started_at', cutoffTime);

    if (findError) {
      logger.error('Error finding stuck scans', { error: findError.message });
      return NextResponse.json(
        { error: 'Failed to find stuck scans', details: findError.message },
        { status: 500 }
      );
    }

    if (!stuckScans || stuckScans.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stuck scans found',
        marked_failed: 0,
        scans: [],
      });
    }

    // Mark all stuck scans as failed
    const scanIds = stuckScans.map(s => s.scan_id);
    const { data: updatedScans, error: updateError } = await supabase
      .from('webflow_structure_scans')
      .update({
        status: 'failed',
        error_message: `Scan was stuck in '${stuckScans[0]?.status || 'scanning'}' status for more than ${timeoutMinutes} minutes and was automatically marked as failed`,
        error_details: {
          auto_marked_failed: true,
          original_status: stuckScans[0]?.status,
          timeout_minutes: timeoutMinutes,
          cutoff_time: cutoffTime,
        },
        scan_completed_at: new Date().toISOString(),
      })
      .in('scan_id', scanIds)
      .select('scan_id, site_id, status');

    if (updateError) {
      logger.error('Error marking stuck scans as failed', { error: updateError.message });
      return NextResponse.json(
        { error: 'Failed to mark scans as failed', details: updateError.message },
        { status: 500 }
      );
    }

    logger.info('Marked stuck scans as failed', {
      count: updatedScans?.length || 0,
      scanIds: scanIds,
    });

    return NextResponse.json({
      success: true,
      message: `Marked ${updatedScans?.length || 0} stuck scan(s) as failed`,
      marked_failed: updatedScans?.length || 0,
      timeout_minutes: timeoutMinutes,
      scans: updatedScans || [],
    });
  } catch (error: any) {
    logger.error('Failed to mark stuck scans as failed', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        error: error.message || 'Failed to mark stuck scans as failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

