/**
 * API Route: Image Generation Proxy
 * 
 * POST /api/images/generate
 * 
 * Proxies image generation requests to Cloud Run API to avoid CORS issues.
 */

import { NextRequest, NextResponse } from 'next/server';
import cloudRunHealth from '@/lib/cloud-run-health';
import { logger } from '@/utils/logger';

import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

const API_BASE_URL = BLOG_WRITER_API_URL;
const API_KEY = process.env.BLOG_WRITER_API_KEY;

export async function POST(request: NextRequest) {
  try {
    logger.debug('🖼️ Image generation API route called');
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'Prompt is required and must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Ensure Cloud Run is healthy
    logger.debug('🌅 Checking Cloud Run health for image generation...');
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

    logger.debug('✅ Cloud Run is healthy, proceeding with image generation...');
    
    // Call the external image generation API
    const response = await fetch(`${API_BASE_URL}/api/v1/images/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
      },
      body: JSON.stringify({
        provider: 'stability_ai',
        ...body
      }),
      signal: AbortSignal.timeout(60000), // 60 second timeout
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
    logger.debug('✅ Image generated successfully');
    
    return NextResponse.json(result);
    
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'image-generation',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

