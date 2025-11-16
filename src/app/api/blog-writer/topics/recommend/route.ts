/**
 * API Route: Topic Recommendations
 * 
 * POST /api/blog-writer/topics/recommend
 * 
 * Recommends blog topics based on keywords, industry, or existing content
 * Proxies to /api/v1/topics/recommend endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import cloudRunHealthManager from '@/lib/cloud-run-health';
import { logger } from '@/utils/logger';
import { parseJsonBody, handleApiError } from '@/lib/api-utils';

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
      keywords?: string[];
      industry?: string;
      existing_topics?: string[];
      target_audience?: string;
      count?: number;
    }>(request);
    
    const { keywords, industry, existing_topics, target_audience, count } = body;

    // Build request payload
    // Backend API expects 'seed_keywords' instead of 'keywords'
    const requestPayload: Record<string, unknown> = {};

    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      // Map 'keywords' to 'seed_keywords' for backend API
      requestPayload.seed_keywords = keywords;
    }

    if (industry) requestPayload.industry = industry;
    if (existing_topics && Array.isArray(existing_topics)) {
      requestPayload.existing_topics = existing_topics;
    }
    if (target_audience) requestPayload.target_audience = target_audience;
    if (count && typeof count === 'number') {
      requestPayload.count = Math.min(Math.max(count, 1), 50); // Limit 1-50
    } else {
      requestPayload.count = 10; // Default
    }

    // At least one parameter is required
    if (!requestPayload.seed_keywords && !requestPayload.industry && !requestPayload.existing_topics) {
      return NextResponse.json(
        { error: 'At least one of keywords, industry, or existing_topics is required' },
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

    // Call the external blog writer API
    const response = await fetch(`${BLOG_WRITER_API_URL}/api/v1/topics/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(BLOG_WRITER_API_KEY && { 'Authorization': `Bearer ${BLOG_WRITER_API_KEY}` }),
      },
      body: JSON.stringify(requestPayload),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }));
      logger.error('Backend API error for /topics/recommend', {
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
      context: 'blog-writer-topics-recommend',
    });
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout. The topic recommendation took too long.' },
        { status: 504 }
      );
    }
    
    return handleApiError(error);
  }
}

