/**
 * Blog Writer API Client
 * Handles all communication with the Blog Writer API
 */

import cloudRunHealth from './cloud-run-health';
import { logger } from '@/utils/logger';

const API_BASE_URL = process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west1.run.app';
const API_KEY = process.env.BLOG_WRITER_API_KEY; // Optional for open API

// API Response types
export interface BlogPost {
  id: string;
  title: string;
  content?: string;
  excerpt?: string;
  author: string;
  publishDate: string;
  status: 'published' | 'draft' | 'scheduled' | 'in_review';
  views?: number;
  engagement?: number;
  category: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

export interface RecentActivity {
  id: string;
  type: 'publish' | 'draft' | 'schedule' | 'review';
  title: string;
  author: string;
  time: string;
  status: string;
}

export interface CalendarEvent {
  date: string;
  posts: Array<{
    id: string;
    title: string;
    status: string;
    time: string;
    author: string;
  }>;
}

export interface MetricsData {
  totalPosts: number;
  totalViews: number;
  totalEngagement: number;
  publishedPosts: number;
  draftPosts: number;
  scheduledPosts: number;
}

// API Client class
class BlogWriterAPI {
  private baseURL: string;
  private apiKey: string;
  private retryAttempts = 3;
  private retryDelay = 1000;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.apiKey = API_KEY || '';
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // Only add Authorization header if API key is provided (for open API, this is optional)
      ...(this.apiKey && this.apiKey !== 'not-required-for-open-api' && { 'Authorization': `Bearer ${this.apiKey}` }),
      ...options.headers,
    };

