"use client";

import { useState, useCallback } from 'react';
import type { LLMResearchRequest, LLMResearchResponse, ProgressUpdate } from '@/lib/keyword-research';

export function useLLMResearch() {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [result, setResult] = useState<LLMResearchResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const research = useCallback(async (request: LLMResearchRequest, useStreaming = false) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);

    try {
      if (useStreaming) {
        await performLLMResearchStreaming(
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
        const data = await performLLMResearch(request);
        setResult(data);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }, []);

  return {
    research,
    progress,
    result,
    error,
    isLoading
  };
}

// Standard LLM Research
async function performLLMResearch(
  request: LLMResearchRequest
): Promise<LLMResearchResponse> {
  const response = await fetch('/api/keywords/llm-research', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `LLM research failed: ${response.statusText}`);
  }

  return response.json();
}

// LLM Research with SSE Streaming
async function performLLMResearchStreaming(
  request: LLMResearchRequest,
  onProgress: (update: ProgressUpdate) => void,
  onComplete: (result: LLMResearchResponse) => void,
  onError: (error: Error) => void
) {
  const response = await fetch('/api/keywords/llm-research/stream', {
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



