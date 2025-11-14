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
import cloudRunHealth from '@/lib/cloud-run-health';

const BLOG_WRITER_API_URL = process.env.BLOG_WRITER_API_URL || 
  'https://blog-writer-api-dev-kq42l26tuq-ew.a.run.app';
const BLOG_WRITER_API_KEY = process.env.BLOG_WRITER_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (optional for testing)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Allow unauthenticated requests for testing (similar to blog generation route)
    // In production, you may want to enforce authentication
    if (authError || !user) {
      console.log('⚠️ No authenticated user, proceeding with system defaults');
    }

    // Parse request body
    const body = await request.json();
    const { content, topic, keywords, optimization_goals } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'At least one keyword is required' },
        { status: 400 }
      );
    }

    // Check Cloud Run health
    const healthStatus = await cloudRunHealth();
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
      console.error('Backend API error for /optimize:', errorData);
      
      // Extract error message
      const errorMessage = errorData.detail || errorData.error || errorData.message || 
        `API returned ${response.status}`;
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error in /api/blog-writer/optimize:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout. The optimization took too long.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

