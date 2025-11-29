/**
 * API Streaming Utilities
 * Handles Server-Sent Events (SSE) streaming for keyword research endpoints
 */

import { logger } from '@/utils/logger';

export interface StreamProgressUpdate {
  stage: string;
  progress: number;
  message?: string;
  data?: any;
}

export interface StreamOptions {
  onProgress?: (update: StreamProgressUpdate) => void;
  onError?: (error: Error) => void;
  onComplete?: (data: any) => void;
}

/**
 * Stream keyword research results from API endpoint
 */
export async function streamKeywordResearch(
  endpoint: string,
  requestBody: any,
  options: StreamOptions = {}
): Promise<any> {
  const { onProgress, onError, onComplete } = options;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    let buffer = '';
    let finalResult: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = line.slice(6);
            
            // Handle empty data (heartbeat)
            if (data.trim() === '') continue;
            
            const update: StreamProgressUpdate = JSON.parse(data);
            
            // Emit progress update
            if (onProgress) {
              onProgress(update);
            }

            // Handle completion
            if (update.stage === 'completed' && update.data) {
              finalResult = update.data.result || update.data;
              if (onComplete) {
                onComplete(finalResult);
              }
            }
            
            // Handle errors
            if (update.stage === 'error') {
              const error = new Error(update.data?.error || update.message || 'Unknown error');
              if (onError) {
                onError(error);
              } else {
                throw error;
              }
            }
          } catch (parseError) {
            logger.warn('Failed to parse SSE data', { line, error: parseError });
          }
        } else if (line.startsWith('event: ')) {
          // Handle event types if needed
          const eventType = line.slice(7);
          logger.debug('SSE event', { eventType });
        }
      }
    }

    if (!finalResult) {
      throw new Error('Stream completed but no result data received');
    }

    return finalResult;
  } catch (error) {
    logger.error('Stream error', { error, endpoint });
    if (onError) {
      onError(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
    throw error;
  }
}

/**
 * Stream AI Topic Suggestions with progress updates
 */
export async function streamAITopicSuggestions(
  request: {
    keywords: string[];
    location?: string;
    language?: string;
    include_ai_search_volume?: boolean;
    include_llm_mentions?: boolean;
    limit?: number;
    content_objective?: string;
    target_audience?: string;
    industry?: string;
    content_goals?: string[];
  },
  options: StreamOptions = {}
): Promise<any> {
  const endpoint = '/api/keywords/ai-topic-suggestions/stream';
  return streamKeywordResearch(endpoint, request, options);
}

/**
 * Stream Goal-Based Analysis with progress updates
 */
export async function streamGoalBasedAnalysis(
  request: {
    keywords: string[];
    content_goal: 'SEO & Rankings' | 'Engagement' | 'Conversions' | 'Brand Awareness';
    location?: string;
    language?: string;
    include_serp?: boolean;
    include_content_analysis?: boolean;
    include_llm_mentions?: boolean;
  },
  options: StreamOptions = {}
): Promise<any> {
  const endpoint = '/api/keywords/goal-based-analysis/stream';
  return streamKeywordResearch(endpoint, request, options);
}

/**
 * Stream Enhanced Keyword Analysis with progress updates
 */
export async function streamEnhancedKeywordAnalysis(
  request: {
    keywords: string[];
    location?: string;
    language?: string;
    search_type?: string;
    include_serp?: boolean;
    max_suggestions_per_keyword?: number;
  },
  options: StreamOptions = {}
): Promise<any> {
  const endpoint = '/api/keywords/enhanced/stream';
  return streamKeywordResearch(endpoint, request, options);
}

/**
 * Stream Server-Side Keyword Research with caching and storage
 * This is the preferred method - all research happens server-side
 */
export async function streamServerSideKeywordResearch(
  request: {
    keyword: string;
    location?: string;
    language?: string;
    searchType?: 'traditional' | 'ai' | 'both';
    useCache?: boolean;
    autoStore?: boolean;
  },
  options: StreamOptions = {}
): Promise<any> {
  const endpoint = '/api/keywords/research/stream';
  
  const { onProgress, onError, onComplete } = options;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    let buffer = '';
    let finalResult: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = line.slice(6);
            
            // Handle empty data (heartbeat)
            if (data.trim() === '') continue;
            
            const update: any = JSON.parse(data);
            
            // Handle different event types
            if (update.type === 'progress') {
              // Emit progress update
              if (onProgress) {
                onProgress({
                  stage: update.stage || 'processing',
                  progress: update.progress || 0,
                  message: update.message,
                  data: update.data,
                });
              }
            } else if (update.type === 'complete') {
              // Handle completion
              finalResult = update;
              if (onComplete) {
                onComplete(update);
              }
            } else if (update.type === 'error') {
              // Handle errors
              const error = new Error(update.error || 'Unknown error');
              if (onError) {
                onError(error);
              } else {
                throw error;
              }
            }
          } catch (parseError) {
            logger.warn('Failed to parse SSE data', { line, error: parseError });
          }
        }
      }
    }

    if (!finalResult) {
      throw new Error('Stream completed but no result data received');
    }

    return finalResult;
  } catch (error) {
    logger.error('Stream error', { error, endpoint });
    if (onError) {
      onError(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
    throw error;
  }
}

