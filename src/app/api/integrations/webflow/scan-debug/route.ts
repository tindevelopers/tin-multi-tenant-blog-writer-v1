/**
 * GET /api/integrations/webflow/scan-debug
 * Debug endpoint to check scan status and potential issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const scanId = searchParams.get('scan_id');

    // Get scan details
    let scan: any = null;
    if (scanId) {
      const { data, error } = await supabase
        .from('webflow_structure_scans')
        .select('*')
        .eq('scan_id', scanId)
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Scan not found', details: error.message },
          { status: 404 }
        );
      }
      scan = data;
    } else {
      // Get latest scan
      const { data: scans, error } = await supabase
        .from('webflow_structure_scans')
        .select('*')
        .order('scan_started_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !scans) {
        return NextResponse.json(
          { error: 'No scans found', details: error?.message },
          { status: 404 }
        );
      }
      scan = scans;
    }

    // Calculate how long scan has been running
    const scanStarted = scan.scan_started_at ? new Date(scan.scan_started_at) : null;
    const now = new Date();
    const durationMs = scanStarted ? now.getTime() - scanStarted.getTime() : 0;
    const durationMinutes = Math.floor(durationMs / 1000 / 60);
    const durationSeconds = Math.floor((durationMs / 1000) % 60);

    // Check if scan is stuck (running longer than 5 minutes)
    const isStuck = scan.status === 'scanning' && durationMs > 5 * 60 * 1000;

    // Analyze potential issues
    const issues: string[] = [];
    const warnings: string[] = [];

    if (scan.status === 'scanning' && durationMs > 10 * 60 * 1000) {
      issues.push(`Scan has been running for ${durationMinutes} minutes (likely stuck)`);
    }

    if (scan.status === 'failed' && scan.error_message) {
      issues.push(`Scan failed: ${scan.error_message}`);
    }

    if (scan.status === 'scanning' && !scan.scan_started_at) {
      warnings.push('Scan status is "scanning" but scan_started_at is null');
    }

    if (scan.error_details && typeof scan.error_details === 'object') {
      const errorDetails = scan.error_details as any;
      if (errorDetails.stack) {
        issues.push(`Error stack trace available: ${errorDetails.stack.substring(0, 200)}...`);
      }
      if (errorDetails.timeout) {
        issues.push('Scan timed out');
      }
    }

    // Check integration
    let integration: any = null;
    if (scan.integration_id) {
      const { data: intData } = await supabase
        .from('integrations')
        .select('integration_id, type, status, config, metadata')
        .eq('integration_id', scan.integration_id)
        .single();
      integration = intData;

      if (!integration) {
        warnings.push('Integration not found for this scan');
      } else if (integration.status !== 'active') {
        warnings.push(`Integration status is "${integration.status}" (should be "active")`);
      }
    }

    return NextResponse.json({
      success: true,
      scan: {
        scan_id: scan.scan_id,
        site_id: scan.site_id,
        status: scan.status,
        scan_type: scan.scan_type,
        scan_started_at: scan.scan_started_at,
        scan_completed_at: scan.scan_completed_at,
        duration: {
          minutes: durationMinutes,
          seconds: durationSeconds,
          total_ms: durationMs,
        },
        is_stuck: isStuck,
        collections_count: scan.collections_count || 0,
        static_pages_count: scan.static_pages_count || 0,
        cms_items_count: scan.cms_items_count || 0,
        total_content_items: scan.total_content_items || 0,
        error_message: scan.error_message,
        error_details: scan.error_details,
      },
      integration: integration ? {
        integration_id: integration.integration_id,
        type: integration.type,
        status: integration.status,
        has_api_key: !!(integration.config?.api_key || integration.config?.apiToken),
        has_site_id: !!(integration.config?.site_id || integration.metadata?.site_id),
      } : null,
      analysis: {
        issues,
        warnings,
        recommendations: [
          ...(isStuck ? ['Consider marking this scan as failed and retrying'] : []),
          ...(scan.status === 'failed' ? ['Check error_message and error_details for specific failure reason'] : []),
          ...(scan.status === 'scanning' && durationMs < 5 * 60 * 1000 ? ['Scan is still running, wait for completion'] : []),
        ],
      },
    });
  } catch (error: any) {
    logger.error('Failed to debug scan', { error: error.message, stack: error.stack });
    return NextResponse.json(
      {
        error: error.message || 'Failed to debug scan',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

