/**
 * API Route: LLM Blog Analysis
 * 
 * POST /api/llm/analyze-blog
 * 
 * Uses OpenAI GPT-4 to analyze blog content and generate optimized fields
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { llmAnalysisService } from '@/lib/llm-analysis-service';
import { logger } from '@/utils/logger';
import { handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      content,
      images = [],
      existingFields = {},
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Check if OpenAI is configured
    if (!llmAnalysisService.isConfigured()) {
      logger.warn('OpenAI not configured, returning fallback analysis', {
        userId: user.id,
      });
      
      // Return fallback analysis
      return NextResponse.json({
        success: true,
        fallback: true,
        message: 'OpenAI not configured. Using basic extraction.',
        data: {
          seoTitle: title.substring(0, 60),
          metaDescription: content.substring(0, 160),
          excerpt: content.substring(0, 200),
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          imageDescriptions: images.map((img: { url: string }) => ({
            url: img.url,
            altText: 'Blog image',
            description: 'Blog image',
          })),
          suggestions: {
            missingFields: [],
            recommendations: ['Configure OpenAI API key for advanced analysis'],
            improvements: [],
          },
          estimatedReadTime: Math.ceil(content.split(/\s+/).length / 200),
          wordCount: content.split(/\s+/).length,
          keywords: [],
          topics: [],
        },
      });
    }

    logger.debug('LLM blog analysis request', {
      userId: user.id,
      title,
      contentLength: content.length,
      imageCount: images.length,
    });

    try {
      const analysis = await llmAnalysisService.analyzeBlogContent({
        title,
        content,
        images,
        existingFields,
      });

      logger.debug('LLM analysis completed', {
        userId: user.id,
        seoTitle: analysis.seoTitle,
        imageDescriptionsCount: analysis.imageDescriptions.length,
      });

      return NextResponse.json({
        success: true,
        fallback: false,
        data: analysis,
      });
    } catch (llmError: any) {
      logger.error('LLM analysis error', {
        error: llmError.message,
        userId: user.id,
      });
      
      // Return fallback on error
      return NextResponse.json({
        success: true,
        fallback: true,
        message: `LLM analysis failed: ${llmError.message}. Using basic extraction.`,
        data: {
          seoTitle: title.substring(0, 60),
          metaDescription: content.substring(0, 160),
          excerpt: content.substring(0, 200),
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          imageDescriptions: images.map((img: { url: string }) => ({
            url: img.url,
            altText: 'Blog image',
            description: 'Blog image',
          })),
          suggestions: {
            missingFields: [],
            recommendations: ['LLM analysis unavailable. Please configure OpenAI API key.'],
            improvements: [],
          },
          estimatedReadTime: Math.ceil(content.split(/\s+/).length / 200),
          wordCount: content.split(/\s+/).length,
          keywords: [],
          topics: [],
        },
      });
    }
  } catch (error) {
    logger.error('Error in LLM analyze-blog route', { error });
    return handleApiError(error);
  }
}