    logger.debug('Making API request', { url, method: options.method || 'GET' });

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
          // Add timeout
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        logger.debug('API response received', { 
          status: response.status, 
          statusText: response.statusText 
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error('API error response', { 
            status: response.status, 
            statusText: response.statusText,
            body: errorText 
          });
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        logger.debug('API request successful', { endpoint });
        return result;
      } catch (error) {
        logger.warn(`API request attempt ${attempt} failed`, { 
          attempt, 
          endpoint,
          error: error instanceof Error ? error.message : String(error)
        });
        
        if (attempt === this.retryAttempts) {
          throw new Error(`API request failed after ${this.retryAttempts} attempts: ${error}`);
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }

    throw new Error('Max retry attempts exceeded');
  }

  // Posts API
  async getPosts(): Promise<BlogPost[]> {
    try {
      return await this.makeRequest<BlogPost[]>('/posts');
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to fetch posts'), {
        endpoint: '/posts'
      });
      return [];
    }
  }

  async getPost(id: string): Promise<BlogPost | null> {
    try {
      return await this.makeRequest<BlogPost>(`/posts/${id}`);
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to fetch post'), {
        endpoint: `/posts/${id}`,
        postId: id
      });
      return null;
    }
  }

  async createPost(post: Partial<BlogPost>): Promise<BlogPost | null> {
    try {
      return await this.makeRequest<BlogPost>('/posts', {
        method: 'POST',
        body: JSON.stringify(post),
      });
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to create post'), {
        endpoint: '/posts',
        method: 'POST'
      });
      return null;
    }
  }

  async updatePost(id: string, post: Partial<BlogPost>): Promise<BlogPost | null> {
    try {
      return await this.makeRequest<BlogPost>(`/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(post),
      });
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to update post'), {
        endpoint: `/posts/${id}`,
        method: 'PUT',
        postId: id
      });
      return null;
    }
  }

  async deletePost(id: string): Promise<boolean> {
    try {
      await this.makeRequest(`/posts/${id}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to delete post'), {
        endpoint: `/posts/${id}`,
        method: 'DELETE',
        postId: id
      });
      return false;
    }
  }

  // Analytics API
  async getMetrics(): Promise<MetricsData | null> {
    try {
      const response = await this.makeRequest<Record<string, unknown>>('/api/v1/metrics');
      // Transform the API response to match our interface
      const blogGeneration = response.blog_generation as { total_generated?: number } | undefined;
      const counters = response.counters as { views?: number; engagement?: number } | undefined;
      
      return {
        totalPosts: blogGeneration?.total_generated || 0,
        totalViews: counters?.views || 0,
        totalEngagement: counters?.engagement || 0,
        publishedPosts: blogGeneration?.total_generated || 0,
        draftPosts: 0, // Not available in current API
        scheduledPosts: 0, // Not available in current API
      };
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to fetch metrics'), {
        endpoint: '/api/v1/metrics'
      });
      return null;
    }
  }

  // Calendar API
  async getCalendarEvents(): Promise<CalendarEvent[]> {
    try {
      return await this.makeRequest<CalendarEvent[]>('/calendar/events');
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to fetch calendar events'), {
        endpoint: '/calendar/events'
      });
      return [];
    }
  }

  // Recent Activities API
  async getRecentActivities(): Promise<RecentActivity[]> {
    try {
      return await this.makeRequest<RecentActivity[]>('/activities/recent');
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to fetch recent activities'), {
        endpoint: '/activities/recent'
      });
      return [];
    }
  }

  // Scheduled Posts API
  async getScheduledPosts(): Promise<BlogPost[]> {
    try {
      return await this.makeRequest<BlogPost[]>('/schedule/upcoming');
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to fetch scheduled posts'), {
        endpoint: '/schedule/upcoming'
      });
      return [];
    }
  }

  // Drafts API
  async getDrafts(): Promise<BlogPost[]> {
    try {
      return await this.makeRequest<BlogPost[]>('/drafts');
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to fetch drafts'), {
        endpoint: '/drafts'
      });
      return [];
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest<{status: string}>('/health');
      return response.status === 'healthy';
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('API health check failed'), {
        endpoint: '/health'
      });
      return false;
    }
  }

  // Get API status with more details
  async getDetailedHealth(): Promise<Record<string, unknown> | null> {
    try {
      return await this.makeRequest<Record<string, unknown>>('/health');
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to get detailed health'), {
        endpoint: '/health'
      });
      return null;
    }
  }

  // Create async blog generation job
  async createJob(params: {
    topic: string;
    keywords?: string[];
    target_audience?: string;
    tone?: string;
    word_count?: number;
    include_external_links?: boolean;
    include_backlinks?: boolean;
    backlink_count?: number;
    quality_level?: string;
    preset?: string;
    preset_id?: string;
    use_enhanced?: boolean;
    content_goal?: string;
    custom_instructions?: string;
    template_type?: string;
    length?: 'short' | 'medium' | 'long' | 'very_long';
    use_google_search?: boolean;
    use_fact_checking?: boolean;
    use_citations?: boolean;
    use_serp_optimization?: boolean;
    use_consensus_generation?: boolean;
    use_knowledge_graph?: boolean;
    use_semantic_keywords?: boolean;
    use_quality_scoring?: boolean;
    include_product_research?: boolean;
    include_brands?: boolean;
    include_models?: boolean;
    include_prices?: boolean;
    include_features?: boolean;
    include_reviews?: boolean;
    include_pros_cons?: boolean;
    include_product_table?: boolean;
    include_comparison_section?: boolean;
    include_buying_guide?: boolean;
    include_faq_section?: boolean;
    research_depth?: 'basic' | 'standard' | 'comprehensive';
  }): Promise<{
    job_id: string;
    status: string;
    message: string;
    estimated_completion_time?: number;
    queue_id?: string;
  } | null> {
    try {
      logger.debug('Creating async blog generation job', { params });
      
      const response = await fetch('/api/blog-writer/generate?async_mode=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.status} ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      logger.debug('Async job created successfully', { job_id: result.job_id });
      return result;
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to create async job'), {
        endpoint: '/api/blog-writer/generate',
        params
      });
      return null;
    }
  }

  // Poll job status
  async pollJobStatus(jobId: string): Promise<{
    job_id: string;
    status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
    progress_percentage: number;
    current_stage?: string;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    result?: Record<string, unknown>;
    error_message?: string;
    estimated_time_remaining?: number;
  } | null> {
    try {
      logger.debug('Polling job status', { job_id: jobId });
      
      const response = await fetch(`/api/blog-writer/jobs/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.status} ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      logger.debug('Job status retrieved', { 
        job_id: jobId,
        status: result.status,
        progress: result.progress_percentage 
      });
      return result;
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to poll job status'), {
        endpoint: `/api/blog-writer/jobs/${jobId}`,
        job_id: jobId
      });
      return null;
    }
  }

  // Blog generation API with Cloud Run health check
  // Supports custom instructions and quality features per CLIENT_SIDE_PROMPT_GUIDE.md v1.3.0
  async generateBlog(params: {
    topic?: string;
    keywords?: string[];
    target_audience?: string;
    tone?: string;
    word_count?: number;
    include_external_links?: boolean;
    include_backlinks?: boolean;
    backlink_count?: number;
    quality_level?: string; // e.g., 'low', 'medium', 'high', 'premium', 'enterprise'
    preset?: string; // Legacy preset string
    preset_id?: string; // Content preset ID from database
    use_enhanced?: boolean; // Use enhanced endpoint
    content_goal?: string; // Content goal: 'seo', 'engagement', 'conversions', 'brand_awareness'
    // Custom instructions and quality features (v1.3.0)
    custom_instructions?: string; // Custom prompt instructions for structure, linking, images, quality
    template_type?: string; // Template type: 'expert_authority', 'how_to_guide', 'comparison', 'case_study', 'news_update', 'tutorial', 'listicle', 'review'
    length?: 'short' | 'medium' | 'long' | 'very_long'; // Content length preference
    use_google_search?: boolean; // Enable Google search for research
    use_fact_checking?: boolean; // Enable fact-checking
    use_citations?: boolean; // Include citations
    // Product research features
    include_product_research?: boolean;
    include_brands?: boolean;
    include_models?: boolean;
    include_prices?: boolean;
    include_features?: boolean;
    include_reviews?: boolean;
    include_pros_cons?: boolean;
    include_product_table?: boolean;
    include_comparison_section?: boolean;
    include_buying_guide?: boolean;
    include_faq_section?: boolean;
    research_depth?: 'basic' | 'standard' | 'comprehensive';
    use_serp_optimization?: boolean; // Optimize for SERP features
    use_consensus_generation?: boolean; // Use GPT-4o + Claude consensus (best quality)
    use_knowledge_graph?: boolean; // Use knowledge graph
    use_semantic_keywords?: boolean; // Use semantic keywords
    use_quality_scoring?: boolean; // Enable quality scoring
  }): Promise<Record<string, unknown> | null> {
    try {
      logger.debug('Starting blog generation via local API route', { params });
      
      // Use local API route instead of external API to avoid CORS issues
      const response = await fetch('/api/blog-writer/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.status} ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      logger.debug('Blog generation successful', { hasResult: !!result });
      return result;
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to generate blog'), {
        endpoint: '/api/blog-writer/generate',
        params
      });
      return null;
    }
  }

  // Content Analysis API
  async analyzeContent(params: {
    content: string;
    topic?: string;
    keywords?: string[];
    target_audience?: string;
  }): Promise<{
    readability_score: number;
    seo_score: number;
    quality_score: number;
    keyword_density: Record<string, number>;
    missing_keywords: string[];
    recommendations: string[];
    word_count: number;
    reading_time_minutes: number;
    headings_count: number;
    links_count: number;
    images_count: number;
  }> {
    try {
      logger.debug('Analyzing content', { topic: params.topic });
      const response = await fetch('/api/blog-writer/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Analysis failed: ${response.status} ${errorData.error || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to analyze content'), {
        endpoint: '/api/blog-writer/analyze'
      });
      throw error;
    }
  }

  // Content Optimization API
  async optimizeContent(params: {
    content: string;
    topic: string;
    keywords: string[];
    optimization_goals?: string[]; // ['seo', 'readability', 'keywords']
  }): Promise<{
    optimized_content: string;
    changes_made: Array<{
      type: string;
      description: string;
      location: string;
    }>;
    before_scores: { readability: number; seo: number };
    after_scores: { readability: number; seo: number };
    improvements: string[];
  }> {
    try {
      logger.debug('Optimizing content', { topic: params.topic });
      const response = await fetch('/api/blog-writer/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Optimization failed: ${response.status} ${errorData.error || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to optimize content'), {
        endpoint: '/api/blog-writer/optimize'
      });
      throw error;
    }
  }

  // Topic Recommendations API
  async recommendTopics(params: {
    keywords?: string[];
    industry?: string;
    existing_topics?: string[];
    target_audience?: string;
    count?: number; // Default: 10, Max: 50
  }): Promise<{
    topics: Array<{
      title: string;
      description: string;
      keywords: string[];
      search_volume: number;
      difficulty: string;
      content_angle: string;
      estimated_traffic: number;
    }>;
  }> {
    try {
      logger.debug('Getting topic recommendations', { count: params.count });
      const response = await fetch('/api/blog-writer/topics/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Topic recommendation failed: ${response.status} ${errorData.error || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to get topic recommendations'), {
        endpoint: '/api/blog-writer/topics/recommend'
      });
      throw error;
    }
  }

  // Get available presets
  async getPresets(): Promise<Record<string, unknown>[]> {
    try {
      return await this.makeRequest<Record<string, unknown>[]>('/api/v1/abstraction/presets');
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to fetch presets'), {
        endpoint: '/api/v1/abstraction/presets'
      });
      return [];
    }
  }

  // Get quality levels
  async getQualityLevels(): Promise<Record<string, unknown>[]> {
    try {
      return await this.makeRequest<Record<string, unknown>[]>('/api/v1/abstraction/quality-levels');
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to fetch quality levels'), {
        endpoint: '/api/v1/abstraction/quality-levels'
      });
      return [];
    }
  }

  // ========== Enhanced Keyword Analysis (v1.3.0) ==========

  /**
   * Get LLM Responses for fact-checking and multi-model consensus
   * 
   * API v1.3.0+: POST /api/v1/keywords/llm-responses
   * - Multi-model fact-checking (ChatGPT, Claude, Gemini, Perplexity)
   * - Consensus calculation across models
   * - Impact: 25-35% improvement in content accuracy
   * 
   * @param params LLM response parameters
   * @param params.prompt The prompt/question to fact-check
   * @param params.llms Array of LLMs to use: ['chatgpt', 'claude', 'gemini', 'perplexity']
   * @param params.max_tokens Maximum tokens per response
   * @returns Multi-model responses with consensus
   */
  async getLLMResponses(params: {
    prompt: string;
    llms?: string[]; // Default: ['chatgpt', 'claude', 'gemini']
    max_tokens?: number; // Default: 500
  }): Promise<{
    prompt: string;
    responses: Record<string, {
      text: string;
      tokens: number;
      model: string;
    }>;
    consensus: string[];
    differences: string[];
    sources: string[];
    confidence: Record<string, number>;
  }> {
    try {
      logger.debug('Getting LLM responses for fact-checking', {
        promptLength: params.prompt.length,
        llms: params.llms || ['chatgpt', 'claude', 'gemini'],
        max_tokens: params.max_tokens || 500
      });

      return await this.makeRequest<{
        prompt: string;
        responses: Record<string, {
          text: string;
          tokens: number;
          model: string;
        }>;
        consensus: string[];
        differences: string[];
        sources: string[];
        confidence: Record<string, number>;
      }>('/api/v1/keywords/llm-responses', {
        method: 'POST',
        body: JSON.stringify({
          prompt: params.prompt,
          llms: params.llms || ['chatgpt', 'claude', 'gemini'],
          max_tokens: params.max_tokens || 500
        }),
      });
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to get LLM responses'), {
        endpoint: '/api/v1/keywords/llm-responses'
      });
      throw error;
    }
  }

  // ========== Integration API Methods ==========

  /**
   * Connect to an integration and get recommendations
   * 
   * API v1.1.0+: POST /api/v1/integrations/connect-and-recommend
   * - Target-agnostic integration input (provider label + opaque connection object)
   * - Computes backlink and interlink recommendations from selected keywords
   * - Best-effort persistence to Supabase (integrations_{ENV} and recommendations_{ENV})
   * 
   * @param params Connection parameters
   * @param params.tenant_id Optional tenant/organization ID
   * @param params.provider Provider type: 'webflow' | 'wordpress' | 'shopify'
   * @param params.connection Opaque connection object (provider-specific credentials)
   * @param params.keywords Array of 1-50 keywords for recommendation computation
   * @returns Connection result with recommendations and persistence status
   */
  async connectAndRecommend(params: {
    tenant_id?: string;
    provider: 'webflow' | 'wordpress' | 'shopify';
    connection: Record<string, unknown>;
    keywords: string[]; // 1-50 keywords (required)
  }): Promise<{
    provider: string;
    tenant_id?: string;
    saved_integration: boolean; // Indicates if API successfully persisted to Supabase
    recommended_backlinks: number;
    recommended_interlinks: number;
    per_keyword: Array<{
      keyword: string;
      difficulty?: number;
      suggested_backlinks: number;
      suggested_interlinks: number;
    }>;
    notes?: string;
  }> {
    try {
      logger.debug('Connecting to integration and getting recommendations', {
        provider: params.provider,
        keyword_count: params.keywords.length,
        has_tenant_id: !!params.tenant_id,
      });
      
      return await this.makeRequest<{
        provider: string;
        tenant_id?: string;
        saved_integration: boolean;
        recommended_backlinks: number;
        recommended_interlinks: number;
        per_keyword: Array<{
          keyword: string;
          difficulty?: number;
          suggested_backlinks: number;
          suggested_interlinks: number;
        }>;
        notes?: string;
      }>('/api/v1/integrations/connect-and-recommend', {
        method: 'POST',
        body: JSON.stringify({
          provider: params.provider,
          connection: params.connection,
          keywords: params.keywords,
          ...(params.tenant_id && { tenant_id: params.tenant_id }),
        }),
      });
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to connect and get recommendations'), {
        endpoint: '/api/v1/integrations/connect-and-recommend',
        provider: params.provider
      });
      throw error;
    }
  }

  /**
   * Get recommendations for keywords without connecting
   * 
   * @param params Recommendation parameters
   * @returns Recommendations without saving integration
   */
  async getRecommendations(params: {
    tenant_id?: string;
    provider: 'webflow' | 'wordpress' | 'shopify';
    keywords: string[]; // 1-50 keywords
  }): Promise<{
    provider: string;
    tenant_id?: string;
    recommended_backlinks: number;
    recommended_interlinks: number;
    per_keyword: Array<{
      keyword: string;
      difficulty?: number;
      suggested_backlinks: number;
      suggested_interlinks: number;
    }>;
    notes?: string;
  }> {
    try {
      logger.debug('Getting recommendations', { provider: params.provider });
      return await this.makeRequest<{
        provider: string;
        tenant_id?: string;
        recommended_backlinks: number;
        recommended_interlinks: number;
        per_keyword: Array<{
          keyword: string;
          difficulty?: number;
          suggested_backlinks: number;
          suggested_interlinks: number;
        }>;
        notes?: string;
      }>('/api/v1/integrations/recommend', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to get recommendations'), {
        endpoint: '/api/v1/integrations/recommend',
        provider: params.provider
      });
      throw error;
    }
  }

  /**
   * Get interlinking recommendations for an integration
   * 
   * Uses local API route that retrieves structure from Supabase
   * and calls backend API with structure included
   * 
   * @param orgId Organization ID
   * @param integrationId Integration ID
   * @param keywords Array of keywords for analysis
   * @returns Interlinking recommendations
   */
  async getInterlinkingRecommendations(
    orgId: string,
    integrationId: string,
    keywords: string[]
  ): Promise<{
    recommended_interlinks: number;
    per_keyword: Array<{
      keyword: string;
      suggested_interlinks: number;
      interlink_opportunities: Array<{
        target_url: string;
        target_title: string;
        anchor_text: string;
        relevance_score: number;
      }>;
    }>;
  }> {
    try {
      logger.debug('Getting interlinking recommendations', {
        orgId,
        integrationId,
        keyword_count: keywords.length
      });
      
      const response = await fetch(`/api/integrations/${integrationId}/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keywords }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.status} ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      logger.debug('Interlinking recommendations retrieved', { 
        integrationId,
        recommended_interlinks: result.recommended_interlinks 
      });
      return result;
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to get interlinking recommendations'), {
        endpoint: `/api/integrations/${integrationId}/recommendations`,
        orgId,
        integrationId
      });
      throw error;
    }
  }
}

// Export singleton instance
export const blogWriterAPI = new BlogWriterAPI();

// Export individual methods for convenience
export const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getMetrics,
  getCalendarEvents,
  getRecentActivities,
  getScheduledPosts,
  getDrafts,
  healthCheck,
  getDetailedHealth,
  createJob,
  pollJobStatus,
  generateBlog,
  getPresets,
  getQualityLevels,
  connectAndRecommend,
  getRecommendations,
  getLLMResponses,
  getInterlinkingRecommendations,
} = blogWriterAPI;

export default blogWriterAPI;
