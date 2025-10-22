import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import cloudRunHealth from '@/lib/cloud-run-health';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Blog generation API route called');
    
    // Parse request body
    const body = await request.json();
    const { topic, keywords, target_audience, tone, word_count } = body;
    
    console.log('📝 Generation parameters:', {
      topic,
      keywords,
      target_audience,
      tone,
      word_count
    });
    
    // Validate required fields
    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }
    
    // Use service client with default system values
    const supabase = createServiceClient();
    const userId = '00000000-0000-0000-0000-000000000002'; // System user
    const orgId = '00000000-0000-0000-0000-000000000001'; // Default org
    console.log('✅ Using service client with system user:', userId, 'Org:', orgId);
    
    // First, ensure Cloud Run is awake and healthy
    console.log('🌅 Checking Cloud Run health...');
    const healthStatus = await cloudRunHealth.wakeUpAndWait();
    
    if (!healthStatus.isHealthy) {
      console.error('❌ Cloud Run is not healthy:', healthStatus.error);
      return NextResponse.json(
        { error: `Cloud Run is not healthy: ${healthStatus.error}` },
        { status: 503 }
      );
    }
    
    console.log('✅ Cloud Run is healthy, proceeding with blog generation...');
    
    // Call the external blog writer API
    const API_BASE_URL = process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west1.run.app';
    const API_KEY = process.env.BLOG_WRITER_API_KEY;
    
    console.log('🌐 Calling external API:', `${API_BASE_URL}/api/v1/blog/generate`);
    console.log('🔑 API Key present:', !!API_KEY);
    console.log('📤 Request payload:', {
      topic,
      keywords,
      target_audience,
      tone,
      word_count
    });
    
    const response = await fetch(`${API_BASE_URL}/api/v1/blog/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
      },
      body: JSON.stringify({
        topic,
        keywords,
        target_audience,
        tone,
        word_count
      }),
    });
    
    console.log('📥 External API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ External API error:', response.status, errorText);
      return NextResponse.json(
        { error: `External API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    console.log('✅ Blog generated successfully from external API');
    console.log('📄 Full API response structure:', {
      hasContent: !!result.content,
      hasTitle: !!result.title,
      hasExcerpt: !!result.excerpt,
      hasBlogPost: !!result.blog_post,
      keys: Object.keys(result),
      contentPreview: result.content?.substring(0, 100) || 'No content'
    });
    
    // Transform the response to match our expected format
    if (result.success && result.blog_post) {
      const transformedResult = {
        content: result.blog_post.content || result.blog_post.body || '',
        title: result.blog_post.title || '',
        excerpt: result.blog_post.excerpt || result.blog_post.summary || '',
        word_count: result.word_count || 0,
        seo_score: result.seo_score || 0,
        readability_score: result.readability_score || 0,
        warnings: result.warnings || [],
        suggestions: result.suggestions || []
      };
      
      console.log('📄 Transformed result:', {
        contentLength: transformedResult.content.length,
        title: transformedResult.title,
        excerpt: transformedResult.excerpt,
        wordCount: transformedResult.word_count
      });
      
      return NextResponse.json(transformedResult);
    } else {
      console.error('❌ API returned unsuccessful result:', {
        success: result.success,
        errorMessage: result.error_message,
        errorCode: result.error_code
      });
      return NextResponse.json(
        { error: result.error_message || 'Blog generation failed' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Error in blog generation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
