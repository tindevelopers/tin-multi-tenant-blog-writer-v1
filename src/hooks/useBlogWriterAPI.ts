"use client";

/**
 * React hooks for Blog Writer API integration
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  blogWriterAPI, 
  BlogPost
} from '@/lib/blog-writer-api';

// Generic hook for API calls with loading and error states
export function useAPI<T>(
  apiCall: () => Promise<T>,
  dependencies: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Specific hooks for different API endpoints
export function usePosts() {
  return useAPI(() => blogWriterAPI.getPosts());
}

export function usePost(id: string) {
  return useAPI(() => blogWriterAPI.getPost(id), [id]);
}

export function useMetrics() {
  return useAPI(() => blogWriterAPI.getMetrics());
}

export function useCalendarEvents() {
  return useAPI(() => blogWriterAPI.getCalendarEvents());
}

export function useRecentActivities() {
  return useAPI(() => blogWriterAPI.getRecentActivities());
}

export function useScheduledPosts() {
  return useAPI(() => blogWriterAPI.getScheduledPosts());
}

export function useDrafts() {
  return useAPI(() => blogWriterAPI.getDrafts());
}

// Hook for API health check
export function useAPIHealth() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const healthy = await blogWriterAPI.healthCheck();
      setIsHealthy(healthy);
    } catch {
      setIsHealthy(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { isHealthy, checking, checkHealth };
}

// Hook for creating/updating posts with optimistic updates
export function usePostMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPost = useCallback(async (post: Partial<BlogPost>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await blogWriterAPI.createPost(post);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create post';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePost = useCallback(async (id: string, post: Partial<BlogPost>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await blogWriterAPI.updatePost(id, post);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update post';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePost = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await blogWriterAPI.deletePost(id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete post';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createPost,
    updatePost,
    deletePost,
    loading,
    error,
  };
}

// Hook for managing API connection status
export function useGenerateBlog() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBlog = useCallback(async (params: {
    topic?: string;
    keywords?: string[];
    target_audience?: string;
    tone?: string;
    word_count?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await blogWriterAPI.generateBlog(params);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate blog content');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generateBlog, loading, error };
}

export function useAPIConnection() {
  const { isHealthy, checking } = useAPIHealth();
  const [lastConnected, setLastConnected] = useState<Date | null>(null);

  useEffect(() => {
    if (isHealthy === true) {
      setLastConnected(new Date());
    }
  }, [isHealthy]);

  const getConnectionStatus = () => {
    if (checking) return 'checking';
    if (isHealthy === true) return 'connected';
    if (isHealthy === false) return 'disconnected';
    return 'unknown';
  };

  const getConnectionMessage = () => {
    const status = getConnectionStatus();
    switch (status) {
      case 'checking':
        return 'Checking API connection...';
      case 'connected':
        return 'Connected to Blog Writer API';
      case 'disconnected':
        return 'Disconnected from Blog Writer API';
      default:
        return 'Unknown connection status';
    }
  };

  return {
    isHealthy,
    checking,
    lastConnected,
    status: getConnectionStatus(),
    message: getConnectionMessage(),
  };
}
