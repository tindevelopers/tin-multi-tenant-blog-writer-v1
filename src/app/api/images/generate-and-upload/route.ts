/**
 * API Route: Generate Image and Upload to Cloudinary
 * 
 * POST /api/images/generate-and-upload
 * 
 * Generates an image using AI and uploads it to Cloudinary,
 * then saves it to the media library.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, handleApiError } from '@/lib/api-utils';
import { uploadViaBlogWriterAPI, saveMediaAsset } from '@/lib/cloudinary-upload';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import cloudRunHealth from '@/lib/cloud-run-health';

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

    const body = await request.json();
    const { prompt, aspectRatio = '1:1', imageType = 'thumbnail', title } = body;

    // Validate required fields
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'Prompt is required and must be at least 3 characters' },
        { status: 400 }
      );
    }

    logger.debug('🖼️ Generate-and-upload called', {
      prompt: prompt.substring(0, 100),
      aspectRatio,
      imageType,
      orgId: user.org_id,
    });

    // Ensure Cloud Run is healthy
    const healthStatus = await cloudRunHealth.wakeUpAndWait();
    if (!healthStatus.isHealthy) {
      return NextResponse.json(
        { 
          error: healthStatus.isWakingUp 
            ? 'Cloud Run service is starting up. Please wait a moment and try again.'
            : `Cloud Run is not healthy: ${healthStatus.error}` 
        },
        { status: 503 }
      );
    }

    // Step 1: Generate the image
    logger.debug('📸 Step 1: Generating image...');
    const generateResponse = await fetch(`${API_BASE_URL}/api/v1/images/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
      },
      body: JSON.stringify({
        provider: 'stability_ai',
        prompt,
        aspectRatio,
      }),
      signal: AbortSignal.timeout(90000), // 90 second timeout for generation
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      logger.error('❌ Image generation failed', { status: generateResponse.status, error: errorText });
      return NextResponse.json(
        { error: `Image generation failed: ${generateResponse.status} ${errorText}` },
        { status: generateResponse.status }
      );
    }

    const generateResult = await generateResponse.json();
    logger.debug('✅ Image generated', { resultKeys: Object.keys(generateResult) });

    // Handle async job response
    if (generateResult.job_id && (generateResult.status === 'queued' || generateResult.status === 'processing')) {
      logger.info('📋 Image generation queued, polling for completion', {
        job_id: generateResult.job_id,
      });

      // Poll for job completion
      const maxAttempts = 45; // 45 attempts * 2 seconds = 90 seconds max
      let attempt = 0;
      let imageUrl = '';
      let imageData = '';

      while (attempt < maxAttempts) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
          const statusResponse = await fetch(`${API_BASE_URL}/api/v1/images/jobs/${generateResult.job_id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
            },
          });

          if (!statusResponse.ok) continue;

          const statusResult = await statusResponse.json();
          logger.debug('Poll attempt', { attempt, status: statusResult.status });

          if (statusResult.status === 'completed') {
            // Extract image URL or data
            if (statusResult.result?.images?.[0]) {
              const img = statusResult.result.images[0];
              imageUrl = img.image_url || img.url || img.secure_url || '';
              imageData = img.image_data || '';
            } else if (statusResult.result?.image_url) {
              imageUrl = statusResult.result.image_url;
            } else if (statusResult.image_url) {
              imageUrl = statusResult.image_url;
            }
            
            if (imageUrl || imageData) break;
          } else if (statusResult.status === 'failed') {
            throw new Error(statusResult.error_message || 'Image generation failed');
          }
        } catch (pollError) {
          logger.warn(`Poll error (attempt ${attempt})`, { error: pollError });
        }
      }

      if (!imageUrl && !imageData) {
        return NextResponse.json(
          { error: 'Image generation timed out. Please try again.' },
          { status: 504 }
        );
      }

      // Upload to Cloudinary
      return await uploadAndSaveToMediaLibrary(
        imageUrl,
        imageData,
        user.org_id,
        user.id,
        imageType,
        title
      );
    }

    // Handle synchronous response
    let imageUrl = '';
    let imageData = '';

    if (generateResult.images?.[0]) {
      const img = generateResult.images[0];
      imageUrl = img.image_url || img.url || img.secure_url || '';
      imageData = img.image_data || '';
    } else if (generateResult.image_url) {
      imageUrl = generateResult.image_url;
    } else if (generateResult.image_data) {
      imageData = generateResult.image_data;
    }

    if (!imageUrl && !imageData) {
      logger.error('No image URL or data in response', { generateResult });
      return NextResponse.json(
        { error: 'No image returned from generation' },
        { status: 500 }
      );
    }

    // Upload to Cloudinary
    return await uploadAndSaveToMediaLibrary(
      imageUrl,
      imageData,
      user.org_id,
      user.id,
      imageType,
      title
    );

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'generate-and-upload',
    });
    return handleApiError(error);
  }
}

async function uploadAndSaveToMediaLibrary(
  imageUrl: string,
  imageData: string,
  orgId: string,
  userId: string,
  imageType: string,
  title: string
): Promise<NextResponse> {
  logger.debug('📤 Step 2: Attempting Cloudinary upload...');
  
  const timestamp = Date.now();
  const fileName = `${imageType}_${timestamp}.png`;

  // Determine the image URL to return (Cloudinary URL or original)
  let finalUrl = imageUrl;
  let publicId: string | undefined;
  let width: number | undefined;
  let height: number | undefined;
  let assetId: string | null = null;

  try {
    // Attempt Upload using Blog Writer API (which handles Cloudinary upload)
    const uploadResult = await uploadViaBlogWriterAPI(
      imageUrl,
      imageData ? (imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`) : null,
      orgId,
      fileName,
      `blog-images/${orgId}/${imageType}s`,
      `${imageType} for ${title || 'blog post'}`
    );

    if (uploadResult) {
    logger.debug('✅ Uploaded to Cloudinary', {
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url?.substring(0, 50),
    });
      
      finalUrl = uploadResult.secure_url || uploadResult.url || imageUrl;
      publicId = uploadResult.public_id;
      width = uploadResult.width;
      height = uploadResult.height;

    // Step 3: Save to media library
    logger.debug('💾 Step 3: Saving to media library...');
      assetId = await saveMediaAsset(
      orgId,
      userId,
      uploadResult,
      fileName,
      {
        source: 'ai_generated',
        image_type: imageType,
        title: title,
        generated_at: new Date().toISOString(),
      }
    );

    if (assetId) {
      logger.debug('✅ Saved to media library', { assetId });
    } else {
      logger.warn('⚠️ Failed to save to media library, but Cloudinary upload succeeded');
    }
    } else {
      // Cloudinary upload failed - log warning but continue with original URL
      logger.warn('⚠️ Cloudinary upload failed, returning original image URL as fallback');
    }
  } catch (uploadError) {
    // Cloudinary upload error - log warning but continue with original URL
    logger.warn('⚠️ Cloudinary upload error (non-critical), returning original image URL', { 
      error: uploadError instanceof Error ? uploadError.message : 'Unknown error'
    });
  }

  // Return success with either Cloudinary URL or original URL as fallback
    return NextResponse.json({
      success: true,
    url: finalUrl,
    public_id: publicId,
    width: width,
    height: height,
      asset_id: assetId,
      image_type: imageType,
    cloudinary_uploaded: !!publicId, // Indicate if Cloudinary upload succeeded
  });
}

