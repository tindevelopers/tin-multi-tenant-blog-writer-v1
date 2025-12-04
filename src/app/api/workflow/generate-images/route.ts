import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import { handlePhase2Completion } from '@/lib/workflow-phase-manager';

/**
 * Helper to upload base64 image data to Cloudinary via Blog Writer API
 */
async function uploadToCloudinary(
  base64Data: string,
  filename: string,
  folder: string,
  altText: string
): Promise<{ url: string; publicId: string } | null> {
  try {
    const apiUrl = BLOG_WRITER_API_URL;
    
    // Strip data URI prefix if present - backend expects raw base64
    let rawBase64 = base64Data;
    if (rawBase64.startsWith('data:')) {
      rawBase64 = rawBase64.split(',')[1] || rawBase64;
    }
    
    const response = await fetch(`${apiUrl}/api/v1/media/upload/cloudinary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BLOG_WRITER_API_KEY || ''}`,
      },
      body: JSON.stringify({
        media_data: rawBase64,
        filename,
        folder,
        alt_text: altText,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn('Cloudinary upload failed', { status: response.status, error: errorText.substring(0, 200) });
      return null;
    }

    const result = await response.json();
    const uploadedUrl = result.result?.url || result.secure_url || result.url;
    const publicId = result.result?.id || result.public_id;
    
    if (uploadedUrl) {
      logger.info('✅ Image uploaded to Cloudinary', { url: uploadedUrl.substring(0, 80) });
      return { url: uploadedUrl, publicId };
    }
    return null;
  } catch (error) {
    logger.error('Cloudinary upload error', { error });
    return null;
  }
}

/**
 * Helper to poll for async job completion and get base64 image data
 */
async function pollForJobCompletion(
  jobId: string,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<{ image_data?: string; image_url?: string; width?: number; height?: number } | null> {
  const apiUrl = BLOG_WRITER_API_URL;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    
    const statusResponse = await fetch(`${apiUrl}/api/v1/images/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.BLOG_WRITER_API_KEY || ''}`,
      },
    });
    
    if (!statusResponse.ok) {
      logger.debug(`Job poll attempt ${attempt}: Status check failed (${statusResponse.status})`);
      continue;
    }
    
    const statusResult = await statusResponse.json();
    logger.debug(`Job poll attempt ${attempt}: Status = ${statusResult.status}`);
    
    if (statusResult.status === 'completed') {
      // Extract image data from various response formats
      const images = statusResult.result?.images;
      if (images && images.length > 0) {
        return images[0];
      }
      return statusResult.result || statusResult;
    } else if (statusResult.status === 'failed') {
      logger.error('Image generation job failed', { error: statusResult.error_message });
      return null;
    }
  }
  
  logger.error('Image generation job timed out');
  return null;
}

/**
 * Generate image via Blog Writer API (async job) and upload to Cloudinary
 */
