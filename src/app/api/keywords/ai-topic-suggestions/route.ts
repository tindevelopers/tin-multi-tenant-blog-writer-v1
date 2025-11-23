/**
 * API Route: AI Topic Suggestions
 * 
 * POST /api/keywords/ai-topic-suggestions
 * 
 * Proxies to /api/v1/keywords/ai-topic-suggestions endpoint
 * Enhanced endpoint that accepts content_objective, target_audience, industry, content_goals
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { parseJsonBody, handleApiError } from '@/lib/api-utils';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import cloudRunHealthManager from '@/lib/cloud-run-health';

const BLOG_WRITER_API_KEY = process.env.BLOG_WRITER_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody<{
      keywords?: string[];
      content_objective?: string;
      target_audience?: string;
      industry?: string;
      content_goals?: string[];
      location?: string;
      language?: string;
      include_ai_search_volume?: boolean;
      include_llm_mentions?: boolean;
      include_llm_responses?: boolean;
      limit?: number;
    }>(request);
    
    const {
      keywords,
      content_objective,
      target_audience,
      industry,
      content_goals,
      location = 'United States',
      language = 'en',
      include_ai_search_volume = true,
      include_llm_mentions = true,
      include_llm_responses = false,
      limit = 50,
    } = body;

    // Validate: must have either keywords or content_objective
    if (!keywords && !content_objective) {
      return NextResponse.json(
        { error: 'Either keywords or content_objective must be provided' },
        { status: 400 }
      );
    }

    // Check Cloud Run health (but allow wake-up attempts)
    const healthStatus = await cloudRunHealthManager.checkHealth();
    if (!healthStatus.isHealthy && !healthStatus.isWakingUp) {
      logger.debug('Cloud Run not healthy, attempting wake-up');
      const wakeStatus = await cloudRunHealthManager.wakeUpAndWait();
      if (!wakeStatus.isHealthy) {
        return NextResponse.json(
          { error: wakeStatus.error || 'API service is unavailable' },
          { status: 503 }
        );
      }
    }

    // Build request payload
    const payload: Record<string, unknown> = {
      location,
      language,
      include_ai_search_volume,
      include_llm_mentions,
      include_llm_responses,
      limit,
    };

    // Add optional fields
    if (keywords && keywords.length > 0) {
      payload.keywords = keywords;
    }
    if (content_objective) {
      payload.content_objective = content_objective;
    }
    if (target_audience) {
      payload.target_audience = target_audience;
    }
    if (industry) {
      payload.industry = industry;
    }
    if (content_goals && content_goals.length > 0) {
      payload.content_goals = content_goals;
    }

    logger.debug('Calling AI topic suggestions endpoint', {
      hasKeywords: !!keywords,
      hasContentObjective: !!content_objective,
      industry,
      limit,
    });

    // Call Cloud Run API
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (BLOG_WRITER_API_KEY) {
      headers['Authorization'] = `Bearer ${BLOG_WRITER_API_KEY}`;
      headers['X-API-Key'] = BLOG_WRITER_API_KEY;
    }

    const response = await fetch(`${BLOG_WRITER_API_URL}/api/v1/keywords/ai-topic-suggestions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Check if it's a 404 (endpoint doesn't exist)
      if (response.status === 404) {
        logger.warn('AI topic suggestions endpoint not found on backend', {
          url: `${BLOG_WRITER_API_URL}/api/v1/keywords/ai-topic-suggestions`,
          error: errorText.substring(0, 200),
        });
        
        // Return empty response instead of error to allow fallback
        return NextResponse.json({
          topic_suggestions: [],
          ai_metrics: {
            search_volume: {},
            llm_mentions: {},
          },
          message: 'AI topic suggestions endpoint not available, using traditional search only',
        });
      }
      
      logger.error('Backend API error for /ai-topic-suggestions', {
        status: response.status,
        error: errorText.substring(0, 200),
      });
      
      return NextResponse.json(
        { error: `Backend API error: ${response.status} ${errorText.substring(0, 200)}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // According to FRONTEND_INTEGRATION_TESTING_GUIDE.md, response structure is:
    // - topic_suggestions: Array of topic objects
    // - ai_metrics.llm_mentions: Record<string, LLMMentionsData>
    // - ai_metrics.search_volume: Record<string, any>
    const topicSuggestions = data.topic_suggestions || data.topics || [];
    const aiMetrics = data.ai_metrics || {};
    const llmMentions = aiMetrics.llm_mentions || {};
    
    logger.debug('AI topic suggestions response received', {
      topicsCount: topicSuggestions.length,
      hasTopics: topicSuggestions.length > 0,
      hasLLMMentions: Object.keys(llmMentions).length > 0,
      sampleLLMMention: Object.keys(llmMentions).length > 0 ? {
        keyword: Object.keys(llmMentions)[0],
        mentions_count: llmMentions[Object.keys(llmMentions)[0]]?.mentions_count,
        platform: llmMentions[Object.keys(llmMentions)[0]]?.platform,
      } : null,
    });

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Failed to get AI topic suggestions', { error });
    return handleApiError(error);
  }
}

