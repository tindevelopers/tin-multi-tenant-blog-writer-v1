/**
 * API Route: Image Upload
 * 
 * POST /api/images/upload
 * 
 * Uploads images to Cloudinary via Blog Writer API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, handleApiError } from '@/lib/api-utils';
import { getCloudinaryCredentials } from '@/lib/cloudinary-upload';

import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

const API_BASE_URL = BLOG_WRITER_API_URL;
const API_KEY = process.env.BLOG_WRITER_API_KEY;

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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Check if organization has Cloudinary credentials configured
    const cloudinaryCredentials = await getCloudinaryCredentials(user.org_id);
    if (!cloudinaryCredentials) {
      logger.warn('No Cloudinary credentials configured for organization', {
        orgId: user.org_id,
      });
      return NextResponse.json(
        { 
          error: 'Cloudinary is not configured for your organization. Please configure Cloudinary credentials in Settings → Integrations.',
          code: 'CLOUDINARY_NOT_CONFIGURED'
        },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    logger.debug('Uploading image to Cloudinary via backend API', {
      fileName: file.name,
      fileSize: file.size,
      orgId: user.org_id,
      hasCredentials: !!cloudinaryCredentials,
    });

    // Upload via Blog Writer API with explicit Cloudinary credentials
    const uploadResponse = await fetch(`${API_BASE_URL}/api/v1/media/upload/cloudinary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
      },
      body: JSON.stringify({
        image_data: dataUri,
        file_name: file.name,
        folder: `blog-images/${user.org_id}`,
        cloudinary_credentials: {
          cloud_name: cloudinaryCredentials.cloud_name,
          api_key: cloudinaryCredentials.api_key,
          api_secret: cloudinaryCredentials.api_secret,
        },
      }),
      signal: AbortSignal.timeout(60000), // 60 second timeout
    });

    if (!uploadResponse.ok) {
      let errorMessage = `Upload failed: ${uploadResponse.statusText}`;
      let errorDetails: unknown = null;
      
      try {
        const errorText = await uploadResponse.text();
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorJson.error || errorJson.message || errorMessage;
          errorDetails = errorJson;
        } catch {
          // If parsing fails, use the text as-is
          if (errorText) {
            errorMessage = errorText.length > 200 ? `${errorText.substring(0, 200)}...` : errorText;
          }
        }
      } catch (readError) {
        logger.error('Error reading error response', { error: readError });
      }

      logger.error('Blog Writer API upload error', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorMessage,
        details: errorDetails,
        orgId: user.org_id,
      });

      // Provide user-friendly error messages
      if (uploadResponse.status === 400) {
        return NextResponse.json(
          { 
            error: errorMessage || 'Invalid image file or request. Please check the file format and try again.',
            code: 'INVALID_REQUEST',
            details: errorDetails
          },
          { status: 400 }
        );
      } else if (uploadResponse.status === 401 || uploadResponse.status === 403) {
        return NextResponse.json(
          { 
            error: 'Authentication failed. Please check your API credentials.',
            code: 'AUTH_ERROR'
          },
          { status: uploadResponse.status }
        );
      } else if (uploadResponse.status === 500 || uploadResponse.status >= 500) {
        return NextResponse.json(
          { 
            error: 'Server error during upload. Please try again later.',
            code: 'SERVER_ERROR',
            details: errorDetails
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          code: 'UPLOAD_FAILED',
          details: errorDetails
        },
        { status: uploadResponse.status }
      );
    }

    const result = await uploadResponse.json();

    // Save to media_assets table
    const supabase = await createClient();
    const { data: assetData, error: assetError } = await supabase
      .from('media_assets')
      .insert({
        org_id: user.org_id,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: result.secure_url || result.url,
        file_type: result.format || file.type.split('/')[1],
        file_size: result.bytes || file.size,
        provider: 'cloudinary',
        metadata: {
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          resource_type: result.resource_type || 'image',
        },
      })
      .select('asset_id')
      .single();

    if (assetError) {
      logger.error('Error saving media asset', {
        error: assetError,
        orgId: user.org_id,
      });
      // Still return success if upload worked, even if saving to DB failed
    }

    return NextResponse.json({
      url: result.secure_url || result.url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      asset_id: assetData?.asset_id,
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'images-upload',
    });
    return handleApiError(error);
  }
}

