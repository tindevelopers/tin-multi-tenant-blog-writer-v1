import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { imageGenerator } from '@/lib/image-generation';
import { detectImagePlaceholders, generateImagePrompt } from '@/lib/content-formatting';

/**
 * Generate images for placeholders in blog content
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: queueId } = await params;
    const body = await request.json();
    const { content, topic, keywords = [] } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    logger.debug('🖼️ Generating images for placeholders', {
      queueId,
      contentLength: content?.length,
      topic,
    });

    // Detect image placeholders
    const placeholders = detectImagePlaceholders(content);
    
    if (placeholders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No image placeholders found',
        images: [],
      });
    }

    logger.debug(`Found ${placeholders.length} image placeholders`);

    // Generate images for each placeholder
    const imageResults = await Promise.allSettled(
      placeholders.map(async (placeholder) => {
        try {
          const prompt = generateImagePrompt(placeholder, topic, keywords);
          
          logger.debug('Generating image', {
            placeholder: placeholder.description,
            prompt,
          });

          const response = await imageGenerator.generateImage({
            prompt,
            style: 'photographic',
            aspect_ratio: '16:9',
            quality: 'high',
            width: 1920,
            height: 1080,
            negative_prompt: 'blurry, low quality, watermark, text overlay, logo, distorted',
          });

          if (!response.success || response.images.length === 0) {
            throw new Error(response.error_message || 'Image generation failed');
          }

          const image = response.images[0];
          
          return {
            placeholder,
            image,
            success: true,
          };
        } catch (error) {
          logger.error('Error generating image for placeholder:', {
            placeholder: placeholder.description,
            error: error instanceof Error ? error.message : String(error),
          });
          
          return {
            placeholder,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // Process results
    const successfulImages = imageResults
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled' && result.value.success)
      .map(result => result.value);

    const failedImages = imageResults
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled' && !result.value.success)
      .map(result => result.value);

    logger.debug('Image generation complete', {
      successful: successfulImages.length,
      failed: failedImages.length,
    });

    return NextResponse.json({
      success: true,
      images: successfulImages.map(({ placeholder, image }) => ({
        placeholder: {
          type: placeholder.type,
          description: placeholder.description,
          position: placeholder.position,
          originalText: placeholder.originalText,
        },
        image: {
          image_id: image.image_id,
          image_url: image.image_url,
          width: image.width,
          height: image.height,
          format: image.format,
        },
      })),
      failed: failedImages.map(({ placeholder, error }) => ({
        placeholder: {
          description: placeholder.description,
          position: placeholder.position,
        },
        error,
      })),
      totalPlaceholders: placeholders.length,
      successfulCount: successfulImages.length,
      failedCount: failedImages.length,
    });
  } catch (error) {
    logger.error('❌ Error in generate-images:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

