/**
 * Webflow Structure Scanning API
 * 
 * Endpoints for triggering and managing Webflow site structure scans
 * POST /api/integrations/webflow/scan-structure - Trigger a new scan
 * GET /api/integrations/webflow/scan-structure?site_id=xxx - Get scan status/results
 * POST /api/integrations/webflow/scan-structure?rescan=true - Trigger a rescan
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { discoverWebflowStructure } from '@/lib/integrations/webflow-structure-discovery';
import { autoDetectWebflowSiteId } from '@/lib/integrations/webflow-api';

/**
 * POST /api/integrations/webflow/scan-structure
 * Trigger a new Webflow structure scan or rescan
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const orgId = userProfile.org_id;
    const { searchParams } = new URL(request.url);
    const rescan = searchParams.get('rescan') === 'true';
    const siteId = searchParams.get('site_id');

    const body = await request.json().catch(() => ({}));
    const targetSiteId = body.site_id || siteId;

    // Get Webflow integration FIRST (before checking site_id)
    // This allows us to use site_id from integration config if not provided
    // Check for active status, but also log what we find
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('integration_id, config, metadata, status, name')
      .eq('org_id', orgId)
      .eq('type', 'webflow')
      .eq('status', 'active')
      .maybeSingle();

    if (integrationError) {
      logger.error('Error querying Webflow integration', {
        orgId,
        error: integrationError.message,
        code: integrationError.code,
      });
      return NextResponse.json(
        { 
          error: 'Failed to query Webflow integration',
          details: integrationError.message 
        },
        { status: 500 }
      );
    }

    if (!integration) {
      // Check if there are any Webflow integrations with different status
      const { data: allWebflow } = await supabase
        .from('integrations')
        .select('integration_id, status, name')
        .eq('org_id', orgId)
        .eq('type', 'webflow');
      
      logger.warn('No active Webflow integration found', {
        orgId,
        foundIntegrations: allWebflow?.length || 0,
        statuses: allWebflow?.map(i => ({ id: i.integration_id, status: i.status, name: i.name })) || [],
      });
      
      return NextResponse.json(
        { 
          error: 'No active Webflow integration found',
          hint: allWebflow && allWebflow.length > 0 
            ? `Found ${allWebflow.length} integration(s) with status: ${allWebflow.map(i => i.status).join(', ')}. Status must be 'active'.`
            : 'Please configure a Webflow integration first.'
        },
        { status: 404 }
      );
    }

    const config = integration.config as any;
    const metadata = integration.metadata as any;
    const apiToken = config?.api_key || config?.apiToken || config?.token;
    const integrationSiteId = config?.site_id || config?.siteId || metadata?.site_id;

    logger.info('Webflow integration found', {
      integrationId: integration.integration_id,
      integrationName: integration.name,
      hasApiToken: !!apiToken,
      hasSiteId: !!integrationSiteId,
      configKeys: Object.keys(config || {}),
      metadataKeys: Object.keys(metadata || {}),
    });

    if (!apiToken) {
      logger.warn('Webflow API token missing', {
        integrationId: integration.integration_id,
        configKeys: Object.keys(config || {}),
      });
      return NextResponse.json(
        { 
          error: 'Webflow API token not found in integration config',
          hint: 'Check that api_key, apiToken, or token is set in the integration config',
          integration_id: integration.integration_id,
        },
        { status: 400 }
      );
    }

    // Use provided site_id or fall back to integration's site_id
    let finalSiteId = targetSiteId || integrationSiteId;

    // If site_id is still not found, try to auto-detect it
    if (!finalSiteId) {
      logger.info('Site ID not found in config, attempting auto-detection', {
        orgId,
        integrationId: integration.integration_id,
      });
      
      try {
        // Try to get collection_id from config to improve auto-detection
        const collectionId = config?.collection_id || config?.collectionId || metadata?.collection_id;
        const detectedSiteId = await autoDetectWebflowSiteId(apiToken, collectionId || undefined);
        
        if (detectedSiteId) {
          finalSiteId = detectedSiteId;
          logger.info('Auto-detected Webflow site ID', {
            siteId: finalSiteId,
            integrationId: integration.integration_id,
          });
          
          // Store the detected site_id in the integration config for future use
          const updatedConfig = {
            ...config,
            site_id: finalSiteId,
          };
          
          await supabase
            .from('integrations')
            .update({
              config: updatedConfig,
            })
            .eq('integration_id', integration.integration_id);
          
          logger.info('Stored auto-detected site_id in integration config', {
            integrationId: integration.integration_id,
            siteId: finalSiteId,
          });
        } else {
          logger.warn('Could not auto-detect Webflow site ID', {
            orgId,
            integrationId: integration.integration_id,
          });
          return NextResponse.json(
            { 
              error: 'site_id is required',
              hint: 'Could not auto-detect site_id. Please provide site_id in request body or configure it in the Webflow integration.',
              integration_id: integration.integration_id,
            },
            { status: 400 }
          );
        }
      } catch (autoDetectError: any) {
        logger.error('Failed to auto-detect Webflow site ID', {
          error: autoDetectError.message,
          orgId,
          integrationId: integration.integration_id,
        });
        return NextResponse.json(
          { 
            error: 'site_id is required',
            hint: `Auto-detection failed: ${autoDetectError.message}. Please provide site_id in request body or configure it in the Webflow integration.`,
            integration_id: integration.integration_id,
          },
          { status: 400 }
        );
      }
    }

    // Check if there's an existing scan in progress
    if (!rescan) {
      const { data: existingScan } = await supabase
        .from('webflow_structure_scans')
        .select('scan_id, status')
        .eq('org_id', orgId)
        .eq('site_id', finalSiteId)
        .eq('status', 'scanning')
        .single();

      if (existingScan) {
        return NextResponse.json({
          success: true,
          scan_id: existingScan.scan_id,
          status: 'scanning',
          message: 'Scan already in progress',
        });
      }
    }

    // Create scan record
    const { data: scanRecord, error: scanError } = await supabase
      .from('webflow_structure_scans')
      .insert({
        org_id: orgId,
        integration_id: integration.integration_id,
        site_id: finalSiteId,
        scan_type: rescan ? 'full' : 'full',
        status: 'scanning',
        scan_started_at: new Date().toISOString(),
      })
      .select('scan_id')
      .single();

    if (scanError || !scanRecord) {
      logger.error('Failed to create scan record', { error: scanError });
      return NextResponse.json(
        { error: 'Failed to create scan record' },
        { status: 500 }
      );
    }

    const scanId = scanRecord.scan_id;

    // Perform scan asynchronously (don't await - return immediately)
    performScan(scanId, apiToken, finalSiteId, orgId).catch((error) => {
      logger.error('Scan failed', { scanId, error: error.message });
    });

    return NextResponse.json({
      success: true,
      scan_id: scanId,
      status: 'scanning',
      message: 'Scan started successfully',
      site_id: finalSiteId,
    });
  } catch (error: any) {
    logger.error('Failed to start Webflow structure scan', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to start scan' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/webflow/scan-structure?site_id=xxx&scan_id=xxx
 * Get scan status and results
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const orgId = userProfile.org_id;
    const { searchParams } = new URL(request.url);
    const scanId = searchParams.get('scan_id');
    const siteId = searchParams.get('site_id');

    if (scanId) {
      // Get specific scan
      const { data: scan, error } = await supabase
        .from('webflow_structure_scans')
        .select('*')
        .eq('scan_id', scanId)
        .eq('org_id', orgId)
        .single();

      if (error || !scan) {
        return NextResponse.json(
          { error: 'Scan not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        scan: {
          scan_id: scan.scan_id,
          site_id: scan.site_id,
          status: scan.status,
          scan_type: scan.scan_type,
          collections_count: scan.collections_count,
          static_pages_count: scan.static_pages_count,
          cms_items_count: scan.cms_items_count,
          total_content_items: scan.total_content_items,
          scan_started_at: scan.scan_started_at,
          scan_completed_at: scan.scan_completed_at,
          error_message: scan.error_message,
          existing_content: scan.existing_content,
        },
      });
    } else if (siteId) {
      // Get latest scan for site
      const { data: scans, error } = await supabase
        .from('webflow_structure_scans')
        .select('*')
        .eq('org_id', orgId)
        .eq('site_id', siteId)
        .order('scan_completed_at', { ascending: false })
        .limit(10);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch scans' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        scans: scans?.map(scan => ({
          scan_id: scan.scan_id,
          site_id: scan.site_id,
          status: scan.status,
          scan_type: scan.scan_type,
          collections_count: scan.collections_count,
          static_pages_count: scan.static_pages_count,
          cms_items_count: scan.cms_items_count,
          total_content_items: scan.total_content_items,
          scan_started_at: scan.scan_started_at,
          scan_completed_at: scan.scan_completed_at,
          error_message: scan.error_message,
        })) || [],
      });
    } else {
      // Get all scans for organization
      const { data: scans, error } = await supabase
        .from('webflow_structure_scans')
        .select('scan_id, site_id, status, scan_type, total_content_items, scan_completed_at')
        .eq('org_id', orgId)
        .order('scan_completed_at', { ascending: false })
        .limit(50);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch scans' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        scans: scans || [],
      });
    }
  } catch (error: any) {
    logger.error('Failed to get Webflow structure scans', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to get scans' },
      { status: 500 }
    );
  }
}

/**
 * Perform the actual Webflow structure scan
 */
