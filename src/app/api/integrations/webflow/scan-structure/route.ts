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
import { createServiceClient } from '@/lib/supabase/service';
import { logger } from '@/utils/logger';
import { discoverWebflowStructure } from '@/lib/integrations/webflow-structure-discovery';
import { autoDetectWebflowSiteId } from '@/lib/integrations/webflow-api';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';

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

    // Get Webflow integration using EnvironmentIntegrationsDB adapter
    // This handles environment-specific tables and uses service client (avoids schema cache issues)
    let integration: any = null;
    
    try {
      // Use EnvironmentIntegrationsDB adapter (handles environment tables and uses service client)
      const dbAdapter = new EnvironmentIntegrationsDB();
      const allIntegrations = await dbAdapter.getIntegrations(orgId);
      
      // Find active Webflow integration
      integration = allIntegrations.find(
        (int: any) => int.type === 'webflow' && int.status === 'active'
      );
      
      if (integration) {
        logger.info('Found Webflow integration via EnvironmentIntegrationsDB', {
          integrationId: integration.id || integration.integration_id,
          orgId,
        });
      }
    } catch (adapterError: any) {
      logger.error('EnvironmentIntegrationsDB failed', {
        error: adapterError.message,
        orgId,
        stack: adapterError.stack,
      });
      
      // Fallback: Try direct query with service client (unified table)
      try {
        const serviceClient = createServiceClient();
        const result = await serviceClient
          .from('integrations')
          .select('integration_id, config, metadata, status, name')
          .eq('org_id', orgId)
          .eq('type', 'webflow')
          .eq('status', 'active')
          .maybeSingle();
        
        if (!result.error && result.data) {
          integration = result.data;
          logger.info('Found Webflow integration via service client fallback', {
            integrationId: integration.integration_id,
            orgId,
          });
        } else if (result.error) {
          logger.error('Service client query failed', {
            error: result.error.message,
            code: result.error.code,
            orgId,
          });
        }
      } catch (directError: any) {
        logger.error('Direct query also failed', {
          error: directError.message,
          orgId,
        });
      }
    }

    if (!integration) {
      // Try to get all Webflow integrations to provide helpful error message
      let allWebflow: any[] = [];
      try {
        const dbAdapter = new EnvironmentIntegrationsDB();
        const allIntegrations = await dbAdapter.getIntegrations(orgId);
        allWebflow = allIntegrations.filter((int: any) => int.type === 'webflow');
      } catch (e) {
        // Ignore error - we're just trying to get helpful info
      }
      
      logger.warn('No active Webflow integration found', {
        orgId,
        foundIntegrations: allWebflow.length,
        statuses: allWebflow.map(i => ({ id: i.id || i.integration_id, status: i.status, name: i.name })),
      });
      
      return NextResponse.json(
        { 
          error: 'No active Webflow integration found',
          hint: allWebflow.length > 0 
            ? `Found ${allWebflow.length} integration(s) with status: ${allWebflow.map(i => i.status).join(', ')}. Status must be 'active'.`
            : 'Please configure a Webflow integration first.'
        },
        { status: 404 }
      );
    }

    // Handle both adapter format and direct query format
    const integrationId = integration.id || integration.integration_id;
    const config = integration.config || integration.connection || {};
    const metadata = integration.metadata || {};
    const apiToken = config?.api_key || config?.apiToken || config?.token || config?.api_token;
    const integrationSiteId = config?.site_id || config?.siteId || metadata?.site_id;

    logger.info('Webflow integration found', {
      integrationId,
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
          try {
            const updatedConfig = {
              ...(config || {}),
              site_id: finalSiteId,
            };
            
            // Use service client for update to avoid schema cache issues
            const serviceClient = createServiceClient();
            const { error: updateError } = await serviceClient
              .from('integrations')
              .update({
                config: updatedConfig,
              })
              .eq('integration_id', integrationId);
            
            if (updateError) {
              logger.warn('Failed to store auto-detected site_id in config', {
                error: updateError.message,
                integrationId: integration.integration_id,
                siteId: finalSiteId,
              });
              // Continue anyway - site_id is detected and will be used for this scan
            } else {
              logger.info('Stored auto-detected site_id in integration config', {
                integrationId: integration.integration_id,
                siteId: finalSiteId,
              });
            }
          } catch (updateError: any) {
            logger.warn('Error storing auto-detected site_id', {
              error: updateError.message,
              integrationId: integration.integration_id,
            });
            // Continue anyway - site_id is detected and will be used for this scan
          }
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

    // Create scan record (use service client for reliability)
    const serviceClient = createServiceClient();
    const { data: scanRecord, error: scanError } = await serviceClient
      .from('webflow_structure_scans')
      .insert({
        org_id: orgId,
        integration_id: integrationId,
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
    logger.error('Failed to start Webflow structure scan', { 
      error: error.message,
      stack: error.stack,
      errorType: error.constructor?.name,
    });
    return NextResponse.json(
      { 
        error: error.message || 'Failed to start scan',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
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

