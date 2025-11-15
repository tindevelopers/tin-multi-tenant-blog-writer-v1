"use client";

import { useState, useEffect, useCallback } from 'react';
import blogPostsService, { CreateDraftParams, UpdateDraftParams } from '@/lib/supabase/blog-posts';
import type { Database } from '@/types/database';
import { logger } from '@/utils/logger';

type BlogPost = Database['public']['Tables']['blog_posts']['Row'];

export function useBlogPosts(status?: 'draft' | 'published' | 'scheduled' | 'archived') {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await blogPostsService.getPosts(status);
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, loading, error, refetch: fetchPosts };
}

export function useBlogPost(postId: string) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPost = useCallback(async () => {
    if (!postId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await blogPostsService.getPost(postId);
      
      if (!data) {
        setError('Draft not found. It may have been deleted or you may not have permission to access it.');
        setPost(null);
      } else {
        setPost(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch post';
      logger.error('Error fetching post:', err);
      setError(errorMessage.includes('not found') || errorMessage.includes('404') 
        ? 'Draft not found. It may have been deleted or you may not have permission to access it.'
        : errorMessage);
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  return { post, loading, error, refetch: fetchPost };
}

export function useBlogPostMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDraft = useCallback(async (params: CreateDraftParams): Promise<BlogPost | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await blogPostsService.createDraft(params);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create draft');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePost = useCallback(async (postId: string, params: UpdateDraftParams): Promise<BlogPost | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await blogPostsService.updatePost(postId, params);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update post');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await blogPostsService.deletePost(postId);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const publishPost = useCallback(async (postId: string): Promise<BlogPost | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await blogPostsService.publishPost(postId);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish post');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const schedulePost = useCallback(async (postId: string, scheduledAt: string): Promise<BlogPost | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await blogPostsService.schedulePost(postId, scheduledAt);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule post');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createDraft,
    updatePost,
    deletePost,
    publishPost,
    schedulePost,
    loading,
    error,
  };
}

// Convenience hooks for specific post types
export function useDrafts() {
  return useBlogPosts('draft');
}

export function usePublishedPosts() {
  return useBlogPosts('published');
}

export function useScheduledPosts() {
  return useBlogPosts('scheduled');
}
