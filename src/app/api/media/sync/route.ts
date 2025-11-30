/**
 * API Route: Sync Media from Cloudinary
 * 
 * POST /api/media/sync
 * 
 * Syncs Cloudinary resources with the media_assets table
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, handleApiError } from '@/lib/api-utils';
import { getCloudinaryCredentials } from '@/lib/cloudinary-upload';
import { createServiceClient } from '@/lib/supabase/service';

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  resource_type: string;
  created_at: string;
  folder?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    logger.debug('Starting Cloudinary sync', {
      userId: user.id,
      orgId: user.org_id,
    });

    // Get Cloudinary credentials
    const credentials = await getCloudinaryCredentials(user.org_id);
    if (!credentials) {
      return NextResponse.json(
        { error: 'Cloudinary not configured for this organization' },
        { status: 400 }
      );
    }

    // Helper function to sync resources to database
    const syncResourcesToDatabase = async (resources: CloudinaryResource[]) => {
      const supabase = createServiceClient();
      let syncedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      for (const resource of resources) {
        try {
          // Check if asset already exists by public_id
          const { data: existing } = await supabase
            .from('media_assets')
            .select('asset_id')
            .eq('org_id', user.org_id)
            .eq('metadata->>public_id', resource.public_id)
            .single();

          if (existing) {
            // Update existing asset
            const { error: updateError } = await supabase
              .from('media_assets')
              .update({
                file_url: resource.secure_url,
                file_type: resource.format || 'image/png',
                file_size: resource.bytes,
                metadata: {
                  public_id: resource.public_id,
                  width: resource.width,
                  height: resource.height,
                  resource_type: resource.resource_type,
                  folder: resource.folder,
                  synced_at: new Date().toISOString(),
                },
              })
              .eq('asset_id', existing.asset_id);

            if (updateError) {
              logger.error('Error updating media asset:', updateError);
              skippedCount++;
            } else {
              updatedCount++;
            }
          } else {
            // Insert new asset
            const fileName = resource.public_id.split('/').pop() || resource.public_id;
            const { error: insertError } = await supabase
              .from('media_assets')
              .insert({
                org_id: user.org_id,
                uploaded_by: user.id,
                file_name: fileName,
                file_url: resource.secure_url,
                file_type: resource.format || 'image/png',
                file_size: resource.bytes,
                provider: 'cloudinary',
                metadata: {
                  public_id: resource.public_id,
                  width: resource.width,
                  height: resource.height,
                  resource_type: resource.resource_type,
                  folder: resource.folder,
                  synced_at: new Date().toISOString(),
                },
              });

            if (insertError) {
              logger.error('Error inserting media asset:', insertError);
              skippedCount++;
            } else {
              syncedCount++;
            }
          }
        } catch (error) {
          logger.error('Error processing resource:', {
            error,
            public_id: resource.public_id,
          });
          skippedCount++;
        }
      }

      return { syncedCount, updatedCount, skippedCount };
    };

    // Fetch resources directly from Cloudinary Admin API
    const folder = `blog-images/${user.org_id}`;
    
    // Cloudinary Admin API supports Basic Auth (simpler and more reliable than signed URLs)
    const authString = Buffer.from(`${credentials.api_key}:${credentials.api_secret}`).toString('base64');
    
    // Build Cloudinary Admin API URL
    const cloudinaryUrl = new URL(`https://api.cloudinary.com/v1_1/${credentials.cloud_name}/resources/image`);
    cloudinaryUrl.searchParams.append('max_results', '500');
    cloudinaryUrl.searchParams.append('prefix', folder);
    cloudinaryUrl.searchParams.append('resource_type', 'image');
    
    logger.debug('Fetching Cloudinary resources', {
      url: cloudinaryUrl.toString(),
      folder,
      orgId: user.org_id,
      cloudName: credentials.cloud_name,
      usingBasicAuth: true,
    });

    const syncResponse = await fetch(cloudinaryUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(120000), // 2 minute timeout
    });

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      let errorJson: any = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        // Not JSON, use as-is
      }
      
      const errorHeaders = Object.fromEntries(syncResponse.headers.entries());
      
      logger.error('Cloudinary list API error:', {
        status: syncResponse.status,
        statusText: syncResponse.statusText,
        error: errorText,
        errorJson,
        headers: errorHeaders,
        cloudName: credentials.cloud_name,
        folder,
        url: cloudinaryUrl.toString(),
        authMethod: 'Basic Auth',
      });
      
      // If Basic Auth fails with 401, try signed URL method as fallback
      if (syncResponse.status === 401) {
        logger.info('Basic Auth failed, trying signed URL method as fallback');
        
        // Try signed URL method
        const crypto = await import('crypto');
        const timestamp = Math.round(new Date().getTime() / 1000);
        
        const params: Record<string, string> = {
          max_results: '500',
          prefix: folder,
          resource_type: 'image',
          timestamp: timestamp.toString(),
        };
        
        // Sort parameters alphabetically for signature
        const sortedParamKeys = Object.keys(params).sort();
        const sortedParamsString = sortedParamKeys
          .map(key => `${key}=${encodeURIComponent(params[key])}`)
          .join('&');
        
        // Calculate SHA1 signature: sorted_params_string + api_secret
        const signature = crypto.createHash('sha1')
          .update(sortedParamsString + credentials.api_secret)
          .digest('hex');
        
        // Build signed URL
        const signedUrl = new URL(`https://api.cloudinary.com/v1_1/${credentials.cloud_name}/resources/image`);
        signedUrl.searchParams.append('api_key', credentials.api_key);
        signedUrl.searchParams.append('max_results', '500');
        signedUrl.searchParams.append('prefix', folder);
        signedUrl.searchParams.append('resource_type', 'image');
        signedUrl.searchParams.append('timestamp', timestamp.toString());
        signedUrl.searchParams.append('signature', signature);
        
        logger.debug('Retrying with signed URL', {
          url: signedUrl.toString().replace(credentials.api_key, '***'),
          signaturePrefix: signature.substring(0, 8) + '...',
        });
        
        const retryResponse = await fetch(signedUrl.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(120000),
        });
        
        if (retryResponse.ok) {
          // Signed URL worked, continue with this response
          const cloudinaryData = await retryResponse.json();
          const resources: CloudinaryResource[] = cloudinaryData.resources || [];
          
          logger.info('Signed URL method succeeded', {
            resourceCount: resources.length,
          });
          
          // Sync resources to database
          const { syncedCount, updatedCount, skippedCount } = await syncResourcesToDatabase(resources);

          return NextResponse.json({
            success: true,
            synced: syncedCount,
            updated: updatedCount,
            skipped: skippedCount,
            total: resources.length,
            message: `Synced ${syncedCount} new assets, updated ${updatedCount} existing assets (using signed URL fallback)`,
          });
        } else {
          // Both methods failed
          const retryErrorText = await retryResponse.text();
          return NextResponse.json(
            { 
              error: 'Invalid Cloudinary credentials. Both Basic Auth and Signed URL methods failed.',
              details: errorText,
              retryDetails: retryErrorText,
              suggestion: 'Please verify your Cloud Name, API Key, and API Secret in Settings → Integrations → Cloudinary.',
            },
            { status: 401 }
          );
        }
      }
      
      return NextResponse.json(
        { error: `Failed to fetch Cloudinary resources: ${syncResponse.status} - ${errorText}` },
        { status: syncResponse.status }
      );
    }

    const cloudinaryData = await syncResponse.json();
    const resources: CloudinaryResource[] = cloudinaryData.resources || [];

    logger.debug('Fetched Cloudinary resources', {
      count: resources.length,
      orgId: user.org_id,
    });

    // Sync with database using helper function
    const { syncedCount, updatedCount, skippedCount } = await syncResourcesToDatabase(resources);

    logger.debug('Cloudinary sync completed', {
      synced: syncedCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: resources.length,
    });

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: resources.length,
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'media-sync',
    });
    return handleApiError(error);
  }
}

