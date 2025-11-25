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
   */
  async generateMetaTags(
    text: string,
    language: string = 'en'
  ): Promise<{ meta_title: string; meta_description: string }> {
    try {
      const response = await fetch('/api/dataforseo/content/generate-meta-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
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
      return {
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
      };
    } catch (error) {
      logger.error('Error generating meta tags with DataForSEO', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const dataForSEOContentGenerationClient = new DataForSEOContentGenerationClient();

