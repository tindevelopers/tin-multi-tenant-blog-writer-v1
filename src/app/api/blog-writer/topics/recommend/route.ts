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
    const { keywords, industry, existing_topics, target_audience, count } = body;

    // Build request payload
    const requestPayload: Record<string, unknown> = {};

    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      requestPayload.keywords = keywords;
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
    if (!requestPayload.keywords && !requestPayload.industry && !requestPayload.existing_topics) {
      return NextResponse.json(
        { error: 'At least one of keywords, industry, or existing_topics is required' },
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
      console.error('Backend API error for /topics/recommend:', errorData);
      
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
    console.error('Error in /api/blog-writer/topics/recommend:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout. The topic recommendation took too long.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

