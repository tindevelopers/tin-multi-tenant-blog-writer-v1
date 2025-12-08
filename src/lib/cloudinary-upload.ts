/**
 * Cloudinary Upload Utility
 * Handles uploading images to Cloudinary using organization-specific credentials
 * 
 * MULTI-TENANT ARCHITECTURE:
 * - Each organization has their own Cloudinary account (stored in organizations.settings.cloudinary)
 * - Images are uploaded directly to tenant's Cloudinary using their credentials
 * - Fallback to Blog Writer API's shared Cloudinary if tenant has no credentials
 */

import { createServiceClient } from '@/lib/supabase/service';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from './blog-writer-api-url';
import * as crypto from 'crypto';

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
 * Upload image directly to tenant's Cloudinary account
 * Uses the organization's own credentials for complete data isolation
 * 
 * @param base64Data - Raw base64 image data (with or without data URI prefix)
 * @param orgId - Organization ID to fetch credentials
 * @param folder - Cloudinary folder path (e.g., "blog-images/queue_123/headers")
 * @param filename - Image filename (e.g., "header_1234567890.png")
 * @param altText - Optional alt text for the image
 * @returns CloudinaryUploadResult or null if upload fails
 */
export async function uploadToTenantCloudinary(
  base64Data: string,
  orgId: string,
  folder: string,
  filename: string,
  altText?: string | null
): Promise<CloudinaryUploadResult | null> {
  try {
    // Get tenant's Cloudinary credentials
    const credentials = await getCloudinaryCredentials(orgId);
    
    if (!credentials) {
      logger.warn(`No Cloudinary credentials for org ${orgId}, cannot upload directly`);
      return null;
    }

    logger.info('📤 Uploading to tenant Cloudinary', {
      cloudName: credentials.cloud_name,
      folder,
      filename,
      orgId,
    });

    // Strip data URI prefix if present
    let rawBase64 = base64Data;
    if (rawBase64.startsWith('data:')) {
      rawBase64 = rawBase64.split(',')[1] || rawBase64;
    }

    // Create signature for signed upload
    const timestamp = Math.round(Date.now() / 1000);
    const publicId = filename.replace(/\.[^/.]+$/, ''); // Remove file extension
    
    // Build params object - ALL params must be signed (alphabetical order)
    const params: Record<string, string> = {
      folder: folder,
      overwrite: 'true',
      public_id: publicId,
      timestamp: timestamp.toString(),
    };
    
    // Add context if altText provided - MUST be in signature
    if (altText) {
      params.context = `alt=${altText}|caption=${altText}`;
    }
    
    // Create signature from sorted params
    const sortedKeys = Object.keys(params).sort();
    const paramsToSign = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
    const signature = crypto.createHash('sha1')
      .update(paramsToSign + credentials.api_secret)
      .digest('hex');

    // Build form data for Cloudinary upload
    const dataUri = `data:image/png;base64,${rawBase64}`;
    const boundary = `----CloudinaryUpload${crypto.randomBytes(16).toString('hex')}`;
    const formDataParts: string[] = [];

    const appendField = (name: string, value: string) => {
      formDataParts.push(`--${boundary}\r\n`);
      formDataParts.push(`Content-Disposition: form-data; name="${name}"\r\n\r\n`);
      formDataParts.push(`${value}\r\n`);
    };

    appendField('api_key', credentials.api_key);
    appendField('timestamp', params.timestamp);
    appendField('signature', signature);
    appendField('public_id', params.public_id);
    appendField('folder', params.folder);
    appendField('overwrite', params.overwrite);
    if (params.context) {
      appendField('context', params.context);
    }
    appendField('file', dataUri);
    
    formDataParts.push(`--${boundary}--\r\n`);

    const formDataBody = Buffer.from(formDataParts.join(''), 'utf-8');
    const uploadUrl = `https://api.cloudinary.com/v1_1/${credentials.cloud_name}/image/upload`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': formDataBody.length.toString(),
      },
      body: formDataBody,
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Tenant Cloudinary upload failed', { 
        status: response.status, 
        error: errorText.substring(0, 300),
        cloudName: credentials.cloud_name,
        folder,
      });
      return null;
    }

    const result = await response.json();
    
    logger.info('✅ Image uploaded to tenant Cloudinary', { 
      publicId: result.public_id,
      url: result.secure_url?.substring(0, 80),
      cloudName: credentials.cloud_name,
    });

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
    logger.error('Error uploading to tenant Cloudinary:', error);
    return null;
  }
}

/**
 * Upload image using Cloudinary API via Blog Writer API (FALLBACK)
 * Used when tenant doesn't have their own Cloudinary credentials configured
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

