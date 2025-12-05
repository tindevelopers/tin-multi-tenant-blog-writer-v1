import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import { analyzeContent } from '@/lib/content-analysis-service';
import { enhanceContentToRichHTML } from '@/lib/content-enhancer';
import { LLMAnalysisService } from '@/lib/llm-analysis-service';
import { handlePhase3Completion } from '@/lib/workflow-phase-manager';
import { 
  getWebflowIntegration, 
  insertHyperlinksWithPolish 
} from '@/lib/integrations/webflow-hyperlink-service';
import { discoverWebflowStructure } from '@/lib/integrations/webflow-structure-discovery';
import { createServiceClient } from '@/lib/supabase/service';
import { analyzeInterlinkingEnhanced } from '@/lib/interlinking/enhanced-interlinking-service';

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
 * Insert internal hyperlinks into content based on Webflow site analysis
 * 
 * Uses the enhanced InterlinkingEngine for sophisticated analysis:
 * - Phase 1: Better relevance scoring using keyword/topic overlap, authority scoring
 * - Phase 2 (optional): Lazy-loads full content for top candidates
 * 
 * Falls back to on-the-fly discovery if no scan exists
 */
async function insertInternalLinks(
  content: string,
  title: string,
  keywords: string[],
  orgId?: string,
  enablePhase2?: boolean // Enable Phase 2 lazy-loading for deeper analysis
): Promise<string> {
  try {
    // Get Webflow integration if orgId provided
    if (!orgId) {
      logger.debug('No orgId provided, skipping hyperlink insertion');
      return content;
    }
    
    const webflowConfig = await getWebflowIntegration(orgId);
    
    if (!webflowConfig) {
      logger.debug('No Webflow integration found, skipping hyperlink insertion', { orgId });
      return content;
    }
    
    logger.info('Starting enhanced interlinking analysis', {
      siteId: webflowConfig.siteId,
      orgId,
      enablePhase2: enablePhase2 || false,
    });
    
    // Try to get existing content from stored scan first
    let existing_content: any[] = [];
    const supabase = createServiceClient();
    
    try {
      // Get latest completed scan for this site
      const { data: latestScan, error: scanError } = await supabase
        .from('webflow_structure_scans')
        .select('existing_content, scan_completed_at, total_content_items, published_domain')
        .eq('org_id', orgId)
        .eq('site_id', webflowConfig.siteId)
        .eq('status', 'completed')
        .order('scan_completed_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!scanError && latestScan?.existing_content) {
        existing_content = latestScan.existing_content as any[];
        
        // Fix URLs: rebuild from existing URLs using published_domain to ensure they use the correct domain
        const publishedDomain = latestScan.published_domain as string | undefined;
        if (publishedDomain) {
          const cleanPublishedDomain = publishedDomain.replace(/\/$/, '');
          const stagingDomainPattern = /https?:\/\/[^\/]+\.webflow\.io/;
          let urlsFixed = 0;
          
          existing_content = existing_content.map((item: any) => {
            const originalUrl = item.url || '';
            
            // Check if URL contains a staging domain (webflow.io) or needs domain replacement
            const hasStagingDomain = stagingDomainPattern.test(originalUrl);
            
            if (hasStagingDomain || !originalUrl.startsWith('http')) {
              urlsFixed++;
              
              // Extract the path from the original URL (everything after the domain)
              // This preserves collection slugs and full path structure
              const urlPath = originalUrl.replace(/https?:\/\/[^\/]+/, '');
              const pathToUse = urlPath || `/${item.slug || ''}`;
              
              // Rebuild URL with published domain, preserving the full path
              const rebuiltUrl = `${cleanPublishedDomain}${pathToUse.startsWith('/') ? pathToUse : '/' + pathToUse}`;
              
              return {
                ...item,
                url: rebuiltUrl,
              };
            }
            
            // URL already uses correct domain, keep it as-is
            return item;
          });
          
          logger.info('Rebuilt URLs using published domain from stored scan', {
            siteId: webflowConfig.siteId,
            publishedDomain: cleanPublishedDomain,
            contentItems: existing_content.length,
            urlsFixed,
          });
        }
        
        logger.info('Using stored Webflow structure scan', {
          siteId: webflowConfig.siteId,
          contentItems: existing_content.length,
          scanDate: latestScan.scan_completed_at,
          publishedDomain: publishedDomain || 'not available',
        });
      } else {
        // No stored scan found, discover on-the-fly
        logger.info('No stored scan found, discovering Webflow structure on-the-fly', {
          siteId: webflowConfig.siteId,
        });
        
        const structure = await discoverWebflowStructure(
          webflowConfig.apiToken,
          webflowConfig.siteId
        );
        existing_content = structure.existing_content;
        
        // Optionally trigger a background scan for future use
        // (don't await - let it run in background)
        triggerBackgroundScan(orgId, webflowConfig.siteId, webflowConfig.apiToken)
          .catch(err => logger.warn('Background scan trigger failed', { error: err.message }));
      }
    } catch (error: any) {
      logger.warn('Error fetching stored scan, falling back to on-the-fly discovery', {
        error: error.message,
      });
      
      // Fallback to on-the-fly discovery
      const structure = await discoverWebflowStructure(
        webflowConfig.apiToken,
        webflowConfig.siteId
      );
      existing_content = structure.existing_content;
    }
    
    if (existing_content.length === 0) {
      logger.debug('No Webflow content found for hyperlinking', { siteId: webflowConfig.siteId });
      return content;
    }
    
    // Use the enhanced InterlinkingEngine for sophisticated analysis
    // Phase 1: Better relevance scoring using stored data
    // Phase 2 (optional): Lazy-load full content for top candidates
    const suggestions = await analyzeInterlinkingEnhanced(
      content,
      title,
      keywords,
      existing_content,
      {
        maxLinks: 5,
        minRelevanceScore: 0.3,
        enableLazyLoading: enablePhase2 || false,
        lazyLoadTopN: 10,
        webflowApiToken: enablePhase2 ? webflowConfig.apiToken : undefined,
        webflowSiteId: enablePhase2 ? webflowConfig.siteId : undefined,
      }
    );
    
    if (suggestions.length === 0) {
      logger.debug('No relevant hyperlink opportunities found (enhanced analysis)');
      return content;
    }
    
    // Insert hyperlinks using polish function (with OpenAI fallback)
    const contentWithLinks = await insertHyperlinksWithPolish(
      content,
      title,
      keywords,
      suggestions
    );
    
    logger.info('✅ Enhanced hyperlinks inserted successfully', {
      suggestionsCount: suggestions.length,
      cmsLinks: suggestions.filter(s => s.type === 'cms').length,
      staticLinks: suggestions.filter(s => s.type === 'static').length,
      phase2Enabled: enablePhase2 || false,
    });
    
    return contentWithLinks;
  } catch (error: any) {
    logger.warn('Hyperlink insertion failed, continuing without links', {
      error: error.message,
      orgId,
    });
    return content; // Return original content on error
  }
}

