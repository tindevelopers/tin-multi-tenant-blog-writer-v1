/**
 * DataForSEO Content Generation API Client
 * 
 * Documentation: https://docs.dataforseo.com/v3/content_generation-overview/
 * Pricing: https://dataforseo.com/pricing/content-generation-api/content-generation-api
 * 
 * Endpoints:
 * - Generate Text: $0.00005 per new token ($50 for 1M tokens)
 * - Generate Subtopics: $0.0001 per task ($100 for 1M tasks)
 * - Paraphrase: $0.00015 per token ($150 for 1M tokens)
 * - Check Grammar: $0.00001 per token ($10 for 1M tokens)
 * - Generate Meta Tags: $0.001 per task ($1,000 for 1M tasks)
 */

import { logger } from '@/utils/logger';

const DATAFORSEO_API_URL = 'https://api.dataforseo.com/v3';
const DATAFORSEO_USERNAME = process.env.DATAFORSEO_USERNAME || '';
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD || '';

export interface GenerateTextRequest {
  text: string;
  creativity_index?: number; // 0.0 to 1.0, default: 0.5
  text_length?: number; // Desired length in tokens
  tone?: 'professional' | 'casual' | 'academic' | 'conversational' | 'instructional';
  language?: string; // ISO 639-1 code, default: 'en'
}

export interface GenerateTextResponse {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    time: string;
    cost: number;
    result_count: number;
    path: Array<string>;
    data: {
      text: string;
      creativity_index: number;
      text_length: number;
    };
    result: Array<{
      text: string;
      creativity_index: number;
      text_length: number;
    }>;
  }>;
}

export interface GenerateSubtopicsRequest {
  text: string;
  max_subtopics?: number; // Default: 10
  language?: string; // ISO 639-1 code, default: 'en'
}

export interface GenerateSubtopicsResponse {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    time: string;
    cost: number;
    result_count: number;
    path: Array<string>;
    data: {
      text: string;
      max_subtopics: number;
    };
    result: Array<{
      subtopics: string[];
    }>;
  }>;
}

export interface ParaphraseRequest {
  text: string;
  creativity_index?: number; // 0.0 to 1.0, default: 0.5
  language?: string; // ISO 639-1 code, default: 'en'
}

export interface ParaphraseResponse {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    time: string;
    cost: number;
    result_count: number;
    path: Array<string>;
    data: {
      text: string;
      creativity_index: number;
    };
    result: Array<{
      text: string;
      creativity_index: number;
    }>;
  }>;
}

export interface GenerateMetaTagsRequest {
  text: string;
  language?: string; // ISO 639-1 code, default: 'en'
}

export interface GenerateMetaTagsResponse {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    time: string;
    cost: number;
    result_count: number;
    path: Array<string>;
    data: {
      text: string;
    };
    result: Array<{
      meta_title: string;
      meta_description: string;
    }>;
  }>;
}

export class DataForSEOContentGeneration {
  private username: string;
  private password: string;
  private baseUrl: string;
  private credentialsConfigured: boolean;

  constructor(username?: string, password?: string) {
    this.username = username || DATAFORSEO_USERNAME;
    this.password = password || DATAFORSEO_PASSWORD;
    this.baseUrl = DATAFORSEO_API_URL;
    this.credentialsConfigured = !!(this.username && this.password);

    if (!this.credentialsConfigured) {
      logger.warn('DataForSEO credentials not configured. Content generation will not work.');
    }
  }

  /**
   * Check if credentials are configured
   */
  isConfigured(): boolean {
    return this.credentialsConfigured;
  }

