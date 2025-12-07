/**
 * API Route: Generate Image from Content
 * 
 * POST /api/images/generate-from-content
 * 
 * Generates an image using content-aware prompt generation.
 * Automatically creates optimal prompts based on blog content.
 */

import { NextRequest, NextResponse } from 'next/server';
import cloudRunHealth from '@/lib/cloud-run-health';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

const API_BASE_URL = BLOG_WRITER_API_URL;
const API_KEY = process.env.BLOG_WRITER_API_KEY;

export async function POST(request: NextRequest) {
  try {
    logger.debug('🖼️ Generate image from content API route called');
    
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

    const validImageTypes = ['featured', 'section_header', 'infographic'];
    if (!body.image_type || !validImageTypes.includes(body.image_type)) {
      return NextResponse.json(
        { error: `image_type is required and must be one of: ${validImageTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Ensure Cloud Run is healthy
    logger.debug('🌅 Checking Cloud Run health for content-aware image generation...');
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

    logger.debug('✅ Cloud Run is healthy, generating image from content...');
    
    // Call the external generate-from-content API
    const response = await fetch(`${API_BASE_URL}/api/v1/images/generate-from-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
      },
      body: JSON.stringify({
        content: body.content,
        topic: body.topic,
        keywords: body.keywords,
        image_type: body.image_type,
        tone: body.tone || 'professional',
        section_title: body.section_title,
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
    logger.debug('✅ Content-aware image generation started', { 
      jobId: result.job_id,
      status: result.status
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'generate-from-content',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