async function performScan(
  scanId: string,
  apiToken: string,
  siteId: string,
  orgId: string
): Promise<void> {
  const supabase = await createClient();
  
  try {
    logger.info('Starting Webflow structure scan', { scanId, siteId });

    // Discover Webflow structure
    const structure = await discoverWebflowStructure(apiToken, siteId);

    // Update scan record with results
    const { error: updateError } = await supabase
      .from('webflow_structure_scans')
      .update({
        status: 'completed',
        collections: structure.collections,
        static_pages: structure.static_pages,
        existing_content: structure.existing_content,
        collections_count: structure.collections.length,
        static_pages_count: structure.static_pages.length,
        cms_items_count: structure.existing_content.filter(c => c.type === 'cms').length,
        total_content_items: structure.existing_content.length,
        scan_completed_at: new Date().toISOString(),
        next_scan_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      })
      .eq('scan_id', scanId);

    if (updateError) {
      throw new Error(`Failed to update scan record: ${updateError.message}`);
    }

    logger.info('Webflow structure scan completed', {
      scanId,
      siteId,
      collections: structure.collections.length,
      staticPages: structure.static_pages.length,
      totalContent: structure.existing_content.length,
    });
  } catch (error: any) {
    logger.error('Webflow structure scan failed', { 
      scanId, 
      siteId,
      orgId,
      error: error.message,
      stack: error.stack,
      errorType: error.constructor?.name,
    });

    // Update scan record with error
    await supabase
      .from('webflow_structure_scans')
      .update({
        status: 'failed',
        error_message: error.message,
        error_details: { stack: error.stack },
        scan_completed_at: new Date().toISOString(),
      })
      .eq('scan_id', scanId);
  }
}

