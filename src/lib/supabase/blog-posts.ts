import type { Database } from '@/types/database';
import { logger } from '@/utils/logger';

type BlogPost = Database['public']['Tables']['blog_posts']['Row'];
type BlogPostInsert = Database['public']['Tables']['blog_posts']['Insert'];
type BlogPostUpdate = Database['public']['Tables']['blog_posts']['Update'];

export interface CreateDraftParams {
  title: string;
  content: string;
  excerpt?: string;
  seo_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  featured_image?: { image_url?: string; alt_text?: string; image_id?: string; width?: number; height?: number } | null;
  created_by?: string;
}

export interface UpdateDraftParams {
  title?: string;
  content?: string;
  excerpt?: string;
  seo_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status?: 'draft' | 'published' | 'scheduled' | 'archived';
  published_at?: string | null;
}

class BlogPostsService {

  /**
   * Create a new blog post draft
   */
  async createDraft(params: CreateDraftParams): Promise<BlogPost | null> {
    try {
      logger.debug('📝 Creating blog post draft via API:', params.title);
      
      const response = await fetch('/api/drafts/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: params.title,
          content: params.content,
          excerpt: params.excerpt,
          status: 'draft',
          seo_data: params.seo_data,
          metadata: params.metadata,
          featured_image: params.featured_image,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('❌ API error:', errorData);
        throw new Error(`Failed to save draft: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      logger.debug('✅ Draft created successfully via API:', result.data.id);
      return result.data;

    } catch (error) {
      logger.error('❌ Error creating draft:', error);
      throw error;
    }
  }

  /**
   * Update an existing blog post
   */
  async updatePost(postId: string, params: UpdateDraftParams): Promise<BlogPost | null> {
    try {
      logger.debug('📝 Updating blog post:', postId);
      
      const response = await fetch(`/api/drafts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('❌ API error:', errorData);
        throw new Error(`Failed to update post: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      logger.debug('✅ Post updated successfully:', result.data?.title);
      return result.data || null;
    } catch (error) {
      logger.error('❌ Error in updatePost:', error);
      throw error;
    }
  }

  /**
   * Get all blog posts for the current user's organization
   */
  async getPosts(status?: 'draft' | 'published' | 'scheduled' | 'archived'): Promise<BlogPost[]> {
    try {
      logger.debug('📝 Fetching blog posts, status:', status);
      
      const response = await fetch('/api/drafts/list?' + new URLSearchParams({
        status: status || 'draft'
      }));
      
      if (!response.ok) {
        const errorData = await response.json();
        logger.error('❌ API error:', errorData);
        throw new Error(`Failed to fetch posts: ${errorData.error || 'Unknown error'}`);
      }
      
      const result = await response.json();
      logger.debug('✅ Posts fetched successfully', { count: result.data?.length || 0 });
      return result.data || [];
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
        context: 'getPosts',
      });
      throw error;
    }
  }

  /**
   * Get a single blog post by ID
   */
  async getPost(postId: string): Promise<BlogPost | null> {
    try {
      logger.debug('📝 Fetching blog post:', postId);
      
      const response = await fetch(`/api/drafts/${postId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        logger.error('❌ API error:', errorData);
        throw new Error(`Failed to fetch post: ${errorData.error || 'Unknown error'}`);
      }
      
      const result = await response.json();
      logger.debug('✅ Post fetched successfully:', result.data?.title);
      return result.data || null;
    } catch (error) {
      logger.error('❌ Error in getPost:', error);
      throw error;
    }
  }

  /**
   * Delete a blog post
   */
  async deletePost(postId: string): Promise<boolean> {
    try {
      logger.debug('📝 Deleting blog post:', postId);
      
      const response = await fetch(`/api/drafts/${postId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('❌ API error:', errorData);
        throw new Error(`Failed to delete post: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      logger.debug('✅ Post deleted successfully');
      return result.success || false;
    } catch (error) {
      logger.error('❌ Error in deletePost:', error);
      throw error;
    }
  }

  /**
   * Publish a draft
   */
  async publishPost(postId: string): Promise<BlogPost | null> {
    return this.updatePost(postId, {
      status: 'published',
    });
  }

  /**
   * Schedule a post for future publication
   */
  async schedulePost(postId: string, scheduledAt: string): Promise<BlogPost | null> {
    return this.updatePost(postId, {
      status: 'scheduled',
    });
  }
}

// Create singleton instance
const blogPostsService = new BlogPostsService();

export default blogPostsService;
