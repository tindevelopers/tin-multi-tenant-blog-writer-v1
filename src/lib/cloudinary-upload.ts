/**
 * Cloudinary Upload Utility
 * Handles uploading images to Cloudinary using organization-specific credentials
 */

import { createServiceClient } from '@/lib/supabase/service';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from './blog-writer-api-url';

interface CloudinaryCredentials {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  resource_type: string;
}

/**
 * Get Cloudinary credentials for an organization
 */
export async function getCloudinaryCredentials(orgId: string): Promise<CloudinaryCredentials | null> {
  try {
    const supabase = createServiceClient();
    const { data: org, error } = await supabase
      .from('organizations')
      .select('settings')
      .eq('org_id', orgId)
      .single();

    if (error || !org) {
      logger.error('Error fetching organization:', error);
      return null;
    }

    const settings = org.settings as Record<string, unknown> | null;
    if (!settings || !settings.cloudinary) {
      logger.warn(`No Cloudinary credentials found for org ${orgId}`);
      return null;
    }

    const cloudinary = settings.cloudinary as Record<string, unknown>;
    const cloud_name = cloudinary.cloud_name as string;
    const api_key = cloudinary.api_key as string;
    const api_secret = cloudinary.api_secret as string;

    if (!cloud_name || !api_key || !api_secret) {
      logger.warn(`Incomplete Cloudinary credentials for org ${orgId}`);
      return null;
    }

    return { cloud_name, api_key, api_secret };
  } catch (error) {
    logger.error('Error getting Cloudinary credentials:', error);
    return null;
  }
}

/**
 * Upload image using Cloudinary API via Blog Writer API
 */
export async function uploadViaBlogWriterAPI(
  imageUrl: string,
  imageData: string | null,
  orgId: string,
  fileName: string,
  folder?: string
): Promise<CloudinaryUploadResult | null> {
  try {
    const API_BASE_URL = BLOG_WRITER_API_URL;
    const API_KEY = process.env.BLOG_WRITER_API_KEY;

    // Get organization's Cloudinary credentials
    const credentials = await getCloudinaryCredentials(orgId);
    if (!credentials) {
      logger.error(`No Cloudinary credentials configured for org ${orgId}`);
      return null;
    }

    // Prepare image data
    let imageBase64: string | null = null;
    if (imageData) {
      imageBase64 = imageData;
    } else if (imageUrl) {
      // Fetch and convert to base64 (server-side)
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Detect content type from response or default to png
      const contentType = response.headers.get('content-type') || 'image/png';
      imageBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
    } else {
      throw new Error('No image data or URL provided');
    }

    // Call Blog Writer API's Cloudinary upload endpoint
    const uploadResponse = await fetch(`${API_BASE_URL}/api/v1/media/upload/cloudinary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
      },
      body: JSON.stringify({
        image_data: imageBase64,
        file_name: fileName,
        folder: folder || `blog-images/${orgId}`,
        cloudinary_credentials: {
          cloud_name: credentials.cloud_name,
          api_key: credentials.api_key,
          api_secret: credentials.api_secret,
        },
      }),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      logger.error('Blog Writer API Cloudinary upload error:', errorText);
      throw new Error(`Cloudinary upload failed: ${uploadResponse.statusText}`);
    }

    const result = await uploadResponse.json();
    
    return {
      public_id: result.public_id,
      secure_url: result.secure_url || result.url,
      url: result.url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      resource_type: result.resource_type || 'image',
    };
  } catch (error) {
    logger.error('Error uploading via Blog Writer API:', error);
    return null;
  }
}

/**
 * Save uploaded image to media_assets table
 */
export async function saveMediaAsset(
  orgId: string,
  userId: string | null,
  cloudinaryResult: CloudinaryUploadResult,
  fileName: string,
  metadata?: Record<string, unknown>
): Promise<string | null> {
  try {
    // Validate required fields
    if (!orgId) {
      logger.error('❌ saveMediaAsset: orgId is required');
      return null;
    }
    
    if (!cloudinaryResult || !cloudinaryResult.secure_url) {
      logger.error('❌ saveMediaAsset: Invalid cloudinaryResult or missing secure_url');
      return null;
    }

    logger.debug('💾 Saving media asset to database:', {
      orgId,
      userId,
      fileName,
      url: cloudinaryResult.secure_url.substring(0, 50) + '...',
      format: cloudinaryResult.format,
      size: cloudinaryResult.bytes
    });

    const supabase = createServiceClient();
    
    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('❌ SUPABASE_SERVICE_ROLE_KEY is not configured. Cannot save to database.');
      return null;
    }

    const insertData = {
      org_id: orgId,
      uploaded_by: userId,
      file_name: fileName,
      file_url: cloudinaryResult.secure_url,
      file_type: cloudinaryResult.format || 'image/png',
      file_size: cloudinaryResult.bytes || 0,
      provider: 'cloudinary' as const,
      metadata: {
        public_id: cloudinaryResult.public_id,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        resource_type: cloudinaryResult.resource_type || 'image',
        ...metadata,
      },
    };

    logger.debug('💾 Inserting media asset with data:', {
      ...insertData,
      metadata: insertData.metadata,
      file_url: insertData.file_url.substring(0, 50) + '...'
    });

    const { data, error } = await supabase
      .from('media_assets')
      .insert(insertData)
      .select('asset_id')
      .single();

    if (error) {
      logger.error('❌ Error saving media asset to database:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        insertData: {
          ...insertData,
          file_url: insertData.file_url.substring(0, 50) + '...'
        }
      });
      return null;
    }

    if (!data || !data.asset_id) {
      logger.error('❌ No asset_id returned from insert');
      return null;
    }

    logger.debug('✅ Media asset saved successfully:', {
      asset_id: data.asset_id,
      file_name: fileName,
      org_id: orgId
    });

    return data.asset_id;
  } catch (error) {
    logger.error('❌ Exception saving media asset:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      orgId,
      fileName
    });
    return null;
  }
}

