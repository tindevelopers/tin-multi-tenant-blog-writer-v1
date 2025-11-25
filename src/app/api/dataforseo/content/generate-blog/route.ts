/**
 * API Route: DataForSEO Content Generation - Generate Blog Content
 * 
 * POST /api/dataforseo/content/generate-blog
 * 
 * Generates complete blog content (text + subtopics + meta tags) using DataForSEO
 * Uses optimized keywords from keyword research
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dataForSEOContentGeneration } from '@/lib/dataforseo-content-generation';
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
      topic,
      keywords = [],
      target_audience,
      tone = 'professional',
      word_count = 1000,
      language = 'en',
    } = body;

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'At least one keyword is required' },
        { status: 400 }
      );
    }

    logger.debug('DataForSEO generate blog content request', {
      userId: user.id,
      topic,
      keywordCount: keywords.length,
      keywords: keywords.slice(0, 5), // Log first 5 keywords
      target_audience,
      tone,
      word_count,
      language,
    });

    const result = await dataForSEOContentGeneration.generateBlogContent({
      topic,
      keywords,
      target_audience,
      tone,
      word_count,
      language,
    });

    logger.debug('DataForSEO blog content generated', {
      contentLength: result.content.length,
      subtopicsCount: result.subtopics.length,
      hasMetaTags: !!result.meta_title,
      cost: result.cost,
    });

    return NextResponse.json({
      success: true,
      content: result.content,
      subtopics: result.subtopics,
      meta_title: result.meta_title,
      meta_description: result.meta_description,
      cost: result.cost,
      word_count: result.content.split(/\s+/).length,
    });
  } catch (error) {
    logger.error('Error generating blog content with DataForSEO', { error });
    return handleApiError(error);
  }
}

