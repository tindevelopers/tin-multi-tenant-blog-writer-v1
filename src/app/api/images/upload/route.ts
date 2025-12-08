/**
 * API Route: Image Upload
 * 
 * POST /api/images/upload
 * 
 * Uploads images directly to Cloudinary using organization credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, handleApiError } from '@/lib/api-utils';
import { getCloudinaryCredentials, saveMediaAsset } from '@/lib/cloudinary-upload';
import { createServiceClient } from '@/lib/supabase/service';

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

    // Get Cloudinary credentials
    const credentials = await getCloudinaryCredentials(user.org_id);
    if (!credentials) {
      return NextResponse.json(
        { error: 'Cloudinary not configured for this organization. Please configure in Settings → Integrations → Cloudinary.' },
        { status: 400 }
      );
    }

    // Validate credentials
    if (!credentials.cloud_name || !credentials.api_key || !credentials.api_secret) {
      return NextResponse.json(
        { error: 'Cloudinary credentials are incomplete. Please reconfigure in Settings → Integrations → Cloudinary.' },
        { status: 400 }
      );
    }

    logger.debug('Uploading image directly to Cloudinary', {
      fileName: file.name,
      fileSize: file.size,
      orgId: user.org_id,
      cloudName: credentials.cloud_name,
    });

    // Upload directly to Cloudinary using signed upload
    const crypto = await import('crypto');
    const timestamp = Math.round(new Date().getTime() / 1000);
    const publicId = `blog-images/${user.org_id}/${file.name.replace(/\.[^/.]+$/, '')}_${timestamp}`;
    const folder = `blog-images/${user.org_id}`;

    // Create signature for upload
    const paramsToSign = `folder=${folder}&overwrite=true&public_id=${publicId}&timestamp=${timestamp}`;
    const signature = crypto.createHash('sha1')
      .update(paramsToSign + credentials.api_secret)
      .digest('hex');

    // Convert file to base64 for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    // Create multipart/form-data body manually
    const boundary = `----WebKitFormBoundary${crypto.randomBytes(16).toString('hex')}`;
    const formDataParts: string[] = [];

    const appendField = (name: string, value: string) => {
      formDataParts.push(`--${boundary}\r\n`);
      formDataParts.push(`Content-Disposition: form-data; name="${name}"\r\n\r\n`);
      formDataParts.push(`${value}\r\n`);
    };

    appendField('api_key', credentials.api_key);
    appendField('timestamp', timestamp.toString());
    appendField('signature', signature);
    appendField('public_id', publicId);
    appendField('folder', folder);
    appendField('overwrite', 'true');
    appendField('file', dataUri);
    formDataParts.push(`--${boundary}--\r\n`);

    const formDataBody = Buffer.from(formDataParts.join(''), 'utf-8');

    const uploadUrl = `https://api.cloudinary.com/v1_1/${credentials.cloud_name}/image/upload`;

    let uploadResult;
    try {
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': formDataBody.length.toString(),
        },
        body: formDataBody,
        signal: AbortSignal.timeout(60000),
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        let errorMessage = 'Cloudinary upload failed';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        logger.error('Cloudinary upload failed', {
          status: uploadResponse.status,
          error: errorMessage,
          orgId: user.org_id,
        });
        
        return NextResponse.json(
          { error: errorMessage },
          { status: uploadResponse.status }
        );
      }

      const cloudinaryResult = await uploadResponse.json();
      
      uploadResult = {
        public_id: cloudinaryResult.public_id,
        secure_url: cloudinaryResult.secure_url || cloudinaryResult.url,
        url: cloudinaryResult.url,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        format: cloudinaryResult.format,
        bytes: cloudinaryResult.bytes,
        resource_type: cloudinaryResult.resource_type || 'image',
      };

      logger.debug('✅ Image uploaded to Cloudinary successfully', {
        publicId: uploadResult.public_id,
        secureUrl: uploadResult.secure_url,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed. Please try again.';
      logger.error('Cloudinary upload error', {
        error: message,
        orgId: user.org_id,
      });
      return NextResponse.json(
        { error: message },
        { status: 500 },
      );
    }

    if (!uploadResult) {
      logger.error('Cloudinary upload returned null result', {
        orgId: user.org_id,
      });
      return NextResponse.json(
        { error: 'Upload failed. Please try again.' },
        { status: 500 },
      );
    }

    const assetId = await saveMediaAsset(
      user.org_id,
      user.id,
      uploadResult,
      file.name,
      {
        source: 'manual_upload',
        uploaded_via: 'editor',
      }
    );

    if (!assetId) {
      logger.error('Failed to save media asset to database', {
        orgId: user.org_id,
        userId: user.id,
        fileName: file.name,
        publicId: uploadResult.public_id,
      });
      // Still return success for Cloudinary upload, but warn about DB save failure
      return NextResponse.json({
        url: uploadResult.secure_url || uploadResult.url,
        public_id: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        asset_id: null,
        warning: 'Image uploaded to Cloudinary but failed to save to database. Please check logs.',
      });
    }

    logger.debug('✅ Media asset saved successfully', {
      assetId,
      orgId: user.org_id,
      fileName: file.name,
    });

    return NextResponse.json({
      url: uploadResult.secure_url || uploadResult.url,
      public_id: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      asset_id: assetId,
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'images-upload',
    });
    return handleApiError(error);
  }
}