async function generateAndUploadImage(
  prompt: string,
  options: {
    width: number;
    height: number;
    aspectRatio: string;
    quality: string;
    style?: string;
    folder: string;
    filename: string;
    altText: string;
  }
): Promise<{ url: string; alt: string; width: number; height: number } | null> {
  const apiUrl = BLOG_WRITER_API_URL;
  
  try {
    // Step 1: Submit async image generation job
    logger.info('Submitting image generation job', { prompt: prompt.substring(0, 50) });
    
    const generateResponse = await fetch(`${apiUrl}/api/v1/images/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BLOG_WRITER_API_KEY || ''}`,
      },
      body: JSON.stringify({
        prompt,
        provider: 'stability_ai',
        style: options.style || 'photographic',
        aspect_ratio: options.aspectRatio,
        quality: options.quality,
        width: options.width,
        height: options.height,
        negative_prompt: 'blurry, low quality, watermark, text overlay, logo',
      }),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      logger.error('Image generation request failed', { status: generateResponse.status, error: errorText.substring(0, 200) });
      return null;
    }

    const generateResult = await generateResponse.json();
    
    // Step 2: Handle async job or sync response
    let imageData: { image_data?: string; image_url?: string; width?: number; height?: number } | null = null;
    
    if (generateResult.job_id) {
      // Async job - poll for completion
      logger.info('Image job queued, polling for completion', { jobId: generateResult.job_id });
      imageData = await pollForJobCompletion(generateResult.job_id);
    } else if (generateResult.images?.[0]) {
      // Sync response
      imageData = generateResult.images[0];
    } else if (generateResult.image_data || generateResult.image_url) {
      imageData = generateResult;
    }

    if (!imageData) {
      logger.error('No image data returned from generation');
      return null;
    }

    // Step 3: Upload to Cloudinary
    if (imageData.image_data) {
      // We have base64 data - upload to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(
        imageData.image_data,
        options.filename,
        options.folder,
        options.altText
      );
      
      if (cloudinaryResult) {
        return {
          url: cloudinaryResult.url,
          alt: options.altText,
          width: imageData.width || options.width,
          height: imageData.height || options.height,
        };
      }
      
      // Fallback to image_url if Cloudinary upload fails
      if (imageData.image_url) {
        logger.warn('Cloudinary upload failed, using temporary URL');
        return {
          url: imageData.image_url,
          alt: options.altText,
          width: imageData.width || options.width,
          height: imageData.height || options.height,
        };
      }
    } else if (imageData.image_url) {
      // No base64 data, fetch the URL and upload to Cloudinary
      try {
        const imageResponse = await fetch(imageData.image_url);
        if (imageResponse.ok) {
          const arrayBuffer = await imageResponse.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          
          const cloudinaryResult = await uploadToCloudinary(
            base64,
            options.filename,
            options.folder,
            options.altText
          );
          
          if (cloudinaryResult) {
            return {
              url: cloudinaryResult.url,
              alt: options.altText,
              width: imageData.width || options.width,
              height: imageData.height || options.height,
            };
          }
        }
      } catch (fetchError) {
        logger.warn('Failed to fetch image URL for Cloudinary upload', { error: fetchError });
      }
      
      // Fallback to temporary URL
      return {
        url: imageData.image_url,
        alt: options.altText,
        width: imageData.width || options.width,
        height: imageData.height || options.height,
      };
    }
    
    return null;
  } catch (error) {
    logger.error('Image generation and upload error', { error });
    return null;
  }
}

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
      header_image?: { url: string; alt: string; width?: number; height?: number }; // Header image for Webflow
      thumbnail_image?: { url: string; alt: string; width?: number; height?: number }; // Thumbnail image
      content_images?: Array<{ url: string; alt: string; position?: number; width?: number; height?: number }>;
      post_id?: string;
    } = {};

    const keywordText = keywords?.length > 0 
      ? ` featuring ${keywords.slice(0, 3).join(', ')}` 
      : '';

    // Generate Header/Hero Image (16:9, 1920x1080) - for Webflow header + upload to Cloudinary
    if (generate_featured) {
      try {
        const headerPrompt = contentAnalysis?.headerPrompt || 
          `Professional blog post header image: ${title || topic}${keywordText}, high quality, modern design, clean background, hero image`;
        
        const timestamp = Date.now();
        const headerImage = await generateAndUploadImage(headerPrompt, {
          width: 1920,
          height: 1080,
          aspectRatio: '16:9',
          quality: 'high',
          style: style || 'photographic',
          folder: `blog-images/${queue_id}/headers`,
          filename: `header_${timestamp}.png`,
          altText: `Header image for ${title || topic}`,
        });

        if (headerImage) {
          results.header_image = headerImage;
          // Also set as featured_image for backward compatibility
          results.featured_image = headerImage;
          logger.info('✅ Header image generated and uploaded to Cloudinary');
        } else {
          logger.warn('Header image generation failed, continuing without image');
        }
      } catch (imgError: unknown) {
        const errorMessage = imgError instanceof Error ? imgError.message : String(imgError);
        logger.warn('Header image generation error', { error: errorMessage });
        // Continue without header image
      }
    }

    // Generate Thumbnail Image (1:1, 400x400) - for Webflow thumbnail + upload to Cloudinary
    if (generate_thumbnail) {
      try {
        const thumbnailPrompt = contentAnalysis?.thumbnailPrompt || 
          `Square thumbnail image for blog post: ${title || topic}${keywordText}, modern, clean, professional, 1:1 aspect ratio`;
        
        const timestamp = Date.now();
        const thumbnailImage = await generateAndUploadImage(thumbnailPrompt, {
          width: 400,
          height: 400,
          aspectRatio: '1:1',
          quality: 'standard',
          style: style || 'photographic',
          folder: `blog-images/${queue_id}/thumbnails`,
          filename: `thumbnail_${timestamp}.png`,
          altText: `Thumbnail for ${title || topic}`,
        });

        if (thumbnailImage) {
          results.thumbnail_image = thumbnailImage;
          logger.info('✅ Thumbnail image generated and uploaded to Cloudinary');
        } else {
          logger.warn('Thumbnail image generation failed, continuing without thumbnail');
        }
      } catch (imgError: unknown) {
        const errorMessage = imgError instanceof Error ? imgError.message : String(imgError);
        logger.warn('Thumbnail image generation error', { error: errorMessage });
        // Continue without thumbnail
      }
    }

    // Generate Content Images - contextual to blog sections + upload to Cloudinary
    if (generate_content_images && contentAnalysis) {
      results.content_images = [];
      const sectionsToImage = contentAnalysis.sections.slice(0, contentAnalysis.imageCount);
      
      logger.info('Generating content images for sections', {
        sectionCount: sectionsToImage.length,
      });

      // Generate images for each section (in sequence to avoid rate limits)
      for (const section of sectionsToImage) {
        try {
          const sectionPrompt = `Blog post image illustrating: ${section.heading}. ${section.text.substring(0, 200)}, professional, relevant to content`;
          
          const timestamp = Date.now();
          const contentImage = await generateAndUploadImage(sectionPrompt, {
            width: 1200,
            height: 675,
            aspectRatio: '16:9',
            quality: 'standard',
            style: style || 'photographic',
            folder: `blog-images/${queue_id}/content`,
            filename: `content_${section.position}_${timestamp}.png`,
            altText: `Image for ${section.heading}`,
          });

          if (contentImage) {
            results.content_images.push({
              ...contentImage,
              position: section.position,
            });
            logger.info('✅ Content image generated and uploaded to Cloudinary', { section: section.heading });
          }
        } catch (imgError: unknown) {
          const errorMessage = imgError instanceof Error ? imgError.message : String(imgError);
          logger.warn('Content image generation error for section', {
            section: section.heading,
            error: errorMessage,
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

