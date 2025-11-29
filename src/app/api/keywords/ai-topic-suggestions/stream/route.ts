/**
 * API Route: AI Topic Suggestions (Streaming)
 * 
 * POST /api/keywords/ai-topic-suggestions/stream
 * 
 * Proxies to /api/v1/keywords/ai-topic-suggestions/stream endpoint with SSE streaming
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { parseJsonBody } from '@/lib/api-utils';
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
      limit = 50,
    } = body;

    // Validate
    if (!keywords && !content_objective) {
      return new Response(
        JSON.stringify({ error: 'Either keywords or content_objective must be provided' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check Cloud Run health
    const healthStatus = await cloudRunHealthManager.checkHealth();
    if (!healthStatus.isHealthy && !healthStatus.isWakingUp) {
      const wakeStatus = await cloudRunHealthManager.wakeUpAndWait();
      if (!wakeStatus.isHealthy) {
        return new Response(
          JSON.stringify({ error: wakeStatus.error || 'API service is unavailable' }),
          { 
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Build request payload
    const payload: Record<string, unknown> = {
      location,
      language,
      include_ai_search_volume,
      include_llm_mentions,
      limit,
    };

    if (keywords && keywords.length > 0) {
      payload.keywords = keywords;
    }
    if (content_objective) payload.content_objective = content_objective;
    if (target_audience) payload.target_audience = target_audience;
    if (industry) payload.industry = industry;
    if (content_goals && content_goals.length > 0) {
      payload.content_goals = content_goals;
    }

    // Call Cloud Run streaming endpoint
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (BLOG_WRITER_API_KEY) {
      headers['Authorization'] = `Bearer ${BLOG_WRITER_API_KEY}`;
      headers['X-API-Key'] = BLOG_WRITER_API_KEY;
    }

    const backendResponse = await fetch(`${BLOG_WRITER_API_URL}/api/v1/keywords/ai-topic-suggestions/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return new Response(
        JSON.stringify({ error: `Backend API error: ${backendResponse.status}` }),
        { 
          status: backendResponse.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Stream the response back to client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = backendResponse.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }

            // Forward the chunk to the client
            controller.enqueue(value);
          }
        } catch (error) {
          logger.error('Streaming error', { error });
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    logger.error('Failed to stream AI topic suggestions', { error });
    return new Response(
      JSON.stringify({ error: 'Failed to stream AI topic suggestions' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

