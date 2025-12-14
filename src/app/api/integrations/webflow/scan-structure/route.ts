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
      
      // Gather all active Webflow integrations
      const activeWebflow = allIntegrations.filter(
        (int: any) => int.type === 'webflow' && int.status === 'active'
      );

      // Helper to read site_id from various shapes
      const getSiteId = (int: any) =>
        int?.config?.site_id ||
        int?.config?.siteId ||
        int?.metadata?.site_id;

      // Prefer integration whose site_id matches the requested site
      if (activeWebflow.length > 0) {
        integration =
          (targetSiteId && activeWebflow.find((int: any) => getSiteId(int) === targetSiteId)) ||
          activeWebflow[0];
      }
      
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
    
    if (!integrationId) {
      logger.error('Integration ID is missing', {
        integration: integration,
        orgId,
      });
      return NextResponse.json(
        { 
          error: 'Invalid integration configuration',
          hint: 'Integration ID is missing. Please reconfigure your Webflow integration.'
        },
        { status: 500 }
      );
    }
    
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
        integrationId,
        configKeys: Object.keys(config || {}),
      });
      return NextResponse.json(
        { 
          error: 'Webflow API token not found in integration config',
          hint: 'Check that api_key, apiToken, or token is set in the integration config',
          integration_id: integrationId,
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
        integrationId: integrationId,
      });
      
      try {
        // Try to get collection_id from config to improve auto-detection
        const collectionId = config?.collection_id || config?.collectionId || metadata?.collection_id;
        const detectedSiteId = await autoDetectWebflowSiteId(apiToken, collectionId || undefined);
        
        if (detectedSiteId) {
          finalSiteId = detectedSiteId;
          logger.info('Auto-detected Webflow site ID', {
            siteId: finalSiteId,
            integrationId: integrationId,
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
                integrationId: integrationId,
                siteId: finalSiteId,
              });
              // Continue anyway - site_id is detected and will be used for this scan
            } else {
              logger.info('Stored auto-detected site_id in integration config', {
                integrationId: integrationId,
                siteId: finalSiteId,
              });
            }
          } catch (updateError: any) {
            logger.warn('Error storing auto-detected site_id', {
              error: updateError.message,
              integrationId: integrationId,
            });
            // Continue anyway - site_id is detected and will be used for this scan
          }
        } else {
          logger.warn('Could not auto-detect Webflow site ID', {
            orgId,
            integrationId: integrationId,
          });
          return NextResponse.json(
            { 
              error: 'site_id is required',
              hint: 'Could not auto-detect site_id. Please provide site_id in request body or configure it in the Webflow integration.',
              integration_id: integrationId,
            },
            { status: 400 }
          );
        }
      } catch (autoDetectError: any) {
        logger.error('Failed to auto-detect Webflow site ID', {
          error: autoDetectError.message,
          orgId,
          integrationId: integrationId,
        });
        return NextResponse.json(
          { 
            error: 'site_id is required',
            hint: `Auto-detection failed: ${autoDetectError.message}. Please provide site_id in request body or configure it in the Webflow integration.`,
            integration_id: integrationId,
          },
          { status: 400 }
        );
      }
    }

    // Check if there's an existing scan (using service client for reliable access)
    const serviceClientForCheck = createServiceClient();
    
    if (!rescan) {
      // Check for existing scan with same org_id, site_id, and scan_type
      const { data: existingScans } = await serviceClientForCheck
        .from('webflow_structure_scans')
        .select('scan_id, status')
        .eq('org_id', orgId)
        .eq('site_id', finalSiteId)
        .eq('scan_type', 'full')
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingScans && existingScans.length > 0) {
        const existingScan = existingScans[0];
        if (existingScan.status === 'scanning') {
          return NextResponse.json({
            success: true,
            scan_id: existingScan.scan_id,
            status: 'scanning',
            message: 'Scan already in progress',
          });
        } else {
          // If there's a completed/failed scan, we need to delete it first due to unique constraint
          logger.info('Found existing scan, will delete for new scan', {
            scanId: existingScan.scan_id,
            status: existingScan.status,
          });
          await serviceClientForCheck
            .from('webflow_structure_scans')
            .delete()
            .eq('scan_id', existingScan.scan_id);
        }
      }
    } else {
      // For rescan, delete all existing scans for this org/site/type
      const { error: deleteError } = await serviceClientForCheck
        .from('webflow_structure_scans')
        .delete()
        .eq('org_id', orgId)
        .eq('site_id', finalSiteId)
        .eq('scan_type', 'full');
      
      if (deleteError) {
        logger.warn('Failed to delete old scans for rescan', {
          error: deleteError.message,
          orgId,
          siteId: finalSiteId,
        });
      }
    }

    // Create scan record (use service client for reliability)
    // Service client bypasses RLS and uses service role key
    const serviceClient = createServiceClient();
    
    // Validate UUID format for integration_id if provided
    let validIntegrationId: string | null = null;
    if (integrationId) {
      // Check if it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(integrationId)) {
        // Verify integration exists before using it
        const serviceClient = createServiceClient();
        const { data: verifyIntegration, error: verifyError } = await serviceClient
          .from('integrations')
          .select('integration_id')
          .eq('integration_id', integrationId)
          .eq('org_id', orgId)
          .single();
        
        if (verifyError || !verifyIntegration) {
          logger.warn('Integration ID not found in database, using null', {
            integrationId,
            orgId,
            verifyError: verifyError?.message,
          });
          validIntegrationId = null;
        } else {
          validIntegrationId = integrationId;
          logger.debug('Integration ID validated successfully', { integrationId, orgId });
        }
      } else {
        logger.warn('Invalid integration_id format, using null', {
          integrationId,
          orgId,
        });
      }
    }
    
    const { data: scanRecord, error: scanError } = await serviceClient
      .from('webflow_structure_scans')
      .insert({
        org_id: orgId,
        integration_id: validIntegrationId,
        site_id: finalSiteId,
        scan_type: 'full',
        status: 'scanning',
        scan_started_at: new Date().toISOString(),
      })
      .select('scan_id')
      .single();

    if (scanError || !scanRecord) {
      logger.error('Failed to create scan record', { 
        error: scanError,
        errorCode: scanError?.code,
        errorMessage: scanError?.message,
        errorDetails: scanError?.details,
        orgId,
        integrationId,
        siteId: finalSiteId,
      });
      
      // Provide more detailed error message
      let errorMessage = 'Failed to create scan record';
      let hint = '';
      
      if (scanError?.code === '23505') {
        // Unique constraint violation
        errorMessage = 'A scan already exists for this site';
        hint = 'Use ?rescan=true to force a new scan';
      } else if (scanError?.code === '23503') {
        // Foreign key violation
        errorMessage = 'Invalid organization or integration ID';
        hint = 'Please verify your integration configuration';
      } else if (scanError?.message) {
        errorMessage = scanError.message;
        hint = scanError.details || '';
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          hint,
          details: process.env.NODE_ENV === 'development' ? scanError : undefined,
        },
        { status: 500 }
      );
    }

    const scanId = scanRecord.scan_id;

    // Perform scan asynchronously (don't await - return immediately)
    // The scan runs in the background and updates the database when complete
    performScan(scanId, apiToken, finalSiteId, orgId)
      .then(() => {
        logger.info('Scan completed successfully', { scanId, siteId: finalSiteId, orgId });
      })
      .catch((error) => {
        // Error is already handled in performScan function, but log it here too
        logger.error('Scan promise rejected', { 
          scanId, 
          siteId: finalSiteId,
          orgId,
          error: error?.message || 'Unknown error',
          stack: error?.stack 
        });
      });

    // Return immediately - scan runs in background
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
 * This runs server-side and saves results reliably to the database
 */