  /**
   * Get Basic Auth header for DataForSEO API
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Make authenticated request to DataForSEO API
   */
  private async makeRequest<T>(
    endpoint: string,
    payload: unknown
  ): Promise<T> {
    if (!this.credentialsConfigured) {
      const error = new Error('DataForSEO credentials not configured');
      (error as any).code = 'CREDENTIALS_NOT_CONFIGURED';
      throw error;
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    logger.debug('Calling DataForSEO Content Generation API', {
      endpoint,
      url,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader(),
        },
        body: JSON.stringify([payload]), // DataForSEO expects array of tasks
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('DataForSEO API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        const error = new Error(`DataForSEO API error: ${response.status} ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).response = errorText;
        throw error;
      }

      const data = await response.json();
      
      // Check for API-level errors
      if (data.status_code && data.status_code !== 20000) {
        logger.error('DataForSEO API returned error status', {
          status_code: data.status_code,
          status_message: data.status_message,
        });
        const error = new Error(`DataForSEO API error: ${data.status_message || 'Unknown error'}`);
        (error as any).status_code = data.status_code;
        throw error;
      }

      return data as T;
    } catch (error: any) {
      // Re-throw if it's already our custom error
      if (error.code === 'CREDENTIALS_NOT_CONFIGURED') {
        throw error;
      }
      
      // Wrap network errors
      logger.error('DataForSEO API request failed', {
        endpoint,
        error: error.message,
        status: error.status,
      });
      throw error;
    }
  }

  /**
   * Generate text content
   * Pricing: $0.00005 per new token ($50 for 1M tokens)
   */
  async generateText(request: GenerateTextRequest): Promise<GenerateTextResponse> {
    const payload = {
      text: request.text,
      creativity_index: request.creativity_index ?? 0.5,
      text_length: request.text_length ?? 500,
      tone: request.tone || 'professional',
      language: request.language || 'en',
    };

    return this.makeRequest<GenerateTextResponse>(
      '/content_generation/generate_text/live',
      payload
    );
  }

  /**
   * Generate subtopics from input text
   * Pricing: $0.0001 per task ($100 for 1M tasks)
   */
  async generateSubtopics(request: GenerateSubtopicsRequest): Promise<GenerateSubtopicsResponse> {
    const payload = {
      text: request.text,
      max_subtopics: request.max_subtopics ?? 10,
      language: request.language || 'en',
    };

    return this.makeRequest<GenerateSubtopicsResponse>(
      '/content_generation/generate_subtopics/live',
      payload
    );
  }

  /**
   * Paraphrase existing text
   * Pricing: $0.00015 per token ($150 for 1M tokens)
   */
  async paraphrase(request: ParaphraseRequest): Promise<ParaphraseResponse> {
    const payload = {
      text: request.text,
      creativity_index: request.creativity_index ?? 0.5,
      language: request.language || 'en',
    };

    return this.makeRequest<ParaphraseResponse>(
      '/content_generation/paraphrase/live',
      payload
    );
  }

  /**
   * Generate meta title and description tags
   * Pricing: $0.001 per task ($1,000 for 1M tasks)
   */
  async generateMetaTags(request: GenerateMetaTagsRequest): Promise<GenerateMetaTagsResponse> {
    const payload = {
      text: request.text,
      language: request.language || 'en',
    };

    return this.makeRequest<GenerateMetaTagsResponse>(
      '/content_generation/generate_meta_tags/live',
      payload
    );
  }

  /**
   * Generate blog content from keywords and topic
   * This is a convenience method that uses multiple DataForSEO endpoints
   */
  async generateBlogContent(params: {
    topic: string;
    keywords: string[];
    target_audience?: string;
    tone?: 'professional' | 'casual' | 'academic' | 'conversational' | 'instructional';
    word_count?: number;
    language?: string;
  }): Promise<{
    content: string;
    subtopics: string[];
    meta_title?: string;
    meta_description?: string;
    cost: number;
  }> {
    const { topic, keywords, tone = 'professional', word_count = 1000, language = 'en' } = params;
    
    // Build initial text prompt from topic and keywords
    const keywordList = keywords.slice(0, 10).join(', '); // Limit to 10 keywords
    const prompt = `Write a comprehensive blog post about ${topic}. Include information about: ${keywordList}. Target audience: ${params.target_audience || 'general readers'}.`;
    
    let totalCost = 0;
    
    try {
      // Step 1: Generate subtopics
      logger.debug('Generating subtopics with DataForSEO', { topic });
      const subtopicsResponse = await this.generateSubtopics({
        text: prompt,
        max_subtopics: 10,
        language,
      });
      
      if (subtopicsResponse.tasks && subtopicsResponse.tasks.length > 0) {
        totalCost += subtopicsResponse.cost || 0;
        const subtopics = subtopicsResponse.tasks[0].result?.[0]?.subtopics || [];
        
        // Step 2: Generate main content
        const contentPrompt = `${prompt}\n\nSubtopics to cover:\n${subtopics.join('\n')}`;
        const estimatedTokens = Math.ceil(word_count / 0.75); // Rough estimate: 1 token ≈ 0.75 words
        
        logger.debug('Generating blog content with DataForSEO', { 
          topic, 
          estimatedTokens,
          word_count,
        });
        
        const contentResponse = await this.generateText({
          text: contentPrompt,
          creativity_index: 0.7,
          text_length: estimatedTokens,
          tone,
          language,
        });
        
        totalCost += contentResponse.cost || 0;
        const content = contentResponse.tasks?.[0]?.result?.[0]?.text || '';
        
        // Step 3: Generate meta tags
        logger.debug('Generating meta tags with DataForSEO', { topic });
        const metaResponse = await this.generateMetaTags({
          text: content || prompt,
          language,
        });
        
        totalCost += metaResponse.cost || 0;
        const metaResult = metaResponse.tasks?.[0]?.result?.[0];
        
        return {
          content,
          subtopics,
          meta_title: metaResult?.meta_title,
          meta_description: metaResult?.meta_description,
          cost: totalCost,
        };
      }
      
      throw new Error('Failed to generate content from DataForSEO');
    } catch (error) {
      logger.error('DataForSEO content generation error', { error, topic });
      throw error;
    }
  }
}

// Export singleton instance
export const dataForSEOContentGeneration = new DataForSEOContentGeneration();
