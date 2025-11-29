/**
 * Frontend Client for LLM Analysis Service
 * 
 * Makes requests to Next.js API routes which proxy to OpenAI
 */

import { logger } from '@/utils/logger';
import type { BlogAnalysisRequest, BlogAnalysisResponse } from './llm-analysis-service';

export class LLMAnalysisClient {
  /**
   * Analyze blog content and generate optimized fields
   */
  async analyzeBlogContent(
    request: BlogAnalysisRequest
  ): Promise<BlogAnalysisResponse & { fallback?: boolean; message?: string }> {
    try {
      logger.debug('Calling LLM analysis API', {
        title: request.title,
        contentLength: request.content.length,
        imageCount: request.images?.length || 0,
      });

      const response = await fetch('/api/llm/analyze-blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `LLM analysis API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      
      logger.debug('LLM analysis completed', {
        fallback: data.fallback,
        seoTitle: data.data?.seoTitle,
        imageDescriptionsCount: data.data?.imageDescriptions?.length || 0,
      });

      return {
        ...data.data,
        fallback: data.fallback,
        message: data.message,
      };
    } catch (error) {
      logger.error('Error calling LLM analysis API', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const llmAnalysisClient = new LLMAnalysisClient();

