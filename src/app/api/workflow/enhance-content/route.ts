import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import { analyzeContent } from '@/lib/content-analysis-service';
import { enhanceContentToRichHTML } from '@/lib/content-enhancer';
import { LLMAnalysisService } from '@/lib/llm-analysis-service';

/**
 * Generate high-quality meta description and excerpt using LLM Service
 */
async function generateEnhancedMetadata(
  content: string,
  title: string,
  keywords: string[]
): Promise<{ meta_description: string; excerpt: string; seo_title: string }> {
  try {
    const llmService = new LLMAnalysisService();
    
    if (!llmService.isConfigured()) {
      throw new Error('LLM service not configured');
    }
    
    const plainContent = content.replace(/<[^>]+>/g, '').substring(0, 3000);
    
    const result = await llmService.analyzeBlogContent({
      title,
      content: plainContent,
      existingFields: {
        metaDescription: '',
        excerpt: '',
        seoTitle: '',
      },
    });
    
    return {
      meta_description: result.metaDescription || title,
      excerpt: result.excerpt || title,
      seo_title: result.seoTitle || title,
    };
  } catch (error) {
    logger.warn('LLM metadata generation failed, using fallback', { error });
    // Fallback to basic extraction
    const plainText = content.replace(/<[^>]+>/g, '').trim();
    const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    return {
      meta_description: sentences[0]?.substring(0, 155).trim() + '...' || title,
      excerpt: sentences.slice(0, 2).join('. ').substring(0, 245).trim() + '...' || title,
      seo_title: title.length > 60 ? title.substring(0, 57) + '...' : title,
    };
  }
}

/**
 * Clean and improve HTML structure using OpenAI
 */
async function improveContentStructure(
  content: string,
  title: string
): Promise<string> {
  try {
    // First, use the local enhancer
    let enhanced = enhanceContentToRichHTML(content, {
      enhanceFormatting: true,
      addStructure: false, // We'll add structure separately
      includeImages: false,
    });

    // Check if content has proper heading structure
    const hasH1 = /<h1[^>]*>/i.test(enhanced);
    const hasH2 = /<h2[^>]*>/i.test(enhanced);
    
    // If missing proper heading structure, rely on local enhancer
    // The enhanced cleanAIArtifacts and markdownToHTML should handle most cases
    if (!hasH1 || !hasH2) {
      logger.debug('Content missing proper headings, relying on local enhancer improvements');
      // The local enhancer has been improved to handle these cases
    }

    return enhanced;
  } catch (error) {
    logger.warn('Content structure improvement failed', { error });
    return content;
  }
}

/**
 * POST /api/workflow/enhance-content
 * 
 * Phase 3: Enhance content with SEO optimization, proper formatting, and structured data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      content,
      title,
      topic,
      keywords = [],
      generate_structured_data,
      improve_formatting = true,
    } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    logger.info('Phase 3: Starting content enhancement', { title });

    // Step 1: Improve content structure and formatting
    let enhancedContent = content;
    if (improve_formatting) {
      enhancedContent = await improveContentStructure(content, title);
    }

    // Step 2: Perform local content analysis
    const analysis = analyzeContent({
      content: enhancedContent,
      title,
      keywords,
      target_keyword: keywords?.[0],
    });

    // Step 3: Generate enhanced metadata with OpenAI
    const keywordArray = Array.isArray(keywords) ? keywords : [keywords].filter(Boolean);
    const enhancedMetadata = await generateEnhancedMetadata(enhancedContent, title, keywordArray);

    // Step 4: Try backend enhancement for additional fields
    let backendFields: Record<string, any> = {};
    try {
      const apiUrl = BLOG_WRITER_API_URL;
      const enhancementResponse = await fetch(`${apiUrl}/api/v1/content/enhance-fields`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BLOG_WRITER_API_KEY || ''}`,
        },
        body: JSON.stringify({
          content: enhancedContent,
          title,
          topic,
          keywords: keywordArray,
          fields_to_enhance: ['slug', 'featured_image_alt'],
        }),
      });

      if (enhancementResponse.ok) {
        const enhancementData = await enhancementResponse.json();
        backendFields = enhancementData.enhanced_fields || {};
      }
    } catch (err) {
      logger.warn('Backend enhancement failed, using local fallback');
    }

    // Step 5: Generate slug if not provided
    const slug = backendFields.slug || 
      title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 60);

    // Step 6: Compile enhanced fields
    const enhancedFields: Record<string, any> = {
      content: enhancedContent,
      meta_title: enhancedMetadata.seo_title,
      meta_description: enhancedMetadata.meta_description,
      excerpt: enhancedMetadata.excerpt,
      slug,
      featured_image_alt: backendFields.featured_image_alt || `${title} - Featured Image`,
    };

    // Step 7: Generate structured data if requested
    if (generate_structured_data) {
      enhancedFields.structured_data = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: enhancedMetadata.seo_title,
        description: enhancedMetadata.meta_description,
        keywords: keywordArray.join(', '),
        wordCount: analysis.word_count,
        articleBody: enhancedContent.replace(/<[^>]+>/g, '').substring(0, 500),
      };
    }

    const result = {
      enhanced_fields: enhancedFields,
      enhanced_content: enhancedContent,
      seo_score: analysis.seo_score,
      readability_score: analysis.readability_score,
      quality_score: analysis.quality_score,
      recommendations: analysis.recommendations,
      missing_keywords: analysis.missing_keywords,
    };

    logger.info('Phase 3: Content enhancement completed', {
      seoScore: result.seo_score,
      readabilityScore: result.readability_score,
      hasEnhancedContent: enhancedContent !== content,
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

