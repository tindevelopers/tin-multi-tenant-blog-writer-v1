import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import { buildEnhancedBlogRequestPayload, getDefaultCustomInstructions } from '@/lib/blog-generation-utils';
import cloudRunHealth from '@/lib/cloud-run-health';
import { 
  getSiteContext, 
  buildSiteAwareInstructions, 
  formatLinkOpportunitiesForAPI,
  type SiteContext 
} from '@/lib/site-context-service';

/**
 * POST /api/workflow/generate-content
 * 
 * Phase 1: Generate blog content using enhanced generation endpoint
 * 
 * This endpoint:
 * 1. Tests the Cloud Run service health first
 * 2. Wakes up the service if it's not healthy
 * 3. Retests periodically until confirmed awake
 * 4. Only proceeds after confirming the service is ready
 * 5. Validates that content is actually returned
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
      template_type,
      org_id, // Organization ID for site context lookup
      use_site_context = true, // Enable site-aware generation by default
    } = body;

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    logger.info('Phase 1: Starting content generation', { 
      topic, 
      orgId: org_id,
      useSiteContext: use_site_context 
    });

    // Step 0: Fetch site context for intelligent generation
    let siteContext: SiteContext | null = null;
    if (use_site_context && org_id) {
      try {
        siteContext = await getSiteContext({
          orgId: org_id,
          topic,
          keywords: keywords || [],
          maxLinkOpportunities: 10,
        });
        
        if (siteContext) {
          logger.info('Site context loaded for generation', {
            existingTitles: siteContext.existingTitles.length,
            linkOpportunities: siteContext.linkOpportunities.length,
            siteId: siteContext.siteId,
          });
        }
      } catch (contextError: any) {
        logger.warn('Failed to fetch site context, continuing without', {
          error: contextError.message,
        });
      }
    }

    // Step 1: Test the endpoint to confirm it's working
    logger.info('🔍 Testing Cloud Run service health...');
    let healthStatus = await cloudRunHealth.checkHealth();
    
    // Step 2: If not healthy, wake it up
    if (!healthStatus.isHealthy) {
      logger.info('⚠️ Cloud Run service is not healthy. Attempting to wake it up...');
      healthStatus = await cloudRunHealth.wakeUpAndWait();
      
      // Retest periodically until confirmed awake
      let retryCount = 0;
      const maxRetries = 5;
      const retryDelay = 2000; // 2 seconds between retries
      
      while (!healthStatus.isHealthy && retryCount < maxRetries) {
        retryCount++;
        logger.info(`🔄 Retesting health (attempt ${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        healthStatus = await cloudRunHealth.checkHealth();
        
        if (healthStatus.isHealthy) {
          logger.info('✅ Cloud Run service is now healthy');
          break;
        }
      }
      
      // If still not healthy after retries, fail early
      if (!healthStatus.isHealthy) {
        logger.error('❌ Cloud Run service failed to wake up', {
          error: healthStatus.error,
          attempts: healthStatus.attempts,
        });
        throw new Error(
          `Cloud Run service is not available: ${healthStatus.error || 'Service failed to start'}. ` +
          `Please try again in a few moments.`
        );
      }
    } else {
      logger.info('✅ Cloud Run service is healthy and ready');
    }

    // Step 3: Proceed only after confirming service is awake
    logger.info('🚀 Proceeding with content generation...');

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

    // Build custom instructions with site context if available
    let finalCustomInstructions = custom_instructions || getDefaultCustomInstructions(template_type);
    
    if (siteContext) {
      finalCustomInstructions = buildSiteAwareInstructions(
        finalCustomInstructions,
        siteContext,
        topic
      );
      logger.debug('Built site-aware custom instructions', {
        originalLength: (custom_instructions || '').length,
        enhancedLength: finalCustomInstructions.length,
      });
    }

    // Prepare extra fields with link opportunities if available
    const extraFields: Record<string, unknown> = {
      fallback_to_openai: true,
    };
    
    if (siteContext?.linkOpportunities.length) {
      // Pass link opportunities to the API for embedded linking
      extraFields.internal_link_targets = formatLinkOpportunitiesForAPI(
        siteContext.linkOpportunities
      );
      extraFields.existing_site_topics = siteContext.existingTopics.slice(0, 15);
      extraFields.site_has_content = true;
      extraFields.total_site_content = siteContext.totalContentItems;
    }

    const requestPayload = buildEnhancedBlogRequestPayload({
      topic,
      keywords,
      targetAudience: target_audience,
      tone: tone || 'professional',
      wordCount: word_count || 1500,
      qualityLevel: quality_level || 'high',
      customInstructions: finalCustomInstructions,
      templateType: template_type,
      featureOverrides: {
        use_consensus_generation: true,
      },
      extraFields,
    });

    const response = await fetch(`${apiUrl}/api/v1/blog/generate-enhanced`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestPayload),
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

    // Extract relevant fields with better fallback handling
    const title = data.title || data.generated_title || data.blog_post?.title || topic;
    const content = data.content || data.generated_content || data.blog_post?.content || '';
    const excerpt = data.excerpt || data.summary || data.blog_post?.excerpt || data.blog_post?.meta_description || '';
    
    // Step 4: Validate that content was actually produced
    if (!content || content.trim().length === 0) {
      logger.error('Phase 1 validation failed: No content produced', {
        responseKeys: Object.keys(data),
        hasTitle: !!title,
        hasContent: !!content,
        responsePreview: JSON.stringify(data).substring(0, 500),
      });
      throw new Error(
        'Content generation completed but no content was produced. ' +
        'The API returned a successful response but the content field is empty. ' +
        'Please check the API logs or try again with different parameters.'
      );
    }

    const result = {
      title,
      content,
      excerpt,
      word_count: data.word_count || data.blog_post?.word_count || 0,
      seo_data: {
        meta_title: data.meta_title || data.seo_title || data.blog_post?.meta_title || title,
        meta_description: data.meta_description || data.blog_post?.meta_description || excerpt,
        keywords: data.keywords || keywords || [],
        slug: data.slug || topic.toLowerCase().replace(/\s+/g, '-'),
      },
      quality_score: data.quality_score || data.blog_post?.quality_score,
      generation_time: data.generation_time || data.generation_time_seconds,
      // Include site context metadata if used
      site_context_used: !!siteContext,
      site_context_metadata: siteContext ? {
        totalContentItems: siteContext.totalContentItems,
        linkOpportunitiesProvided: siteContext.linkOpportunities.length,
        siteId: siteContext.siteId,
        lastScanDate: siteContext.lastScanDate,
      } : null,
    };

    logger.info('Phase 1: Content generation completed successfully', {
      title: result.title,
      wordCount: result.word_count,
      contentLength: result.content.length,
      hasExcerpt: !!result.excerpt,
      siteContextUsed: result.site_context_used,
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

