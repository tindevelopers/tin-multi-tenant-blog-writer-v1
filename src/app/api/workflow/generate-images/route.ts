import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import { handlePhase2Completion } from '@/lib/workflow-phase-manager';

/**
 * POST /api/workflow/generate-images
 * 
 * Phase 2: Generate featured and content images
 * Automatically updates draft with generated images
 */
/**
 * Analyze blog content to extract sections and determine image needs
 */
function analyzeContentForImages(content: string, title: string): {
  sections: Array<{ heading: string; text: string; position: number }>;
  imageCount: number;
  thumbnailPrompt: string;
  headerPrompt: string;
} {
  // Extract headings and their content
  const sections: Array<{ heading: string; text: string; position: number }> = [];
  const headingRegex = /<h([1-3])[^>]*>(.*?)<\/h[1-3]>/gi;
  let match;
  let position = 0;

  while ((match = headingRegex.exec(content)) !== null) {
    const headingText = match[2].replace(/<[^>]+>/g, '').trim();
    if (headingText) {
      // Extract text content after this heading until next heading
      const startPos = match.index + match[0].length;
      const nextHeadingMatch = content.substring(startPos).match(/<h[1-3][^>]*>/i);
      const endPos = nextHeadingMatch && nextHeadingMatch.index !== undefined
        ? startPos + nextHeadingMatch.index
        : Math.min(startPos + 500, content.length);
      
      const sectionText = content.substring(startPos, endPos)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 300);
      
      sections.push({
        heading: headingText,
        text: sectionText,
        position: position++,
      });
    }
  }

  // Determine image count based on content length and sections
  const wordCount = content.replace(/<[^>]+>/g, ' ').split(/\s+/).length;
  const imageCount = Math.min(Math.max(Math.floor(wordCount / 500), 2), 6); // 2-6 images based on length

  // Generate prompts
  const cleanTitle = title.replace(/<[^>]+>/g, '').trim();
  const thumbnailPrompt = `Square thumbnail image for blog post: ${cleanTitle}, modern, clean, professional`;
  const headerPrompt = `Wide hero image for blog post: ${cleanTitle}, professional, high quality, modern design, 16:9 aspect ratio`;

  return {
    sections,
    imageCount,
    thumbnailPrompt,
    headerPrompt,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic,
      keywords,
      title,
      content, // NEW: Read blog content
      excerpt,
      generate_featured = true,
      generate_content_images = true,
      generate_thumbnail = true, // NEW: Generate thumbnail
      style,
      queue_id, // Required for draft updates
    } = body;

    if (!queue_id) {
      return NextResponse.json(
        { error: 'queue_id is required for Phase 2' },
        { status: 400 }
      );
    }

    // Analyze content if provided
    let contentAnalysis: ReturnType<typeof analyzeContentForImages> | null = null;
    if (content && typeof content === 'string' && content.trim().length > 0) {
      contentAnalysis = analyzeContentForImages(content, title || topic || 'Blog Post');
      logger.info('Phase 2: Content analyzed for images', {
        sectionsFound: contentAnalysis.sections.length,
        imageCount: contentAnalysis.imageCount,
      });
    }

    logger.info('Phase 2: Starting image generation', { 
      topic, 
      style, 
      queue_id,
      hasContent: !!content,
      willGenerateThumbnail: generate_thumbnail,
    });

    const results: {
      featured_image?: { url: string; alt: string; width?: number; height?: number };
      header_image?: { url: string; alt: string; width?: number; height?: number }; // NEW: Header image
      thumbnail_image?: { url: string; alt: string; width?: number; height?: number }; // NEW: Thumbnail
      content_images?: Array<{ url: string; alt: string; position?: number }>;
      post_id?: string;
    } = {};

    const apiUrl = BLOG_WRITER_API_URL;
    const keywordText = keywords?.length > 0 
      ? ` featuring ${keywords.slice(0, 3).join(', ')}` 
      : '';

    // Generate Header/Hero Image (16:9, 1920x1080) - for Webflow header
    if (generate_featured) {
      try {
        const headerPrompt = contentAnalysis?.headerPrompt || 
          `Professional blog post header image: ${title || topic}${keywordText}, high quality, modern design, clean background, hero image`;
        
        const response = await fetch(`${apiUrl}/api/v1/images/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BLOG_WRITER_API_KEY || ''}`,
          },
          body: JSON.stringify({
            prompt: headerPrompt,
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
            results.header_image = {
              url: image.image_url || '',
              alt: `Header image for ${title || topic}`,
              width: image.width || 1920,
              height: image.height || 1080,
            };
            // Also set as featured_image for backward compatibility
            results.featured_image = results.header_image;
            logger.info('Header image generated successfully');
          }
        } else {
          logger.warn('Header image generation failed, continuing without image');
        }
      } catch (imgError: any) {
        logger.warn('Header image generation error', { error: imgError.message });
        // Continue without header image
      }
    }

    // Generate Thumbnail Image (1:1, 400x400) - for Webflow thumbnail
    if (generate_thumbnail) {
      try {
        const thumbnailPrompt = contentAnalysis?.thumbnailPrompt || 
          `Square thumbnail image for blog post: ${title || topic}${keywordText}, modern, clean, professional, 1:1 aspect ratio`;
        
        const response = await fetch(`${apiUrl}/api/v1/images/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BLOG_WRITER_API_KEY || ''}`,
          },
          body: JSON.stringify({
            prompt: thumbnailPrompt,
            provider: 'stability_ai',
            style: style || 'photographic',
            aspect_ratio: '1:1',
            quality: 'standard',
            width: 400,
            height: 400,
            negative_prompt: 'blurry, low quality, watermark, text overlay, logo',
          }),
        });

        if (response.ok) {
          const imageData = await response.json();
          if (imageData.success && imageData.images?.length > 0) {
            const image = imageData.images[0];
            results.thumbnail_image = {
              url: image.image_url || '',
              alt: `Thumbnail for ${title || topic}`,
              width: image.width || 400,
              height: image.height || 400,
            };
            logger.info('Thumbnail image generated successfully');
          }
        } else {
          logger.warn('Thumbnail image generation failed, continuing without thumbnail');
        }
      } catch (imgError: any) {
        logger.warn('Thumbnail image generation error', { error: imgError.message });
        // Continue without thumbnail
      }
    }

    // Generate Content Images - contextual to blog sections
    if (generate_content_images && contentAnalysis) {
      results.content_images = [];
      const sectionsToImage = contentAnalysis.sections.slice(0, contentAnalysis.imageCount);
      
      logger.info('Generating content images for sections', {
        sectionCount: sectionsToImage.length,
      });

      // Generate images for each section
      for (const section of sectionsToImage) {
        try {
          const sectionPrompt = `Blog post image illustrating: ${section.heading}. ${section.text.substring(0, 200)}, professional, relevant to content`;
          
          const response = await fetch(`${apiUrl}/api/v1/images/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.BLOG_WRITER_API_KEY || ''}`,
            },
            body: JSON.stringify({
              prompt: sectionPrompt,
              provider: 'stability_ai',
              style: style || 'photographic',
              aspect_ratio: '16:9',
              quality: 'standard',
              width: 1200,
              height: 675,
              negative_prompt: 'blurry, low quality, watermark, text overlay, logo',
            }),
          });

          if (response.ok) {
            const imageData = await response.json();
            if (imageData.success && imageData.images?.length > 0) {
              const image = imageData.images[0];
              results.content_images.push({
                url: image.image_url || '',
                alt: `Image for ${section.heading}`,
                position: section.position,
              });
              logger.info('Content image generated', { section: section.heading });
            }
          }
        } catch (imgError: any) {
          logger.warn('Content image generation error for section', {
            section: section.heading,
            error: imgError.message,
          });
          // Continue with other sections
        }
      }
      
      logger.info('Content images generation completed', {
        generated: results.content_images.length,
        requested: sectionsToImage.length,
      });
    } else if (generate_content_images) {
      // Fallback if no content analysis
      results.content_images = [];
      logger.warn('Content images requested but no content provided for analysis');
    }

    // Auto-update draft with images
    if (queue_id && (results.featured_image || results.header_image || results.thumbnail_image || results.content_images?.length)) {
      try {
        const phaseResult = await handlePhase2Completion(queue_id, {
          featured_image: results.header_image || results.featured_image, // Use header_image as featured
          content_images: results.content_images,
          thumbnail_image: results.thumbnail_image, // NEW: Include thumbnail
        });

        if (phaseResult.success && phaseResult.post_id) {
          logger.info('✅ Phase 2: Draft updated with images', {
            queue_id,
            post_id: phaseResult.post_id,
          });
          (results as any).post_id = phaseResult.post_id;
        } else {
          logger.warn('⚠️ Phase 2: Draft update failed (non-critical)', {
            queue_id,
            error: phaseResult.error,
          });
        }
      } catch (updateError: any) {
        logger.warn('⚠️ Phase 2: Draft update error (non-critical)', {
          queue_id,
          error: updateError.message,
        });
        // Don't fail the entire request if draft update fails
      }
    }

    logger.info('Phase 2: Image generation completed', {
      hasFeaturedImage: !!results.featured_image,
      contentImagesCount: results.content_images?.length || 0,
      draftUpdated: !!results.post_id,
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

