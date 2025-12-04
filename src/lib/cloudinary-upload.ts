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
    const cloud_name = (cloudinary.cloud_name as string)?.trim();
    const api_key = (cloudinary.api_key as string)?.trim();
    const api_secret = (cloudinary.api_secret as string)?.trim();

    if (!cloud_name || !api_key || !api_secret) {
      logger.warn(`Incomplete Cloudinary credentials for org ${orgId}`, {
        hasCloudName: !!cloud_name,
        hasApiKey: !!api_key,
        hasApiSecret: !!api_secret,
      });
      return null;
    }

    // Validate credentials are not empty strings after trimming
    if (cloud_name.length === 0 || api_key.length === 0 || api_secret.length === 0) {
      logger.warn(`Empty Cloudinary credentials for org ${orgId}`, {
        cloudNameLength: cloud_name.length,
        apiKeyLength: api_key.length,
        apiSecretLength: api_secret.length,
      });
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
  folder?: string,
  altText?: string | null,
): Promise<CloudinaryUploadResult | null> {
  try {
    const API_BASE_URL = BLOG_WRITER_API_URL;
    const API_KEY = process.env.BLOG_WRITER_API_KEY;

    // Prepare image data - Backend expects RAW base64 (without data URI prefix)
    let imageBase64: string | null = null;
    if (imageData) {
      // Strip data URI prefix if present - backend expects raw base64
      if (imageData.startsWith('data:')) {
        imageBase64 = imageData.split(',')[1] || imageData;
      } else {
        imageBase64 = imageData;
      }
    } else if (imageUrl) {
      // Fetch and convert to base64 (server-side)
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Return raw base64 without data URI prefix - backend expects raw base64
      imageBase64 = buffer.toString('base64');
    } else {
      throw new Error('No image data or URL provided');
    }

    // Call Blog Writer API's Cloudinary upload endpoint (API already has credentials via secrets)
    const payload = {
      // newer API expects "media_data" and "filename"
      media_data: imageBase64,
      filename: fileName,
      // keep backward compatibility with older "image_data" + "file_name"
      image_data: imageBase64,
      file_name: fileName,
      folder: folder || (orgId ? `blog-images/${orgId}` : 'blog-images'),
      alt_text: altText || undefined,
      metadata: {
        org_id: orgId,
        source: 'manual_upload',
      },
    };

    const uploadResponse = await fetch(`${API_BASE_URL}/api/v1/media/upload/cloudinary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` }),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      logger.error('Blog Writer API Cloudinary upload error:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        response: errorText?.slice(0, 500),
      });

      let errorMessage = 'Cloudinary upload failed';
      try {
        if (errorText) {
          const parsed = JSON.parse(errorText);
          errorMessage = parsed.error || parsed.detail || parsed.message || errorMessage;
        }
      } catch {
        if (errorText) {
          errorMessage = errorText;
        }
      }

      throw new Error(errorMessage);
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

    // Ensure file_type is in MIME format (image/png, image/jpeg, etc.)
    let fileType = cloudinaryResult.format || 'png';
    if (!fileType.includes('/')) {
      // Convert format to MIME type
      const formatToMime: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
      };
      fileType = formatToMime[fileType.toLowerCase()] || `image/${fileType}`;
    }

    const insertData = {
      org_id: orgId,
      uploaded_by: userId,
      file_name: fileName,
      file_url: cloudinaryResult.secure_url,
      file_type: fileType,
      file_size: cloudinaryResult.bytes || 0,
      provider: 'cloudinary' as const,
      metadata: {
        public_id: cloudinaryResult.public_id,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        resource_type: cloudinaryResult.resource_type || 'image',
        format: cloudinaryResult.format, // Keep original format in metadata
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
        orgId,
        userId,
        fileName,
        insertData: {
          ...insertData,
          file_url: insertData.file_url.substring(0, 50) + '...',
          metadata: insertData.metadata,
        }
      });
      
      // Check if it's an RLS policy issue
      if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('policy')) {
        logger.error('❌ RLS Policy violation - service role may not be configured correctly');
      }
      
      return null;
    }

    if (!data || !data.asset_id) {
      logger.error('❌ No asset_id returned from insert', {
        orgId,
        userId,
        fileName,
        insertData: {
          ...insertData,
          file_url: insertData.file_url.substring(0, 50) + '...'
        }
      });
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

