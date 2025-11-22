/**
 * API Route: AI Optimization for Keywords
 * 
 * POST /api/keywords/ai-optimization
 * 
 * Analyzes keywords for AI visibility and optimization potential
 * Uses the /api/v1/keywords/ai-optimization endpoint
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
      keywords: string[];
      location?: string;
      language?: string;
    }>(request);
    
    const { keywords, location = 'United States', language = 'en' } = body;

    // Validate required fields
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'keywords array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Check Cloud Run health (but allow wake-up attempts)
    const healthStatus = await cloudRunHealthManager.checkHealth();
    if (!healthStatus.isHealthy && !healthStatus.isWakingUp) {
      // Try to wake up the service
      logger.debug('Cloud Run not healthy, attempting wake-up');
      const wakeStatus = await cloudRunHealthManager.wakeUpAndWait();
      if (!wakeStatus.isHealthy) {
        return NextResponse.json(
          { error: wakeStatus.error || 'API service is unavailable' },
          { status: 503 }
        );
      }
    }

    // Call the AI optimization endpoint
    const response = await fetch(`${BLOG_WRITER_API_URL}/api/v1/keywords/ai-optimization`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(BLOG_WRITER_API_KEY && { 'Authorization': `Bearer ${BLOG_WRITER_API_KEY}` }),
      },
      body: JSON.stringify({
        keywords,
        location,
        language,
      }),
      signal: AbortSignal.timeout(60000), // 60 second timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }));
      logger.error('AI Optimization API error', {
        status: response.status,
        error: errorData,
      });
      
      const errorMessage = (errorData as { detail?: string; error?: string; message?: string }).detail || 
        (errorData as { detail?: string; error?: string; message?: string }).error || 
        (errorData as { detail?: string; error?: string; message?: string }).message || 
        `API returned ${response.status}`;
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'keywords-ai-optimization',
    });
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout. The AI optimization took too long.' },
        { status: 504 }
      );
    }
    
    return handleApiError(error);
  }
}

