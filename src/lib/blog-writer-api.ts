/**
 * Blog Writer API Client
 * Handles all communication with the Blog Writer API
 */

import cloudRunHealth from './cloud-run-health';

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

    console.log(`🌐 Making request to: ${url}`);
    console.log('📤 Request options:', { method: options.method || 'GET', headers, body: options.body });

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
          // Add timeout
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        console.log(`📡 Response status: ${response.status} ${response.statusText}`);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error response body:', errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Response data:', result);
        return result;
      } catch (error) {
        console.error(`❌ API request attempt ${attempt} failed:`, error);
        
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
      console.error('Failed to fetch posts:', error);
      return [];
    }
  }

  async getPost(id: string): Promise<BlogPost | null> {
    try {
      return await this.makeRequest<BlogPost>(`/posts/${id}`);
    } catch (error) {
      console.error(`Failed to fetch post ${id}:`, error);
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
      console.error('Failed to create post:', error);
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
      console.error(`Failed to update post ${id}:`, error);
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
      console.error(`Failed to delete post ${id}:`, error);
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
      console.error('Failed to fetch metrics:', error);
      return null;
    }
  }

  // Calendar API
  async getCalendarEvents(): Promise<CalendarEvent[]> {
    try {
      return await this.makeRequest<CalendarEvent[]>('/calendar/events');
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      return [];
    }
  }

  // Recent Activities API
  async getRecentActivities(): Promise<RecentActivity[]> {
    try {
      return await this.makeRequest<RecentActivity[]>('/activities/recent');
    } catch (error) {
      console.error('Failed to fetch recent activities:', error);
      return [];
    }
  }

  // Scheduled Posts API
  async getScheduledPosts(): Promise<BlogPost[]> {
    try {
      return await this.makeRequest<BlogPost[]>('/schedule/upcoming');
    } catch (error) {
      console.error('Failed to fetch scheduled posts:', error);
      return [];
    }
  }

  // Drafts API
  async getDrafts(): Promise<BlogPost[]> {
    try {
      return await this.makeRequest<BlogPost[]>('/drafts');
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
      return [];
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest<{status: string}>('/health');
      return response.status === 'healthy';
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }

  // Get API status with more details
  async getDetailedHealth(): Promise<Record<string, unknown> | null> {
    try {
      return await this.makeRequest<Record<string, unknown>>('/health');
    } catch (error) {
      console.error('Failed to get detailed health:', error);
      return null;
    }
  }

  // Blog generation API with Cloud Run health check
  async generateBlog(params: {
    topic?: string;
    keywords?: string[];
    target_audience?: string;
    tone?: string;
    word_count?: number;
    include_external_links?: boolean;
    include_backlinks?: boolean;
    backlink_count?: number;
    quality_level?: string; // e.g., 'low', 'medium', 'high', 'premium'
    preset?: string; // Optional preset ID
  }): Promise<Record<string, unknown> | null> {
    try {
      console.log('🚀 Starting blog generation via local API route...');
      console.log('🚀 Generating blog with params:', params);
      
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
      console.log('✅ Blog generation result:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to generate blog:', error);
      return null;
    }
  }

  // Get available presets
  async getPresets(): Promise<Record<string, unknown>[]> {
    try {
      return await this.makeRequest<Record<string, unknown>[]>('/api/v1/abstraction/presets');
    } catch (error) {
      console.error('Failed to fetch presets:', error);
      return [];
    }
  }

  // Get quality levels
  async getQualityLevels(): Promise<Record<string, unknown>[]> {
    try {
      return await this.makeRequest<Record<string, unknown>[]>('/api/v1/abstraction/quality-levels');
    } catch (error) {
      console.error('Failed to fetch quality levels:', error);
      return [];
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
      console.log('🔌 Connecting to integration and getting recommendations:', {
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
      console.error('Failed to connect and get recommendations:', error);
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
      console.log('📊 Getting recommendations for:', params.provider);
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
      console.error('Failed to get recommendations:', error);
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
  generateBlog,
  getPresets,
  getQualityLevels,
  connectAndRecommend,
  getRecommendations,
} = blogWriterAPI;

export default blogWriterAPI;
