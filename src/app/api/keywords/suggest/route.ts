import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { parseJsonBody, handleApiError } from '@/lib/api-utils';

import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return response;
      }
      
      // If it's a 503 (Service Unavailable), retry
      if (response.status === 503 && attempt < retries) {
        logger.debug(`⚠️ Cloud Run returned 503, retrying (${attempt}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        continue;
      }
      
      return response;
    } catch (error: unknown) {
      const isTimeout = error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'));
      const isNetworkError = error instanceof TypeError;
      
      if ((isTimeout || isNetworkError) && attempt < retries) {
        logger.debug(`⚠️ Network error, retrying (${attempt}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody<{
      keyword?: string;
      keywords?: string[];
      limit?: number;
      location?: string;
      language?: string;
    }>(request);
    
    // Cloud Run API expects 'keyword' (singular), not 'keywords' (array)
    // If keywords array is provided, use the first one
    // If keyword is provided, use it directly
    const keyword = body.keywords && Array.isArray(body.keywords) && body.keywords.length > 0
      ? body.keywords[0] // Use first keyword from array
      : body.keyword || null;
    
    if (!keyword) {
      return NextResponse.json(
        { error: 'Keyword is required' },
        { status: 400 }
      );
    }
    
    // Request 150 keywords by default (can be overridden by limit in body)
    const limit = body.limit || 150;
    
    // Try enhanced endpoint first (returns search volume, CPC, difficulty, competition)
    // If unavailable, fallback to suggest endpoint
    let endpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/enhanced`;
    let requestBody: {
      keywords: string[];
      location: string;
      language: string;
      include_search_volume: boolean;
      max_suggestions_per_keyword: number;
    } = {
      keywords: [keyword], // Enhanced endpoint requires array
      location: body.location || 'United States',
      language: body.language || 'en',
      include_search_volume: true,
      max_suggestions_per_keyword: limit
    };
    
    let response = await fetchWithRetry(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    // If enhanced endpoint returns 503 (not available), fallback to suggest endpoint
    if (response.status === 503) {
      logger.debug('⚠️ Enhanced endpoint unavailable, falling back to suggest endpoint');
      endpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/suggest`;
      requestBody = {
        keyword: keyword,
        limit: limit,
        include_search_volume: true,
        include_difficulty: true,
        include_competition: true,
        include_cpc: true,
        location: body.location || 'United States'
      } as unknown as typeof requestBody;
      
      response = await fetchWithRetry(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Blog Writer API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Handle enhanced endpoint response format
    if (data.enhanced_analysis) {
      // Enhanced endpoint returns analysis for the keyword with metadata
      const keywordAnalysis = data.enhanced_analysis[keyword];
      
      // Extract suggested keywords from related_keywords and long_tail_keywords
      const suggestedKeywords = [
        ...(keywordAnalysis?.related_keywords || []),
        ...(keywordAnalysis?.long_tail_keywords || [])
      ].slice(0, limit);
      
      // Map to expected format with metadata
      const suggestionsWithMetadata = suggestedKeywords.map((kw: string | { keyword?: string; [key: string]: unknown }) => {
        const keywordText = typeof kw === 'string' ? kw : (kw.keyword || String(kw));
        return {
          keyword: keywordText,
          search_volume: null, // Will need separate analysis for each suggestion
          difficulty: keywordAnalysis?.difficulty || null,
          competition: keywordAnalysis?.competition || null,
          cpc: keywordAnalysis?.cpc || null
        };
      });
      
      return NextResponse.json({
        suggestions: suggestionsWithMetadata,
        suggestions_with_topics: data.suggestions_with_topics || [],
        keyword_suggestions: suggestionsWithMetadata,
        total_suggestions: suggestedKeywords.length,
        clusters: data.clusters || [],
        cluster_summary: data.cluster_summary || {},
        // Include enhanced analysis data
        enhanced_analysis: data.enhanced_analysis,
        original_keyword_analysis: keywordAnalysis
      });
    }
    
    // Handle suggest endpoint response format (backward compatibility)
    return NextResponse.json({
      suggestions: data.keyword_suggestions || data.suggestions || [],
      suggestions_with_topics: data.suggestions_with_topics || [],
      keyword_suggestions: data.keyword_suggestions || data.suggestions || [],
      total_suggestions: data.total_suggestions || (data.keyword_suggestions?.length || data.suggestions?.length || 0),
      clusters: data.clusters || [],
      cluster_summary: data.cluster_summary || {}
    });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'keywords-suggest',
    });
    return handleApiError(error);
  }
}

