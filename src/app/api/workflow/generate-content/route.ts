import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

/**
 * POST /api/workflow/generate-content
 * 
 * Phase 1: Generate blog content using enhanced generation endpoint
 */
export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
    const {
      topic,
      keywords,
      target_audience,
      tone,
      word_count,
      quality_level,
      custom_instructions,
    } = body;

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    logger.info('Phase 1: Starting content generation', { topic });

    // Call the enhanced generation endpoint
    // API is open - no authentication required, but check for optional API key
    const apiUrl = BLOG_WRITER_API_URL;
    const API_KEY = process.env.BLOG_WRITER_API_KEY || null;
    
    // Build headers - only include Authorization if API key is provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }
    
    logger.debug('🌐 Calling external API for workflow', { 
      url: `${apiUrl}/api/v1/blog/generate-enhanced`,
      hasApiKey: !!API_KEY,
      topic,
      keywordsCount: keywords?.length || 0
    });

    const response = await fetch(`${apiUrl}/api/v1/blog/generate-enhanced`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        topic,
        keywords: keywords || [],
        target_audience: target_audience || undefined,
        tone: tone || 'professional',
        word_count: word_count || 1500,
        quality_level: quality_level || 'high',
        custom_instructions: custom_instructions || undefined,
        use_consensus_generation: true,
        fallback_to_openai: true,
        use_dataforseo_content_generation: true,
        use_openai_fallback: true,
      }),
    });

    // Read response body once
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorText: string = responseText;
      // Try to parse as JSON for better error messages
      try {
        const errorJson = JSON.parse(responseText);
        errorText = errorJson.error || errorJson.message || responseText;
      } catch {
        // Keep as text if not JSON
      }
      
      logger.error('Content generation API error', { 
        status: response.status, 
        error: errorText,
        endpoint: `${apiUrl}/api/v1/blog/generate-enhanced`,
        responsePreview: responseText.substring(0, 500),
      });
      throw new Error(`Content generation failed: ${errorText}`);
    }

    // Parse successful response
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('Failed to parse API response as JSON', {
        responseText: responseText.substring(0, 500),
        status: response.status,
      });
      throw new Error(`Invalid JSON response from API: ${response.status}`);
    }
    
    // Log response structure for debugging
    logger.debug('Content generation API response', {
      hasTitle: !!data.title,
      hasContent: !!data.content,
      hasExcerpt: !!data.excerpt,
      keys: Object.keys(data),
    });

    // Extract relevant fields
    const result = {
      title: data.title || data.generated_title || topic,
      content: data.content || data.generated_content || '',
      excerpt: data.excerpt || data.summary || '',
      word_count: data.word_count || 0,
      seo_data: {
        meta_title: data.meta_title || data.seo_title || data.title,
        meta_description: data.meta_description || data.excerpt,
        keywords: data.keywords || keywords,
        slug: data.slug || topic.toLowerCase().replace(/\s+/g, '-'),
      },
      quality_score: data.quality_score,
      generation_time: data.generation_time,
    };

    logger.info('Phase 1: Content generation completed', {
      title: result.title,
      wordCount: result.word_count,
    });

    return NextResponse.json(result);

  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Content generation failed';
    const errorStack = error?.stack;
    
    logger.error('Phase 1 error', { 
      error: errorMessage,
      stack: errorStack,
      errorType: error?.constructor?.name,
      topic: body?.topic,
    });
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}

