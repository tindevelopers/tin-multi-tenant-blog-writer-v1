import { createClient } from './client';
import type { Database } from '@/types/database';

type BlogPost = Database['public']['Tables']['blog_posts']['Row'];
type BlogPostInsert = Database['public']['Tables']['blog_posts']['Insert'];
type BlogPostUpdate = Database['public']['Tables']['blog_posts']['Update'];

export interface CreateDraftParams {
  title: string;
  content: string;
  excerpt?: string;
  seo_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_by?: string;
}

export interface UpdateDraftParams {
  title?: string;
  content?: string;
  excerpt?: string;
  seo_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status?: 'draft' | 'published' | 'scheduled' | 'archived';
}

class BlogPostsService {
  private supabase = createClient();

  /**
   * Create a new blog post draft
   */
  async createDraft(params: CreateDraftParams): Promise<BlogPost | null> {
    try {
      console.log('📝 Creating blog post draft:', params.title);
      
      // Get current user
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Authentication error:', authError);
        throw new Error('User not authenticated');
      }
      
      console.log('✅ User authenticated:', user.id);

      // Get user's organization
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (userError || !userData) {
        console.error('❌ User data error:', userError);
        console.error('❌ User data:', userData);
        throw new Error('User organization not found');
      }
      
      console.log('✅ User organization found:', userData.org_id);

      const draftData: BlogPostInsert = {
        org_id: userData.org_id,
        created_by: params.created_by || user.id,
        title: params.title,
        content: params.content,
        excerpt: params.excerpt || null,
        status: 'draft',
        seo_data: params.seo_data || {},
        metadata: params.metadata || {},
        scheduled_at: null,
        published_at: null,
      };

      console.log('📝 Inserting draft data:', draftData);
      console.log('📝 Content length:', params.content?.length || 0);
      console.log('📝 Content preview:', params.content?.substring(0, 200) + '...');

      const { data, error } = await this.supabase
        .from('blog_posts')
        .insert(draftData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating draft:', error);
        throw new Error(`Failed to create draft: ${error.message}`);
      }

      console.log('✅ Draft created successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in createDraft:', error);
      throw error;
    }
  }

  /**
   * Update an existing blog post
   */
  async updatePost(postId: string, params: UpdateDraftParams): Promise<BlogPost | null> {
    try {
      console.log('📝 Updating blog post:', postId);

      const updateData: BlogPostUpdate = {
        ...params,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('blog_posts')
        .update(updateData)
        .eq('post_id', postId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating post:', error);
        throw new Error(`Failed to update post: ${error.message}`);
      }

      console.log('✅ Post updated successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in updatePost:', error);
      throw error;
    }
  }

  /**
   * Get all blog posts for the current user's organization
   */
  async getPosts(status?: 'draft' | 'published' | 'scheduled' | 'archived'): Promise<BlogPost[]> {
    try {
      console.log('📝 Fetching blog posts, status:', status);

      // Get current user
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Authentication error:', authError);
        throw new Error('User not authenticated');
      }

      // Get user's organization
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (userError || !userData) {
        console.error('❌ User data error:', userError);
        throw new Error('User organization not found');
      }

      let query = this.supabase
        .from('blog_posts')
        .select('*')
        .eq('org_id', userData.org_id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching posts:', error);
        throw new Error(`Failed to fetch posts: ${error.message}`);
      }

      console.log(`✅ Fetched ${data?.length || 0} posts`);
      return data || [];
    } catch (error) {
      console.error('❌ Error in getPosts:', error);
      throw error;
    }
  }

  /**
   * Get a single blog post by ID
   */
  async getPost(postId: string): Promise<BlogPost | null> {
    try {
      console.log('📝 Fetching blog post:', postId);

      const { data, error } = await this.supabase
        .from('blog_posts')
        .select('*')
        .eq('post_id', postId)
        .single();

      if (error) {
        console.error('❌ Error fetching post:', error);
        throw new Error(`Failed to fetch post: ${error.message}`);
      }

      console.log('✅ Post fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in getPost:', error);
      throw error;
    }
  }

  /**
   * Delete a blog post
   */
  async deletePost(postId: string): Promise<boolean> {
    try {
      console.log('📝 Deleting blog post:', postId);

      const { error } = await this.supabase
        .from('blog_posts')
        .delete()
        .eq('post_id', postId);

      if (error) {
        console.error('❌ Error deleting post:', error);
        throw new Error(`Failed to delete post: ${error.message}`);
      }

      console.log('✅ Post deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error in deletePost:', error);
      throw error;
    }
  }

  /**
   * Publish a draft
   */
  async publishPost(postId: string): Promise<BlogPost | null> {
    return this.updatePost(postId, {
      status: 'published',
      published_at: new Date().toISOString(),
    });
  }

  /**
   * Schedule a post for future publication
   */
  async schedulePost(postId: string, scheduledAt: string): Promise<BlogPost | null> {
    return this.updatePost(postId, {
      status: 'scheduled',
      scheduled_at: scheduledAt,
    });
  }
}

// Create singleton instance
const blogPostsService = new BlogPostsService();

export default blogPostsService;
