import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import { analyzeContent } from '@/lib/content-analysis-service';

/**
 * POST /api/workflow/enhance-content
 * 
 * Phase 3: Enhance content with SEO optimization and structured data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      content,
      title,
      topic,
      keywords,
      generate_structured_data,
    } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    logger.info('Phase 3: Starting content enhancement', { title });

    // Perform local content analysis
    const analysis = analyzeContent({
      content,
      title,
      keywords,
      target_keyword: keywords?.[0],
    });

    // Call backend enhancement endpoint
    const apiUrl = BLOG_WRITER_API_URL;
    const enhancementResponse = await fetch(`${apiUrl}/api/v1/content/enhance-fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BLOG_WRITER_API_KEY || ''}`,
      },
      body: JSON.stringify({
        content,
        title,
        topic,
        keywords,
        fields_to_enhance: [
          'meta_title',
          'meta_description',
          'excerpt',
          'slug',
          'structured_data',
        ],
      }),
    });

    let enhancedFields: Record<string, any> = {};

    if (enhancementResponse.ok) {
      const enhancementData = await enhancementResponse.json();
      enhancedFields = enhancementData.enhanced_fields || {};
    } else {
      logger.warn('Backend enhancement failed, using local analysis');
      // Use local analysis as fallback
      enhancedFields = {
        meta_title: title,
        meta_description: content.substring(0, 160),
        slug: title?.toLowerCase().replace(/\s+/g, '-') || topic.toLowerCase().replace(/\s+/g, '-'),
      };
    }

    // Generate structured data if requested
    if (generate_structured_data) {
      enhancedFields.structured_data = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description: enhancedFields.meta_description || analysis.recommendations?.[0] || '',
        keywords: keywords?.join(', ') || '',
        wordCount: analysis.word_count,
        articleBody: content.replace(/<[^>]+>/g, '').substring(0, 500),
      };
    }

    const result = {
      enhanced_fields: enhancedFields,
      seo_score: analysis.seo_score,
      readability_score: analysis.readability_score,
      quality_score: analysis.quality_score,
      recommendations: analysis.recommendations,
      missing_keywords: analysis.missing_keywords,
    };

    logger.info('Phase 3: Content enhancement completed', {
      seoScore: result.seo_score,
      readabilityScore: result.readability_score,
    });

    return NextResponse.json(result);

  } catch (error: any) {
    logger.error('Phase 3 error', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Content enhancement failed' },
      { status: 500 }
    );
  }
}

