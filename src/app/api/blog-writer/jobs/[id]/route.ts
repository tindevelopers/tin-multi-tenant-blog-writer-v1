import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser } from '@/lib/api-utils';
import cloudRunHealth from '@/lib/cloud-run-health';

import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

const API_BASE_URL = BLOG_WRITER_API_URL;
const API_KEY = process.env.BLOG_WRITER_API_KEY;

/**
 * GET /api/blog-writer/jobs/[id]
 * Get the status of a blog generation job
 * 
 * This endpoint proxies to the backend API's /api/v1/blog/jobs/[id] endpoint
 * to check the status of an async blog generation job.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    logger.debug('📊 Fetching job status', { job_id: id });

    // Ensure Cloud Run is awake and healthy
    const healthStatus = await cloudRunHealth.wakeUpAndWait();
    
    if (!healthStatus.isHealthy) {
      logger.error('❌ Cloud Run is not healthy:', healthStatus.error);
      return NextResponse.json(
        { error: 'Cloud Run service is not available' },
        { status: 503 }
      );
    }

    // Proxy request to backend API
    const response = await fetch(`${API_BASE_URL}/api/v1/blog/jobs/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('❌ Backend API error', { 
        status: response.status, 
        error: errorText,
        job_id: id 
      });
      
      return NextResponse.json(
        { error: `Backend API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const jobStatus = await response.json();
    logger.debug('✅ Job status retrieved', { 
      job_id: id,
      status: jobStatus.status,
      progress: jobStatus.progress_percentage 
    });

    return NextResponse.json(jobStatus);
  } catch (error) {
    logger.error('❌ Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

