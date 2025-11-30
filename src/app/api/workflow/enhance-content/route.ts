import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import { analyzeContent } from '@/lib/content-analysis-service';
import { enhanceContentToRichHTML } from '@/lib/content-enhancer';
import { LLMAnalysisService } from '@/lib/llm-analysis-service';
import { handlePhase3Completion } from '@/lib/workflow-phase-manager';

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
 * Insert internal hyperlinks into content based on website analysis
 * This is a placeholder - should integrate with website analysis service
 */
async function insertInternalLinks(
  content: string,
  title: string,
  keywords: string[]
): Promise<string> {
  // TODO: Integrate with website analysis service to get relevant internal links
  // For now, this is a placeholder that can be enhanced
  
  // Extract potential anchor text from content
  const anchorTexts: string[] = [];
  const headingRegex = /<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi;
  let match;
  
  while ((match = headingRegex.exec(content)) !== null) {
    const headingText = match[1].replace(/<[^>]+>/g, '').trim();
    if (headingText && headingText.length > 5 && headingText.length < 50) {
      anchorTexts.push(headingText);
    }
  }
  
  // Also extract keywords as potential anchor text
  keywords.forEach(keyword => {
    if (keyword.length > 3 && keyword.length < 30) {
      anchorTexts.push(keyword);
    }
  });
  
  // For now, return content as-is (no actual links inserted)
  // This should be replaced with actual website analysis integration
  logger.info('Hyperlink insertion requested', {
    anchorTextsFound: anchorTexts.length,
    keywordsCount: keywords.length,
  });
  
  // TODO: Call website analysis API to get relevant internal links
  // TODO: Insert links into content at appropriate positions
  // TODO: Ensure links are natural and contextually relevant
  
  return content; // Placeholder - return unchanged for now
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
  let body: any = {};
  try {
    body = await request.json();
    const {
      content,
      title,
      topic,
      keywords = [],
      generate_structured_data,
      improve_formatting = true,
      insert_hyperlinks = false, // NEW: Option to insert hyperlinks
    } = body;

    // Validate required fields with better error messages
    if (!content || (typeof content === 'string' && content.trim().length === 0)) {
      logger.error('Phase 3: Missing or empty content', {
        hasContent: !!content,
        contentType: typeof content,
        contentLength: typeof content === 'string' ? content.length : 0,
        title,
        topic,
      });
      return NextResponse.json(
        { 
          error: 'Content is required and cannot be empty',
          details: 'Phase 1 (Content Generation) must complete successfully before Phase 3 can run'
        },
        { status: 400 }
      );
    }

    if (!title || (typeof title === 'string' && title.trim().length === 0)) {
      logger.warn('Phase 3: Missing title, using topic as fallback', { topic });
    }

    const finalTitle = title || topic || 'Untitled';
    logger.info('Phase 3: Starting content enhancement', { 
      title: finalTitle,
      contentLength: typeof content === 'string' ? content.length : 0,
      hasTitle: !!title,
      hasTopic: !!topic,
    });

    // Step 1: Improve content structure and formatting
    let enhancedContent = content;
    if (improve_formatting) {
      enhancedContent = await improveContentStructure(content, finalTitle);
    }

    // Step 1.5: Insert hyperlinks if requested (before other enhancements)
    if (insert_hyperlinks) {
      try {
        enhancedContent = await insertInternalLinks(enhancedContent, finalTitle, keywordArray);
        logger.info('Hyperlinks inserted into content');
      } catch (linkError: any) {
        logger.warn('Hyperlink insertion failed, continuing without links', {
          error: linkError.message,
        });
        // Continue without hyperlinks
      }
    }

    // Step 2: Perform local content analysis
    const analysis = analyzeContent({
      content: enhancedContent,
      title: finalTitle,
      keywords,
      target_keyword: keywords?.[0],
    });

    // Step 3: Generate enhanced metadata with OpenAI
    // Extract clean text from HTML for metadata generation
    const plainTextContent = enhancedContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const enhancedMetadata = await generateEnhancedMetadata(plainTextContent, finalTitle, keywordArray);

    // Step 4: Try backend enhancement for additional fields
    let backendFields: Record<string, any> = {};
    try {
      const apiUrl = BLOG_WRITER_API_URL;
      const API_KEY = process.env.BLOG_WRITER_API_KEY || null;
      
      // Build headers - only include Authorization if API key is provided
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (API_KEY) {
        headers['Authorization'] = `Bearer ${API_KEY}`;
      }
      
      const enhancementResponse = await fetch(`${apiUrl}/api/v1/content/enhance-fields`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: enhancedContent,
          title: finalTitle,
          topic: topic || finalTitle,
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
      finalTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(0, 60);

    // Step 6: Compile enhanced fields
    const enhancedFields: Record<string, any> = {
      content: enhancedContent,
      meta_title: enhancedMetadata.seo_title,
      meta_description: enhancedMetadata.meta_description,
      excerpt: enhancedMetadata.excerpt,
      slug,
      featured_image_alt: backendFields.featured_image_alt || `${finalTitle} - Featured Image`,
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

    const result: {
      enhanced_fields: Record<string, any>;
      enhanced_content: string;
      seo_score: number;
      readability_score: number;
      quality_score: number;
      recommendations: string[];
      missing_keywords: string[];
      post_id?: string;
    } = {
      enhanced_fields: enhancedFields,
      enhanced_content: enhancedContent,
      seo_score: analysis.seo_score,
      readability_score: analysis.readability_score,
      quality_score: analysis.quality_score,
      recommendations: analysis.recommendations,
      missing_keywords: analysis.missing_keywords,
    };

    // Auto-update draft with enhancements if queue_id provided
    const queueId = body.queue_id;
    if (queueId) {
      try {
        const phaseResult = await handlePhase3Completion(queueId, {
          seo_title: enhancedFields.meta_title,
          meta_description: enhancedFields.meta_description,
          excerpt: enhancedFields.excerpt,
          slug: enhancedFields.slug,
          structured_data: enhancedFields.structured_data,
          seo_score: result.seo_score,
          readability_score: result.readability_score,
        });

        if (phaseResult.success && phaseResult.post_id) {
          logger.info('✅ Phase 3: Draft updated with enhancements', {
            queue_id: queueId,
            post_id: phaseResult.post_id,
          });
          (result as any).post_id = phaseResult.post_id;
        } else {
          logger.warn('⚠️ Phase 3: Draft update failed (non-critical)', {
            queue_id: queueId,
            error: phaseResult.error,
          });
        }
      } catch (updateError: any) {
        logger.warn('⚠️ Phase 3: Draft update error (non-critical)', {
          queue_id: queueId,
          error: updateError.message,
        });
        // Don't fail the entire request if draft update fails
      }
    }

    logger.info('Phase 3: Content enhancement completed', {
      seoScore: result.seo_score,
      readabilityScore: result.readability_score,
      hasEnhancedContent: enhancedContent !== content,
      draftUpdated: !!result.post_id,
    });

    return NextResponse.json(result);

  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Content enhancement failed';
    const errorStack = error?.stack;
    
    logger.error('Phase 3 error', { 
      error: errorMessage,
      stack: errorStack,
      errorType: error?.constructor?.name,
      body: {
        hasContent: !!body?.content,
        contentLength: typeof body?.content === 'string' ? body.content.length : 0,
        hasTitle: !!body?.title,
        hasTopic: !!body?.topic,
      }
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

