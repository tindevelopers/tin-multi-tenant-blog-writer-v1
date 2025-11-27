/**
 * API Route: Image Job Status Proxy
 * 
 * GET /api/images/jobs/[id]
 * 
 * Proxies image job status requests to Cloud Run API to avoid CORS issues.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

const API_BASE_URL = BLOG_WRITER_API_URL;
const API_KEY = process.env.BLOG_WRITER_API_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    logger.debug('🖼️ Image job status API route called', { jobId });
    
    // Call the external image job status API
    const response = await fetch(`${API_BASE_URL}/api/v1/images/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
      },
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
    logger.debug('✅ Image job status retrieved successfully');
    
    return NextResponse.json(result);
    
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'image-job-status',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

