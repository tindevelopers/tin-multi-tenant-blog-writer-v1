import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

/**
 * POST /api/workflow/generate-images
 * 
 * Phase 2: Generate featured and content images
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic,
      keywords,
      title,
      generate_featured,
      generate_content_images,
      style,
    } = body;

    logger.info('Phase 2: Starting image generation', { topic, style });

    const results: {
      featured_image?: { url: string; alt: string; width?: number; height?: number };
      content_images?: Array<{ url: string; alt: string }>;
    } = {};

    // Generate featured image
    if (generate_featured) {
      try {
        const apiUrl = BLOG_WRITER_API_URL;
        const keywordText = keywords?.length > 0 
          ? ` featuring ${keywords.slice(0, 3).join(', ')}` 
          : '';
        
        const prompt = `Professional blog post featured image: ${title || topic}${keywordText}, high quality, modern design, clean background`;

        const response = await fetch(`${apiUrl}/api/v1/images/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BLOG_WRITER_API_KEY || ''}`,
          },
          body: JSON.stringify({
            prompt,
            provider: 'stability_ai',
            style: style || 'photographic',
            aspect_ratio: '16:9',
            quality: 'high',
            width: 1920,
            height: 1080,
            negative_prompt: 'blurry, low quality, watermark, text overlay, logo',
          }),
        });

        if (response.ok) {
          const imageData = await response.json();
          if (imageData.success && imageData.images?.length > 0) {
            const image = imageData.images[0];
            results.featured_image = {
              url: image.image_url || '',
              alt: `Featured image for ${title || topic}`,
              width: image.width,
              height: image.height,
            };
            logger.info('Featured image generated successfully');
          }
        } else {
          logger.warn('Featured image generation failed, continuing without image');
        }
      } catch (imgError: any) {
        logger.warn('Featured image generation error', { error: imgError.message });
        // Continue without featured image
      }
    }

    // Generate content images (placeholder - can be expanded)
    if (generate_content_images) {
      results.content_images = [];
      // Could generate additional images for content sections
    }

    logger.info('Phase 2: Image generation completed', {
      hasFeaturedImage: !!results.featured_image,
      contentImagesCount: results.content_images?.length || 0,
    });

    return NextResponse.json(results);

  } catch (error: any) {
    logger.error('Phase 2 error', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Image generation failed' },
      { status: 500 }
    );
  }
}

