/**
 * API Route: Batch Image Generation
 * 
 * POST /api/images/batch-generate
 * 
 * Generates multiple images in parallel for optimal performance.
 * Supports both standard and draft_then_final workflows.
 */

import { NextRequest, NextResponse } from 'next/server';
import cloudRunHealth from '@/lib/cloud-run-health';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

const API_BASE_URL = BLOG_WRITER_API_URL;
const API_KEY = process.env.BLOG_WRITER_API_KEY;

export async function POST(request: NextRequest) {
  try {
    logger.debug('🖼️ Batch image generation API route called');
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
      return NextResponse.json(
        { error: 'images array is required and must contain at least one image request' },
        { status: 400 }
      );
    }

    // Validate each image request
    for (let i = 0; i < body.images.length; i++) {
      const img = body.images[i];
      if (!img.prompt || typeof img.prompt !== 'string' || img.prompt.trim().length < 3) {
        return NextResponse.json(
          { error: `Image ${i + 1}: prompt is required and must be at least 3 characters` },
          { status: 400 }
        );
      }
    }

    // Validate workflow if provided
    const validWorkflows = ['standard', 'draft_then_final'];
    if (body.workflow && !validWorkflows.includes(body.workflow)) {
      return NextResponse.json(
        { error: `workflow must be one of: ${validWorkflows.join(', ')}` },
        { status: 400 }
      );
    }

    // Ensure Cloud Run is healthy
    logger.debug('🌅 Checking Cloud Run health for batch image generation...');
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

    logger.debug('✅ Cloud Run is healthy, starting batch image generation...', {
      imageCount: body.images.length,
      workflow: body.workflow || 'standard'
    });
    
    // Call the external batch-generate API
    const response = await fetch(`${API_BASE_URL}/api/v1/images/batch-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
      },
      body: JSON.stringify({
        images: body.images.map((img: Record<string, unknown>) => ({
          prompt: img.prompt,
          provider: img.provider || 'stability_ai',
          style: img.style || 'photographic',
          aspect_ratio: img.aspect_ratio || '16:9',
          quality: img.quality || 'high',
          width: img.width,
          height: img.height,
        })),
        blog_id: body.blog_id,
        workflow: body.workflow || 'standard',
      }),
      signal: AbortSignal.timeout(120000), // 120 second timeout for batch operations
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
    logger.debug('✅ Batch image generation started', { 
      jobIds: result.job_ids,
      status: result.status
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'batch-generate',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
