/**
 * Frontend Client for DataForSEO Content Generation API
 * 
 * This client makes requests to our Next.js API routes which proxy to DataForSEO
 * to keep credentials secure on the server side.
 */

import { logger } from '@/utils/logger';

export interface GenerateBlogContentRequest {
  topic: string;
  keywords: string[];
  target_audience?: string;
  tone?: 'professional' | 'casual' | 'academic' | 'conversational' | 'instructional';
  word_count?: number;
  language?: string;
}

export interface GenerateBlogContentResponse {
  success: boolean;
  content: string;
  subtopics: string[];
  meta_title?: string;
  meta_description?: string;
  cost: number;
  word_count: number;
  fallback?: boolean;
  message?: string;
}

export class DataForSEOContentGenerationClient {
  /**
   * Generate blog content using DataForSEO Content Generation API
   */
  async generateBlogContent(
    request: GenerateBlogContentRequest
  ): Promise<GenerateBlogContentResponse> {
    try {
      logger.debug('Calling DataForSEO blog generation API', {
        topic: request.topic,
        keywordCount: request.keywords.length,
      });

      const response = await fetch('/api/dataforseo/content/generate-blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `DataForSEO API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      
      logger.debug('DataForSEO blog content generated', {
        contentLength: data.content?.length || 0,
        subtopicsCount: data.subtopics?.length || 0,
        cost: data.cost,
        fallback: data.fallback,
      });

      return data;
    } catch (error) {
      logger.error('Error generating blog content with DataForSEO', { error });
      throw error;
    }
  }

  /**
   * Generate subtopics from text
   */
  async generateSubtopics(
    text: string,
    maxSubtopics: number = 10,
    language: string = 'en'
  ): Promise<string[]> {
    try {
      const response = await fetch('/api/dataforseo/content/generate-subtopics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          max_subtopics: maxSubtopics,
          language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `DataForSEO API error: ${response.status}`
        );
      }

      const data = await response.json();
      return data.subtopics || [];
    } catch (error) {
      logger.error('Error generating subtopics with DataForSEO', { error });
      throw error;
    }
  }

  /**
   * Generate meta tags (title and description)
   * Returns fallback values if DataForSEO is unavailable
   */
  async generateMetaTags(
    text: string,
    language: string = 'en',
    title?: string
  ): Promise<{ meta_title: string; meta_description: string; fallback?: boolean; message?: string }> {
    try {
      const response = await fetch('/api/dataforseo/content/generate-meta-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          title,
          language,
        }),
      });

      if (!response.ok) {
        // Try to get error details, but don't fail completely
        const errorData = await response.json().catch(() => ({}));
        
        // If it's a server error (500), use fallback extraction
        if (response.status >= 500) {
          logger.warn('DataForSEO API server error, using fallback', {
            status: response.status,
            error: errorData.error,
          });
          
          // Use fallback extraction
          return this.extractMetaTagsFallback(text, title);
        }
        
        throw new Error(
          errorData.error || `DataForSEO API error: ${response.status}`
        );
      }

      const data = await response.json();
      
      // Check if fallback was used
      if (data.fallback) {
        logger.info('DataForSEO fallback used for meta tags', {
          message: data.message,
        });
      }
      
      return {
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        fallback: data.fallback || false,
        message: data.message,
      };
    } catch (error: any) {
      logger.error('Error generating meta tags with DataForSEO', { error });
      
      // Use fallback extraction instead of throwing
      logger.info('Using fallback meta tag extraction', {
        error: error.message,
      });
      
      return this.extractMetaTagsFallback(text, title);
    }
  }

  /**
   * Fallback function to extract meta tags from content
   */
  private extractMetaTagsFallback(
    text: string,
    title?: string
  ): { meta_title: string; meta_description: string; fallback: boolean; message: string } {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Generate SEO title from title or first 60 characters
    let metaTitle = title || cleanText.substring(0, 60);
    if (metaTitle.length > 60) {
      metaTitle = metaTitle.substring(0, 57) + '...';
    }
    
    // Generate meta description from first 155 characters
    let metaDescription = cleanText.substring(0, 155);
    if (cleanText.length > 155) {
      // Try to end at a sentence boundary
      const lastPeriod = metaDescription.lastIndexOf('.');
      const lastSpace = metaDescription.lastIndexOf(' ');
      if (lastPeriod > 120) {
        metaDescription = cleanText.substring(0, lastPeriod + 1);
      } else if (lastSpace > 120) {
        metaDescription = cleanText.substring(0, lastSpace) + '...';
      } else {
        metaDescription = cleanText.substring(0, 152) + '...';
      }
    }
    
    return {
      meta_title: metaTitle,
      meta_description: metaDescription,
      fallback: true,
      message: 'DataForSEO unavailable. Using content extraction fallback.',
    };
  }
}

// Export singleton instance
export const dataForSEOContentGenerationClient = new DataForSEOContentGenerationClient();
