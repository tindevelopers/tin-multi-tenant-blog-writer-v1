import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/api-utils';
import { logger } from '@/utils/logger';
import cloudRunHealth from '@/lib/cloud-run-health';
import { uploadViaBlogWriterAPI, saveMediaAsset } from '@/lib/cloudinary-upload';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

const API_BASE_URL = BLOG_WRITER_API_URL || process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west9.run.app';
const API_KEY = process.env.BLOG_WRITER_API_KEY || null;

/**
 * POST /api/blog-writer/images/generate
 * Generate images for blog posts (featured or section images)
 * 
 * This endpoint generates images separately after blog creation, as per
 * FRONTEND_IMAGE_GENERATION_GUIDE.md
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      prompt,
      style = 'photographic',
      aspect_ratio = '16:9',
      quality = 'high',
      type = 'featured', // 'featured' or 'section'
      org_id,
      blog_topic,
      keywords = [],
      section_title,
      position, // For section images
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    logger.debug('🖼️ Image generation request:', {
      type,
      prompt: prompt.substring(0, 100),
      style,
      aspect_ratio,
      quality
    });

    // Get user's org_id if not provided
    let orgId = org_id;
    let userId = user.id;

    if (!orgId) {
      const supabase = await createClient();
      const { data: userProfile } = await supabase
        .from('users')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (userProfile) {
        orgId = userProfile.org_id;
      } else {
        // Fallback to system defaults
        orgId = '00000000-0000-0000-0000-000000000001';
        userId = '00000000-0000-0000-0000-000000000002';
      }
    }

    // Ensure Cloud Run is awake and healthy
    const healthStatus = await cloudRunHealth.wakeUpAndWait();
    
    if (!healthStatus.isHealthy) {
      logger.error('❌ Cloud Run is not healthy:', healthStatus.error);
      return NextResponse.json(
        { error: 'Image generation service is not available' },
        { status: 503 }
      );
    }

    // Call the image generation API
    const imageResponse = await fetch(`${API_BASE_URL}/api/v1/images/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
      },
      body: JSON.stringify({
        prompt,
        provider: 'stability_ai',
        style,
        aspect_ratio,
        quality,
        negative_prompt: 'blurry, low quality, watermark, text overlay',
        width: aspect_ratio === '16:9' ? 1920 : 1024,
        height: aspect_ratio === '16:9' ? 1080 : 1024,
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      logger.error('❌ Image generation API error', {
        status: imageResponse.status,
        error: errorText
      });
      
      return NextResponse.json(
        { error: `Image generation failed: ${imageResponse.status} ${errorText}` },
        { status: imageResponse.status }
      );
    }

    const imageResult = await imageResponse.json();

    if (!imageResult.success || !imageResult.images || imageResult.images.length === 0) {
      logger.error('❌ Image generation returned no images:', imageResult.error_message);
      return NextResponse.json(
        { error: imageResult.error_message || 'Image generation failed' },
        { status: 500 }
      );
    }

    const generatedImage = imageResult.images[0];
    logger.debug('✅ Image generated successfully:', {
      imageId: generatedImage.image_id,
      width: generatedImage.width,
      height: generatedImage.height,
      hasUrl: !!generatedImage.image_url
    });

    // Upload to Cloudinary if org has credentials configured
    let cloudinaryUrl = generatedImage.image_url;
    let assetId: string | null = null;

    if (generatedImage.image_url || generatedImage.image_data) {
      try {
        const imageFileName = `blog-${type}-${Date.now()}.${generatedImage.format || 'png'}`;
        const folder = `blog-images/${orgId}`;
        
        logger.debug('☁️ Uploading image to Cloudinary...');
        const cloudinaryResult = await uploadViaBlogWriterAPI(
          generatedImage.image_url || '',
          generatedImage.image_data || null,
          orgId,
          imageFileName,
          folder
        );

        if (cloudinaryResult) {
          cloudinaryUrl = cloudinaryResult.secure_url;
          logger.debug('✅ Image uploaded to Cloudinary:', {
            publicId: cloudinaryResult.public_id,
            secureUrl: cloudinaryUrl
          });

          // Save to media_assets table
          assetId = await saveMediaAsset(
            orgId,
            userId || null,
            cloudinaryResult,
            imageFileName,
            {
              source: 'ai_generated',
              blog_topic: blog_topic || prompt,
              keywords: keywords,
              section_title: section_title,
              original_image_id: generatedImage.image_id,
              quality_score: generatedImage.quality_score,
              safety_score: generatedImage.safety_score,
              image_type: type,
              position: position
            }
          );

          if (assetId) {
            logger.debug('✅ Image saved to media_assets:', assetId);
          }
        }
      } catch (uploadError) {
        logger.warn('⚠️ Cloudinary upload error (non-critical):', uploadError);
        // Continue with original URL if Cloudinary upload fails
      }
    }

    return NextResponse.json({
      success: true,
      image: {
        image_id: generatedImage.image_id,
        image_url: cloudinaryUrl,
        width: generatedImage.width,
        height: generatedImage.height,
        format: generatedImage.format,
        alt_text: type === 'featured' 
          ? `Featured image for ${blog_topic || prompt}`
          : `Section image: ${section_title || prompt}`,
        quality_score: generatedImage.quality_score,
        safety_score: generatedImage.safety_score,
        asset_id: assetId,
        type,
        position
      },
      generation_time_seconds: imageResult.generation_time_seconds,
      provider: imageResult.provider,
      model: imageResult.model,
      cost: imageResult.cost
    });

  } catch (error) {
    logger.error('❌ Error in image generation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

