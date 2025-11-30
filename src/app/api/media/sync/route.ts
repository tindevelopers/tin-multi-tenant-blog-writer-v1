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

    // Fetch resources directly from Cloudinary API
    const folder = `blog-images/${user.org_id}`;
    const crypto = await import('crypto');
    
    // Create Cloudinary Admin API signature for listing resources
    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = `max_results=500&prefix=${folder}&resource_type=image&timestamp=${timestamp}`;
    const signature = crypto.createHash('sha1')
      .update(paramsToSign + credentials.api_secret)
      .digest('hex');
    
    // Build Cloudinary Admin API URL
    const cloudinaryUrl = new URL(`https://api.cloudinary.com/v1_1/${credentials.cloud_name}/resources/image`);
    cloudinaryUrl.searchParams.append('max_results', '500');
    cloudinaryUrl.searchParams.append('prefix', folder);
    cloudinaryUrl.searchParams.append('resource_type', 'image');
    cloudinaryUrl.searchParams.append('timestamp', timestamp.toString());
    cloudinaryUrl.searchParams.append('signature', signature);
    cloudinaryUrl.searchParams.append('api_key', credentials.api_key);
    
    logger.debug('Fetching Cloudinary resources', {
      url: cloudinaryUrl.toString().replace(credentials.api_key, '***'),
      folder,
      orgId: user.org_id,
    });

    const syncResponse = await fetch(cloudinaryUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(120000), // 2 minute timeout
    });

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      logger.error('Cloudinary list API error:', {
        status: syncResponse.status,
        error: errorText,
      });
      
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

    // Sync with database
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

