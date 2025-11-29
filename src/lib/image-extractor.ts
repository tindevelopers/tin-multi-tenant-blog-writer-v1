/**
 * Image Extractor Utility
 * 
 * Extracts image URLs from blog content, specifically Cloudinary URLs
 */

import { logger } from '@/utils/logger';

export interface ExtractedImage {
  url: string;
  altText: string | null;
  type: 'cloudinary' | 'external' | 'base64' | 'unknown';
  position: number;
  element: 'img' | 'figure';
  metadata?: {
    publicId?: string;
    transformation?: string;
  };
}

/**
 * Extract all images from HTML content
 */
export function extractImagesFromContent(htmlContent: string): ExtractedImage[] {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return [];
  }

  try {
    const images: ExtractedImage[] = [];
    let position = 0;

    // Parse HTML using DOMParser (browser) or regex (server)
    if (typeof window !== 'undefined') {
      // Browser: Use DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Extract img tags
      const imgTags = doc.querySelectorAll('img');
      imgTags.forEach((img) => {
        const src = img.getAttribute('src') || '';
        if (src) {
          position++;
          images.push({
            url: src,
            altText: img.getAttribute('alt'),
            type: detectImageType(src),
            position,
            element: 'img',
            metadata: extractCloudinaryMetadata(src),
          });
        }
      });

      // Extract figure tags with images
      const figureTags = doc.querySelectorAll('figure img');
      figureTags.forEach((img) => {
        const src = img.getAttribute('src') || '';
        if (src && !images.some(i => i.url === src)) {
          position++;
          const figure = img.closest('figure');
          const caption = figure?.querySelector('figcaption')?.textContent || null;
          
          images.push({
            url: src,
            altText: img.getAttribute('alt') || caption,
            type: detectImageType(src),
            position,
            element: 'figure',
            metadata: extractCloudinaryMetadata(src),
          });
        }
      });
    } else {
      // Server: Use regex (less accurate but works)
      const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      const figureRegex = /<figure[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>[\s\S]*?<\/figure>/gi;
      
      let match;
      
      // Extract img tags
      while ((match = imgRegex.exec(htmlContent)) !== null) {
        const src = match[1];
        if (src) {
          position++;
          const altMatch = match[0].match(/alt=["']([^"']*)["']/i);
          
          images.push({
            url: src,
            altText: altMatch ? altMatch[1] : null,
            type: detectImageType(src),
            position,
            element: 'img',
            metadata: extractCloudinaryMetadata(src),
          });
        }
      }
      
      // Extract figure tags
      while ((match = figureRegex.exec(htmlContent)) !== null) {
        const src = match[1];
        if (src && !images.some(i => i.url === src)) {
          position++;
          const captionMatch = match[0].match(/<figcaption[^>]*>([^<]+)<\/figcaption>/i);
          
          images.push({
            url: src,
            altText: captionMatch ? captionMatch[1] : null,
            type: detectImageType(src),
            position,
            element: 'figure',
            metadata: extractCloudinaryMetadata(src),
          });
        }
      }
    }

    logger.debug('Extracted images from content', {
      count: images.length,
      cloudinaryCount: images.filter(i => i.type === 'cloudinary').length,
    });

    return images;
  } catch (error) {
    logger.error('Error extracting images from content', { error });
    return [];
  }
}

/**
 * Detect image type from URL
 */
function detectImageType(url: string): ExtractedImage['type'] {
  if (url.includes('res.cloudinary.com') || url.includes('cloudinary.com')) {
    return 'cloudinary';
  }
  if (url.startsWith('data:')) {
    return 'base64';
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return 'external';
  }
  return 'unknown';
}

/**
 * Extract Cloudinary metadata from URL
 */
function extractCloudinaryMetadata(url: string): ExtractedImage['metadata'] | undefined {
  if (!url.includes('cloudinary.com')) {
    return undefined;
  }

  try {
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}.{format}
    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) {
      return undefined;
    }

    const publicIdWithFormat = urlParts.slice(uploadIndex + 1).join('/');
    const publicId = publicIdWithFormat.replace(/\.[^.]+$/, ''); // Remove extension
    const transformations = urlParts[uploadIndex + 1] || '';

    return {
      publicId,
      transformation: transformations !== publicId ? transformations : undefined,
    };
  } catch (error) {
    logger.warn('Error extracting Cloudinary metadata', { url, error });
    return undefined;
  }
}

/**
 * Extract featured image from content (first image or image with 'featured' class)
 */
export function extractFeaturedImage(content: string): ExtractedImage | null {
  const images = extractImagesFromContent(content);
  
  if (images.length === 0) {
    return null;
  }

  // Look for featured image (has 'featured' in class or alt text)
  const featuredImage = images.find(img => 
    img.altText?.toLowerCase().includes('featured') ||
    img.url.toLowerCase().includes('featured')
  );

  return featuredImage || images[0] || null;
}

