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
  // Declare queueId outside try block so it's accessible in catch block
  let queueId: string | null = null;
  
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
    const supabase = await createClient();

    if (!orgId) {
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

    // Create queue entry before generation starts
    if (orgId && userId) {
      try {
        logger.debug('📋 Creating queue entry for image generation...');
        const keywordsArray = Array.isArray(keywords) ? keywords : (keywords ? [keywords] : []);
        const { data: queueItem, error: queueError } = await supabase
          .from('image_generation_queue')
          .insert({
            org_id: orgId,
            created_by: userId,
            prompt: prompt,
            style: style,
            aspect_ratio: aspect_ratio,
            quality: quality,
            type: type,
            blog_topic: blog_topic,
            keywords: keywordsArray,
            section_title: section_title,
            position: position,
            priority: 5, // Default priority
            status: 'generating',
            progress_percentage: 0,
            generation_started_at: new Date().toISOString(),
            metadata: {
              style,
              aspect_ratio,
              quality,
              type,
              blog_topic,
              keywords: keywordsArray,
              section_title,
              position
            }
          })
          .select('queue_id')
          .single();
        
        if (queueError) {
          logger.warn('⚠️ Failed to create queue entry:', queueError);
          // Continue without queue entry (non-blocking)
        } else if (queueItem) {
          queueId = queueItem.queue_id;
          logger.debug('✅ Queue entry created:', queueId);
        }
      } catch (error) {
        logger.warn('⚠️ Error creating queue entry:', error);
        // Continue without queue entry (non-blocking)
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
      
      // Update queue entry with error if queue exists
      if (queueId) {
        try {
          await supabase
            .from('image_generation_queue')
            .update({
              status: 'failed',
              generation_error: `API error ${imageResponse.status}: ${errorText.substring(0, 500)}`,
              generation_completed_at: new Date().toISOString()
            })
            .eq('queue_id', queueId);
        } catch (error) {
          logger.warn('⚠️ Failed to update queue entry with error:', error);
        }
      }
      
      return NextResponse.json(
        { error: `Image generation failed: ${imageResponse.status} ${errorText}` },
        { status: imageResponse.status }
      );
    }

    const imageResult = await imageResponse.json();

    if (!imageResult.success || !imageResult.images || imageResult.images.length === 0) {
      logger.error('❌ Image generation returned no images:', imageResult.error_message);
      
      // Update queue entry with error if queue exists
      if (queueId) {
        try {
          await supabase
            .from('image_generation_queue')
            .update({
              status: 'failed',
              generation_error: imageResult.error_message || 'Image generation returned no images',
              generation_completed_at: new Date().toISOString()
            })
            .eq('queue_id', queueId);
        } catch (error) {
          logger.warn('⚠️ Failed to update queue entry with error:', error);
        }
      }
      
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

    // Update queue entry with success results
    if (queueId) {
      try {
        const altText = type === 'featured' 
          ? `Featured image for ${blog_topic || prompt}`
          : `Section image: ${section_title || prompt}`;
        
        await supabase
          .from('image_generation_queue')
          .update({
            status: 'generated',
            progress_percentage: 100,
            generated_image_url: cloudinaryUrl,
            generated_image_id: generatedImage.image_id,
            image_width: generatedImage.width,
            image_height: generatedImage.height,
            image_format: generatedImage.format,
            alt_text: altText,
            quality_score: generatedImage.quality_score,
            safety_score: generatedImage.safety_score,
            asset_id: assetId,
            generation_completed_at: new Date().toISOString(),
            metadata: {
              style,
              aspect_ratio,
              quality,
              type,
              blog_topic,
              keywords: Array.isArray(keywords) ? keywords : (keywords ? [keywords] : []),
              section_title,
              position,
              provider: imageResult.provider,
              model: imageResult.model,
              cost: imageResult.cost,
              generation_time_seconds: imageResult.generation_time_seconds
            }
          })
          .eq('queue_id', queueId);
        
        logger.debug('✅ Queue entry updated with success results');
      } catch (error) {
        logger.warn('⚠️ Failed to update queue entry with success:', error);
      }
    }

    return NextResponse.json({
      success: true,
      queue_id: queueId, // Include queue_id in response
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
    
    // Update queue entry with error if queue exists
    if (queueId) {
      try {
        const supabase = await createClient();
        await supabase
          .from('image_generation_queue')
          .update({
            status: 'failed',
            generation_error: error instanceof Error ? error.message : 'Internal server error',
            generation_completed_at: new Date().toISOString()
          })
          .eq('queue_id', queueId);
      } catch (updateError) {
        logger.warn('⚠️ Failed to update queue entry with error:', updateError);
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

