/**
 * API Route: Image Upload
 * 
 * POST /api/images/upload
 * 
 * Uploads images to Cloudinary via Blog Writer API
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, handleApiError } from '@/lib/api-utils';
import { uploadViaBlogWriterAPI, saveMediaAsset } from '@/lib/cloudinary-upload';

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

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    logger.debug('Uploading image to Cloudinary via backend API', {
      fileName: file.name,
      fileSize: file.size,
      orgId: user.org_id,
    });

    let uploadResult;
    try {
      uploadResult = await uploadViaBlogWriterAPI(
        '',
        dataUri,
        user.org_id,
        file.name,
        `blog-images/${user.org_id}`,
        file.name,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed. Please try again.';
      logger.error('Cloudinary upload failed via blog writer API', {
        error: message,
        orgId: user.org_id,
      });
      return NextResponse.json(
        { error: message || 'Upload failed. Please try again.' },
        { status: 502 },
      );
    }

    if (!uploadResult) {
      logger.error('Cloudinary upload returned null result', {
        orgId: user.org_id,
      });
      return NextResponse.json(
        { error: 'Upload failed. Please try again.' },
        { status: 502 },
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

