/**
 * API Route: Content Analysis
 * 
 * POST /api/blog-writer/analyze
 * 
 * Analyzes existing content for SEO, readability, and quality
 * Proxies to /api/v1/analyze endpoint
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
      topic?: string;
      keywords?: string[];
      target_audience?: string;
    }>(request);
    
    validateRequiredFields(body, ['content']);
    
    const { content, topic, keywords, target_audience } = body;

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
    };

    if (topic) requestPayload.topic = topic;
    if (keywords && Array.isArray(keywords)) requestPayload.keywords = keywords;
    if (target_audience) requestPayload.target_audience = target_audience;

    // Call the external blog writer API
    const response = await fetch(`${BLOG_WRITER_API_URL}/api/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(BLOG_WRITER_API_KEY && { 'Authorization': `Bearer ${BLOG_WRITER_API_KEY}` }),
      },
      body: JSON.stringify(requestPayload),
      signal: AbortSignal.timeout(60000), // 60 second timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }));
      logger.error('Backend API error for /analyze', {
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
      context: 'blog-writer-analyze',
    });
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout. The analysis took too long.' },
        { status: 504 }
      );
    }
    
    return handleApiError(error);
  }
}

