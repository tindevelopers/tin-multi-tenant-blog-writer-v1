/**
 * API Route: Goal-Based Analysis (Streaming)
 * 
 * POST /api/keywords/goal-based-analysis/stream
 * 
 * Proxies to /api/v1/keywords/goal-based-analysis/stream endpoint with SSE streaming
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
      keywords: string[];
      content_goal: 'SEO & Rankings' | 'Engagement' | 'Conversions' | 'Brand Awareness';
      location?: string;
      language?: string;
      include_serp?: boolean;
      include_content_analysis?: boolean;
      include_llm_mentions?: boolean;
    }>(request);
    
    const {
      keywords,
      content_goal,
      location = 'United States',
      language = 'en',
      include_serp = true,
      include_content_analysis = true,
      include_llm_mentions = true,
    } = body;

    if (!keywords || keywords.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Keywords are required' }),
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
    const payload = {
      keywords,
      content_goal,
      location,
      language,
      include_serp,
      include_content_analysis,
      include_llm_mentions,
    };

    // Call Cloud Run streaming endpoint
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (BLOG_WRITER_API_KEY) {
      headers['Authorization'] = `Bearer ${BLOG_WRITER_API_KEY}`;
      headers['X-API-Key'] = BLOG_WRITER_API_KEY;
    }

    const backendResponse = await fetch(`${BLOG_WRITER_API_URL}/api/v1/keywords/goal-based-analysis/stream`, {
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
    logger.error('Failed to stream goal-based analysis', { error });
    return new Response(
      JSON.stringify({ error: 'Failed to stream goal-based analysis' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