async function performScan(
  scanId: string,
  apiToken: string,
  siteId: string,
  orgId: string
): Promise<void> {
  // Use service client for reliable database access
  const supabase = createServiceClient();
  
  // Set a 5-minute timeout for the entire scan operation
  const timeoutMs = 5 * 60 * 1000; // 5 minutes
  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Scan timeout: Operation exceeded 5 minutes'));
    }, timeoutMs);
  });

  const scanPromise = (async () => {
    try {
      logger.info('Starting Webflow structure scan', { scanId, siteId, orgId });

      // Update status to scanning (in case it wasn't already)
      await supabase
      .from('webflow_structure_scans')
      .update({
        status: 'scanning',
        scan_started_at: new Date().toISOString(),
      })
      .eq('scan_id', scanId)
      .eq('org_id', orgId);

    // Discover Webflow structure with retry logic
    let structure;
    let retries = 3;
    let lastError: any = null;

    while (retries > 0) {
      try {
        structure = await discoverWebflowStructure(apiToken, siteId);
        break; // Success, exit retry loop
      } catch (error: any) {
        lastError = error;
        retries--;
        
        if (retries > 0) {
          logger.warn('Webflow discovery failed, retrying', {
            scanId,
            retriesLeft: retries,
            error: error.message,
          });
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 2000 * (3 - retries)));
        } else {
          throw error; // Re-throw if all retries exhausted
        }
      }
    }

    if (!structure) {
      throw lastError || new Error('Failed to discover Webflow structure');
    }

      // Calculate counts
      logger.debug('Calculating scan results', { scanId });
      const collectionsCount = structure.collections.length;
      const staticPagesCount = structure.static_pages.length;
      const cmsItemsCount = structure.existing_content.filter(c => c.type === 'cms').length;
      const totalContentItems = structure.existing_content.length;

      logger.info('Webflow structure discovered', {
        scanId,
        siteId,
        collections: collectionsCount,
        staticPages: staticPagesCount,
        cmsItems: cmsItemsCount,
        totalContent: totalContentItems,
        publishedDomain: structure.published_domain,
      });

      // Update scan record with results (use service client for reliability)
      logger.debug('Updating scan record with results', { scanId });
      const { error: updateError } = await supabase
      .from('webflow_structure_scans')
      .update({
        status: 'completed',
        collections: structure.collections,
        static_pages: structure.static_pages,
        existing_content: structure.existing_content,
        published_domain: structure.published_domain,
        collections_count: collectionsCount,
        static_pages_count: staticPagesCount,
        cms_items_count: cmsItemsCount,
        total_content_items: totalContentItems,
        scan_completed_at: new Date().toISOString(),
        next_scan_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      })
      .eq('scan_id', scanId)
      .eq('org_id', orgId);

        if (updateError) {
          // Retry database update once
          logger.warn('Database update failed, retrying', {
            scanId,
            error: updateError.message,
            errorCode: updateError.code,
          });
          
          logger.debug('Retrying database update', { scanId });
          const { error: retryError } = await supabase
            .from('webflow_structure_scans')
            .update({
              status: 'completed',
              collections: structure.collections,
              static_pages: structure.static_pages,
              existing_content: structure.existing_content,
              published_domain: structure.published_domain,
              collections_count: collectionsCount,
              static_pages_count: staticPagesCount,
              cms_items_count: cmsItemsCount,
              total_content_items: totalContentItems,
              scan_completed_at: new Date().toISOString(),
              next_scan_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('scan_id', scanId)
            .eq('org_id', orgId);

          if (retryError) {
            logger.error('Database update retry also failed', {
              scanId,
              error: retryError.message,
              errorCode: retryError.code,
            });
            throw new Error(`Failed to update scan record after retry: ${retryError.message}`);
          }
          logger.info('Database update succeeded on retry', { scanId });
        } else {
          logger.debug('Database update succeeded', { scanId });
        }

    logger.info('Webflow structure scan completed successfully', {
      scanId,
      siteId,
      orgId,
      collections: collectionsCount,
      staticPages: staticPagesCount,
      cmsItems: cmsItemsCount,
      totalContent: totalContentItems,
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

    // Update scan record with error (use service client for reliability)
    try {
      const { error: errorUpdateError } = await supabase
        .from('webflow_structure_scans')
        .update({
          status: 'failed',
          error_message: error.message,
          error_details: { 
            stack: error.stack,
            errorType: error.constructor?.name,
          },
          scan_completed_at: new Date().toISOString(),
        })
        .eq('scan_id', scanId)
        .eq('org_id', orgId);

      if (errorUpdateError) {
        logger.error('Failed to update scan record with error status', {
          scanId,
          updateError: errorUpdateError.message,
          originalError: error.message,
        });
      }
    } catch (updateError: any) {
      logger.error('Exception while updating scan record with error', {
        scanId,
        updateError: updateError.message,
        originalError: error.message,
      });
    }

    // Re-throw to be caught by caller
    throw error;
    }
  })();

  // Race between scan and timeout
  try {
    await Promise.race([scanPromise, timeoutPromise]);
  } catch (error: any) {
    // If timeout occurred, mark scan as failed
    if (error.message && (error.message.includes('timeout') || error.message.includes('Timeout') || error.message.includes('exceeded'))) {
      logger.error('Scan timed out', { scanId, siteId, orgId, timeoutMs, error: error.message });
      
      try {
        const { error: timeoutUpdateError } = await supabase
          .from('webflow_structure_scans')
          .update({
            status: 'failed',
            error_message: `Scan timed out after ${timeoutMs / 1000 / 60} minutes`,
            error_details: {
              timeout: true,
              timeoutMs,
              originalError: error.message,
            },
            scan_completed_at: new Date().toISOString(),
          })
          .eq('scan_id', scanId)
          .eq('org_id', orgId);

        if (timeoutUpdateError) {
          logger.error('Failed to update scan record with timeout error', {
            scanId,
            updateError: timeoutUpdateError.message,
          });
        } else {
          logger.info('Successfully marked timed-out scan as failed', { scanId });
        }
      } catch (updateError: any) {
        logger.error('Exception while updating scan record with timeout', {
          scanId,
          updateError: updateError.message,
        });
      }
      
      // Don't re-throw timeout errors - they're handled
      return;
    }
    
    // Re-throw other errors (they're already handled in scanPromise catch block)
    throw error;
  }
}

