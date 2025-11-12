import { useState, useCallback } from 'react';
import type { KeywordDifficultyRequest, KeywordDifficultyResponse } from '@/app/api/keywords/difficulty/route';

interface UseKeywordDifficultyResult {
  analyzeDifficulty: (request: KeywordDifficultyRequest) => Promise<void>;
  data: KeywordDifficultyResponse | null;
  loading: boolean;
  error: Error | null;
}

export function useKeywordDifficulty(): UseKeywordDifficultyResult {
  const [data, setData] = useState<KeywordDifficultyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const analyzeDifficulty = useCallback(async (request: KeywordDifficultyRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/keywords/difficulty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        if (response.status === 404) {
          setData(null);
          setError(new Error('SERVICE_UNAVAILABLE'));
          return;
        }
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result: KeywordDifficultyResponse = await response.json();
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to analyze difficulty');
      setError(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { analyzeDifficulty, data, loading, error };
}

