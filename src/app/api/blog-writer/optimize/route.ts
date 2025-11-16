/**
 * API Route: Content Optimization
 * 
 * POST /api/blog-writer/optimize
 * 
 * Optimizes existing content for SEO and readability
 * Proxies to /api/v1/optimize endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import cloudRunHealthManager from '@/lib/cloud-run-health';
import { logger } from '@/utils/logger';
import { parseJsonBody, validateRequiredFields, handleApiError } from '@/lib/api-utils';

import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
const BLOG_WRITER_API_KEY = process.env.BLOG_WRITER_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (optional for testing)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Allow unauthenticated requests for testing (similar to blog generation route)
    // In production, you may want to enforce authentication
    if (authError || !user) {
      logger.debug('No authenticated user, proceeding with system defaults');
    }

    // Parse request body
    const body = await parseJsonBody<{
      content: string;
      topic: string;
      keywords: string[];
      optimization_goals?: string[];
    }>(request);
    
    validateRequiredFields(body, ['content', 'topic', 'keywords']);

    const { content, topic, keywords, optimization_goals } = body;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'At least one keyword is required' },
        { status: 400 }
      );
    }

    // Check Cloud Run health
    const healthStatus = await cloudRunHealthManager.checkHealth();
    if (!healthStatus.isHealthy) {
      return NextResponse.json(
        { error: healthStatus.error || 'API service is unavailable' },
        { status: 503 }
      );
    }

    // Build request payload
    const requestPayload: Record<string, unknown> = {
      content,
      topic,
      keywords,
    };

    // Default to all optimization goals if not specified
    if (optimization_goals && Array.isArray(optimization_goals)) {
      requestPayload.optimization_goals = optimization_goals;
    } else {
      requestPayload.optimization_goals = ['seo', 'readability', 'keywords'];
    }

    // Call the external blog writer API
    const response = await fetch(`${BLOG_WRITER_API_URL}/api/v1/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(BLOG_WRITER_API_KEY && { 'Authorization': `Bearer ${BLOG_WRITER_API_KEY}` }),
      },
      body: JSON.stringify(requestPayload),
      signal: AbortSignal.timeout(120000), // 2 minute timeout for optimization
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }));
      logger.error('Backend API error for /optimize', {
        status: response.status,
        error: errorData,
      });
      
      // Extract error message
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
      context: 'blog-writer-optimize',
    });
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout. The optimization took too long.' },
        { status: 504 }
      );
    }
    
    return handleApiError(error);
  }
}

