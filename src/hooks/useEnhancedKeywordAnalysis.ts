"use client";

import { useState, useCallback } from 'react';
import type { EnhancedKeywordAnalysisRequest, ProgressUpdate } from '@/lib/keyword-research';

// Response type (simplified - matches what the API returns)
interface EnhancedKeywordAnalysisResponse {
  enhanced_analysis?: Record<string, any>;
  keyword_analysis?: Record<string, any>;
  total_keywords?: number;
  original_keywords?: string[];
  suggested_keywords?: string[];
  clusters?: any[];
  cluster_summary?: any;
  [key: string]: any;
}

export function useEnhancedKeywordAnalysis() {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [result, setResult] = useState<EnhancedKeywordAnalysisResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const analyze = useCallback(async (request: EnhancedKeywordAnalysisRequest, useStreaming = false) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);

    try {
      if (useStreaming) {
        await analyzeKeywordsEnhancedStreaming(
          request,
          (update) => setProgress(update),
          (data) => {
            setResult(data);
            setIsLoading(false);
          },
          (err) => {
            setError(err);
            setIsLoading(false);
          }
        );
      } else {
        const data = await analyzeKeywordsEnhanced(request);
        setResult(data);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }, []);

  return {
    analyze,
    progress,
    result,
    error,
    isLoading
  };
}

// Standard Enhanced Keyword Analysis
async function analyzeKeywordsEnhanced(
  request: EnhancedKeywordAnalysisRequest
): Promise<EnhancedKeywordAnalysisResponse> {
  const response = await fetch('/api/keywords/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `Analysis failed: ${response.statusText}`);
  }

  return response.json();
}

// Enhanced Keyword Analysis with SSE Streaming
async function analyzeKeywordsEnhancedStreaming(
  request: EnhancedKeywordAnalysisRequest,
  onProgress: (update: ProgressUpdate) => void,
  onComplete: (result: EnhancedKeywordAnalysisResponse) => void,
  onError: (error: Error) => void
) {
  const response = await fetch('/api/keywords/analyze/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    onError(new Error(errorData.error || `Request failed: ${response.statusText}`));
    return;
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    onError(new Error('No response body'));
    return;
  }

  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'complete') {
              onComplete(data.result);
            } else if (data.type === 'error') {
              onError(new Error(data.error));
            } else {
              onProgress(data as ProgressUpdate);
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Streaming error'));
  }
}

