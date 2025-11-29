/**
 * LLM Analysis Service
 * 
 * Uses OpenAI GPT-4 to analyze blog content and generate:
 * - SEO-optimized meta tags
 * - Image descriptions (alt text)
 * - Content suggestions
 * - Field recommendations
 */

import { logger } from '@/utils/logger';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface BlogAnalysisRequest {
  title: string;
  content: string;
  images?: Array<{
    url: string;
    type?: string;
    position?: number;
  }>;
  existingFields?: {
    excerpt?: string;
    slug?: string;
    seoTitle?: string;
    metaDescription?: string;
    featuredImage?: string;
    featuredImageAlt?: string;
  };
}

export interface BlogAnalysisResponse {
  // SEO Fields
  seoTitle: string;
  metaDescription: string;
  excerpt: string;
  slug: string;
  
  // Image Analysis
  imageDescriptions: Array<{
    url: string;
    altText: string;
    description: string;
    suggestedCaption?: string;
  }>;
  
  // Content Suggestions
  suggestions: {
    missingFields: string[];
    recommendations: string[];
    improvements: string[];
  };
  
  // Additional Metadata
  estimatedReadTime: number;
  wordCount: number;
  keywords: string[];
  topics: string[];
}

export class LLMAnalysisService {
  private apiKey: string;
  private configured: boolean;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || OPENAI_API_KEY;
    this.configured = !!this.apiKey && this.apiKey.length > 0;
    
    if (!this.configured) {
      logger.warn('OpenAI API key not configured. LLM analysis will not work.');
    }
  }

  /**
   * Check if OpenAI is configured
   */
  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Analyze blog content and generate optimized fields
   */
  async analyzeBlogContent(request: BlogAnalysisRequest): Promise<BlogAnalysisResponse> {
    if (!this.configured) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const prompt = this.buildAnalysisPrompt(request);
      
      logger.debug('Calling OpenAI GPT-4 for blog analysis', {
        title: request.title,
        contentLength: request.content.length,
        imageCount: request.images?.length || 0,
      });

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an expert SEO content analyst and blog optimization specialist. Analyze blog content and provide optimized metadata, image descriptions, and content suggestions.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('OpenAI API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content returned from OpenAI');
      }

      // Parse JSON response
      const analysis = JSON.parse(content) as BlogAnalysisResponse;
      
      logger.debug('OpenAI analysis completed', {
        seoTitle: analysis.seoTitle,
        imageDescriptionsCount: analysis.imageDescriptions.length,
        suggestionsCount: analysis.suggestions.recommendations.length,
      });

      return analysis;
    } catch (error: any) {
      logger.error('Error analyzing blog content with OpenAI', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Generate image descriptions using LLM
   */
  async generateImageDescriptions(
    imageUrl: string,
    context: {
      blogTitle: string;
      blogContent: string;
      imageType?: string;
      position?: number;
    }
  ): Promise<{
    altText: string;
    description: string;
    suggestedCaption?: string;
  }> {
    if (!this.configured) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const prompt = `Analyze this blog image and provide SEO-optimized descriptions.

Blog Title: ${context.blogTitle}
Image Context: ${context.imageType || 'blog image'} at position ${context.position || 1}
Blog Content (excerpt): ${context.blogContent.substring(0, 500)}...

Image URL: ${imageUrl}

Provide a JSON response with:
{
  "altText": "Concise, descriptive alt text (max 125 characters, no 'image of' prefix)",
  "description": "Detailed image description (2-3 sentences)",
  "suggestedCaption": "Optional caption for the image (if relevant)"
}

Focus on:
- SEO-friendly alt text that describes the image content
- Accessibility (screen reader friendly)
- Relevance to blog topic
- Natural language (no keyword stuffing)`;

      logger.debug('Generating image description with OpenAI', {
        imageUrl: imageUrl.substring(0, 50) + '...',
        blogTitle: context.blogTitle,
      });

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at creating SEO-optimized, accessible image descriptions and alt text for blog content.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content returned from OpenAI');
      }

      // Parse JSON response
      const result = JSON.parse(content);
      
      logger.debug('Image description generated', {
        altText: result.altText,
        hasDescription: !!result.description,
      });

      return result;
    } catch (error: any) {
      logger.error('Error generating image description', {
        error: error.message,
        imageUrl: imageUrl.substring(0, 50),
      });
      throw error;
    }
  }

  /**
   * Build analysis prompt for blog content
   */
  private buildAnalysisPrompt(request: BlogAnalysisRequest): string {
    const imagesSection = request.images && request.images.length > 0
      ? `\n\nImages in blog (${request.images.length}):
${request.images.map((img, idx) => `- Image ${idx + 1}: ${img.url} (Type: ${img.type || 'unknown'}, Position: ${img.position || idx + 1})`).join('\n')}`
      : '';

    const existingFieldsSection = request.existingFields
      ? `\n\nExisting Fields:
- Excerpt: ${request.existingFields.excerpt || 'Not set'}
- Slug: ${request.existingFields.slug || 'Not set'}
- SEO Title: ${request.existingFields.seoTitle || 'Not set'}
- Meta Description: ${request.existingFields.metaDescription || 'Not set'}`
      : '';

    return `Analyze this blog post and provide optimized metadata and suggestions.

Blog Title: ${request.title}

Blog Content:
${request.content.substring(0, 3000)}${request.content.length > 3000 ? '...' : ''}${imagesSection}${existingFieldsSection}

Provide a JSON response with the following structure:
{
  "seoTitle": "SEO-optimized title (50-60 characters, includes primary keyword)",
  "metaDescription": "Compelling meta description (150-160 characters, includes call-to-action)",
  "excerpt": "Engaging excerpt (150-200 characters, hooks the reader)",
  "slug": "URL-friendly slug (lowercase, hyphens, no special chars)",
  "imageDescriptions": [
    {
      "url": "image_url",
      "altText": "SEO-optimized alt text (max 125 chars, descriptive, no 'image of')",
      "description": "Detailed description (2-3 sentences)",
      "suggestedCaption": "Optional caption"
    }
  ],
  "suggestions": {
    "missingFields": ["List of missing recommended fields"],
    "recommendations": ["Actionable recommendations for improvement"],
    "improvements": ["Specific content improvements"]
  },
  "estimatedReadTime": 5,
  "wordCount": 1200,
  "keywords": ["primary", "keyword", "list"],
  "topics": ["main", "topic", "list"]
}

Guidelines:
- SEO Title: 50-60 characters, includes primary keyword, compelling
- Meta Description: 150-160 characters, includes value proposition and CTA
- Excerpt: 150-200 characters, hooks reader, summarizes key points
- Slug: URL-friendly, lowercase, hyphens, no special characters
- Alt Text: Descriptive, SEO-friendly, accessible (max 125 chars)
- Focus on user intent and search optimization`;
  }
}

// Export singleton instance
export const llmAnalysisService = new LLMAnalysisService();

