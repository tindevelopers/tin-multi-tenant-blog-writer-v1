/**
 * Enhanced Fields Service
 * Calls the backend API to enhance mandatory CMS fields using OpenAI
 */

import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

export interface FieldEnhancementRequest {
  title: string;
  content?: string;
  featured_image_url?: string;
  enhance_seo_title?: boolean;
  enhance_meta_description?: boolean;
  enhance_slug?: boolean;
  enhance_image_alt?: boolean;
  keywords?: string[];
  target_audience?: string;
}

export interface FieldEnhancementResponse {
  enhanced_fields: {
    seo_title?: string;
    meta_description?: string;
    slug?: string;
    featured_image_alt?: string;
  };
  original_fields: {
    title: string;
    content?: string;
    featured_image_url?: string;
  };
  enhanced_at: string;
  provider: string;
  model?: string;
}

/**
 * Enhance mandatory CMS fields using OpenAI
 * This should be called before publishing to Webflow to ensure all fields are optimized
 */
export async function enhanceBlogFields(
  request: FieldEnhancementRequest
): Promise<FieldEnhancementResponse> {
  try {
    const endpoint = `${BLOG_WRITER_API_URL}/api/v1/content/enhance-fields`;
    
    logger.debug('Calling enhanced fields endpoint', {
      endpoint,
      title: request.title,
      hasContent: !!request.content,
      hasFeaturedImage: !!request.featured_image_url,
      enhanceFlags: {
        seo_title: request.enhance_seo_title ?? true,
        meta_description: request.enhance_meta_description ?? true,
        slug: request.enhance_slug ?? true,
        image_alt: request.enhance_image_alt ?? true,
      },
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: request.title,
        content: request.content,
        featured_image_url: request.featured_image_url,
        enhance_seo_title: request.enhance_seo_title ?? true,
        enhance_meta_description: request.enhance_meta_description ?? true,
        enhance_slug: request.enhance_slug ?? true,
        enhance_image_alt: request.enhance_image_alt ?? true,
        keywords: request.keywords,
        target_audience: request.target_audience,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      const errorMessage = errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
      
      // Log specific error cases
      if (response.status === 503) {
        logger.warn('OpenAI not configured in backend, skipping field enhancement', {
          error: errorMessage,
        });
        throw new Error('OpenAI API key is not configured in backend. Field enhancement skipped.');
      }
      
      logger.error('Enhanced fields endpoint error', {
        status: response.status,
        error: errorMessage,
        endpoint,
      });
      throw new Error(`Failed to enhance fields: ${errorMessage}`);
    }

    const data: FieldEnhancementResponse = await response.json();
    
    logger.debug('Successfully enhanced fields', {
      hasSeoTitle: !!data.enhanced_fields.seo_title,
      hasMetaDescription: !!data.enhanced_fields.meta_description,
      hasSlug: !!data.enhanced_fields.slug,
      hasImageAlt: !!data.enhanced_fields.featured_image_alt,
      provider: data.provider,
      model: data.model,
    });

    return data;
  } catch (error: any) {
    logger.error('Error enhancing blog fields', {
      error: error.message,
      title: request.title,
    });
    throw error;
  }
}

