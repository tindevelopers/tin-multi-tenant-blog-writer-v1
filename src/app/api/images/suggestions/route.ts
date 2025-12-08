/**
 * API Route: Image Suggestions from Content
 * 
 * POST /api/images/suggestions
 * 
 * Analyzes blog content and returns image placement suggestions.
 * Content-aware prompt generation for optimal image placement.
 */

import { NextRequest, NextResponse } from 'next/server';
import cloudRunHealth from '@/lib/cloud-run-health';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

const API_BASE_URL = BLOG_WRITER_API_URL;
const API_KEY = process.env.BLOG_WRITER_API_KEY;

export async function POST(request: NextRequest) {
  try {
    logger.debug('🖼️ Image suggestions API route called');
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.content || typeof body.content !== 'string' || body.content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Content is required and must be at least 50 characters' },
        { status: 400 }
      );
    }

    if (!body.topic || typeof body.topic !== 'string' || body.topic.trim().length < 3) {
      return NextResponse.json(
        { error: 'Topic is required and must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!body.keywords || !Array.isArray(body.keywords) || body.keywords.length === 0) {
      return NextResponse.json(
        { error: 'Keywords array is required and must contain at least one keyword' },
        { status: 400 }
      );
    }

    // Ensure Cloud Run is healthy
    logger.debug('🌅 Checking Cloud Run health for image suggestions...');
    const healthStatus = await cloudRunHealth.wakeUpAndWait();
    
    if (!healthStatus.isHealthy) {
      logger.error('❌ Cloud Run is not healthy', { error: healthStatus.error });
      return NextResponse.json(
        { 
          error: healthStatus.isWakingUp 
            ? 'Cloud Run service is starting up. Please wait a moment and try again.'
            : `Cloud Run is not healthy: ${healthStatus.error}` 
        },
        { status: 503 }
      );
    }

    logger.debug('✅ Cloud Run is healthy, fetching image suggestions...');
    
    // Call the external image suggestions API
    const response = await fetch(`${API_BASE_URL}/api/v1/images/suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
      },
      body: JSON.stringify({
        content: body.content,
        topic: body.topic,
        keywords: body.keywords,
        tone: body.tone || 'professional',
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
    
    logger.debug('📥 External API response status', { status: response.status });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('❌ External API error', { status: response.status, error: errorText });
      return NextResponse.json(
        { error: `External API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    logger.debug('✅ Image suggestions retrieved successfully', { 
      suggestionsCount: result.suggestions?.length || 0,
      recommendedCount: result.recommended_count || 0
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'image-suggestions',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
