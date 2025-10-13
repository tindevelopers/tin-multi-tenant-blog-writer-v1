"use client";

import { useState, useEffect, useCallback } from 'react';
import keywordStorageService, { StoredKeyword, KeywordHistory } from '@/lib/keyword-storage';

export function useKeywordStorage(userId?: string) {
  const [keywords, setKeywords] = useState<StoredKeyword[]>([]);
  const [researchSessions, setResearchSessions] = useState<KeywordHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user's keywords
  const loadKeywords = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    try {
      const userKeywords = await keywordStorageService.getUserKeywords(userId);
      setKeywords(userKeywords);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load keywords');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load research sessions
  const loadResearchSessions = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    try {
      const sessions = await keywordStorageService.getUserResearchSessions(userId);
      setResearchSessions(sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load research sessions');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Search keywords
  const searchKeywords = useCallback(async (query: string) => {
    if (!userId) return [];
    
    try {
      return await keywordStorageService.searchKeywords(userId, query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search keywords');
      return [];
    }
  }, [userId]);

  // Get keywords by topic
  const getKeywordsByTopic = useCallback(async (topic: string) => {
    if (!userId) return [];
    
    try {
      return await keywordStorageService.getKeywordsByTopic(userId, topic);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get keywords by topic');
      return [];
    }
  }, [userId]);

  // Update keyword
  const updateKeyword = useCallback(async (keywordId: string, updates: Partial<StoredKeyword>) => {
    try {
      const result = await keywordStorageService.updateKeyword(keywordId, updates);
      if (result.success) {
        await loadKeywords(); // Reload keywords
      } else {
        setError(result.error || 'Failed to update keyword');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update keyword';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [loadKeywords]);

  // Delete keyword
  const deleteKeyword = useCallback(async (keywordId: string) => {
    try {
      const result = await keywordStorageService.deleteKeyword(keywordId);
      if (result.success) {
        await loadKeywords(); // Reload keywords
      } else {
        setError(result.error || 'Failed to delete keyword');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete keyword';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [loadKeywords]);

  // Load data on mount
  useEffect(() => {
    if (userId) {
      loadKeywords();
      loadResearchSessions();
    }
  }, [userId, loadKeywords, loadResearchSessions]);

  return {
    keywords,
    researchSessions,
    loading,
    error,
    loadKeywords,
    loadResearchSessions,
    searchKeywords,
    getKeywordsByTopic,
    updateKeyword,
    deleteKeyword,
  };
}

export function useKeywordHistory(userId?: string) {
  const { researchSessions, loading, error, loadResearchSessions } = useKeywordStorage(userId);
  
  return {
    researchSessions,
    loading,
    error,
    refetch: loadResearchSessions,
  };
}

export function useKeywordSearch(userId?: string) {
  const { searchKeywords, getKeywordsByTopic } = useKeywordStorage(userId);
  
  return {
    searchKeywords,
    getKeywordsByTopic,
  };
}