/**
 * Trigger a background Webflow structure scan (non-blocking)
 */
async function triggerBackgroundScan(
  orgId: string,
  siteId: string,
  apiToken: string
): Promise<void> {
  try {
    // Call the scan endpoint internally (don't await)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/webflow/scan-structure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ site_id: siteId }),
    }).catch(err => {
      logger.debug('Background scan trigger failed (non-critical)', { error: err.message });
    });
  } catch (error) {
    // Silently fail - this is a background operation
    logger.debug('Background scan trigger error (non-critical)', { error });
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
    const h1Count = (enhanced.match(/<h1[^>]*>/gi) || []).length;
    const h2Count = (enhanced.match(/<h2[^>]*>/gi) || []).length;
    const h3Count = (enhanced.match(/<h3[^>]*>/gi) || []).length;
    
    logger.info('Content heading structure analysis', {
      h1Count,
      h2Count,
      h3Count,
      hasProperStructure: h1Count >= 1 && h2Count >= 3,
      recommendation: h2Count < 3 ? 'Consider adding more H2 sections for better SEO' : 'Good heading structure',
    });
    
    // If still missing proper heading structure after enhancement, add title as H1
    if (h1Count === 0 && title) {
      logger.debug('Adding title as H1 heading');
      enhanced = `<h1 class="blog-heading blog-heading-1">${title}</h1>\n${enhanced}`;
    }
    
    // Log warning if heading structure is weak for SEO
    if (h2Count < 2) {
      logger.warn('Content has weak heading structure for SEO', {
        h1Count,
        h2Count,
        h3Count,
        suggestion: 'Blog posts should have at least 1 H1 (title), 3-5 H2 (main sections), and relevant H3 (subsections)',
      });
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
      insert_hyperlinks = false, // Option to insert hyperlinks
      deep_interlinking = false, // Phase 2: Enable lazy-loading for deeper analysis
      org_id, // Organization ID for Webflow integration lookup
    } = body;
    
    // Get org_id from user if not provided
    let orgId = org_id;
    if (!orgId) {
      try {
        const supabase = createServiceClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userProfile } = await supabase
            .from('users')
            .select('org_id')
            .eq('user_id', user.id)
            .single();
          if (userProfile?.org_id) {
            orgId = userProfile.org_id;
          }
        }
      } catch (error: any) {
        logger.debug('Could not fetch org_id from user', { error: error.message });
      }
    }

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
    // Uses enhanced InterlinkingEngine for better relevance scoring
    // Phase 2 (deep_interlinking) optionally fetches full content for top candidates
    if (insert_hyperlinks) {
      try {
        enhancedContent = await insertInternalLinks(
          enhancedContent, 
          finalTitle, 
          keywords, 
          orgId,
          deep_interlinking // Enable Phase 2 lazy-loading if requested
        );
        logger.info('Enhanced hyperlinks inserted into content', {
          phase2Enabled: deep_interlinking,
        });
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
    const enhancedMetadata = await generateEnhancedMetadata(plainTextContent, finalTitle, keywords);

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
          keywords: keywords,
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
        keywords: keywords.join(', '),
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

