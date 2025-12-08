/**
 * Multi-Phase Workflow API
 * 
 * Endpoints for managing the 5-phase blog creation workflow:
 * 1. Content Generation (via async Cloud Tasks queue)
 * 2. Image Generation
 * 3. Content Enhancement
 * 4. Advanced Interlinking
 * 5. Publishing Preparation
 * 
 * IMPORTANT: Multi-phase workflows ALWAYS run in async mode via Cloud Tasks queue,
 * similar to quick generation. This ensures scalability and prevents timeouts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import { buildEnhancedBlogRequestPayload, getDefaultCustomInstructions, MAX_CUSTOM_INSTRUCTIONS_LENGTH } from '@/lib/blog-generation-utils';
import { logger } from '@/utils/logger';
import { 
  getSiteContext, 
  buildSiteAwareInstructions, 
  formatLinkOpportunitiesForAPI,
  type SiteContext 
} from '@/lib/site-context-service';

const API_KEY = process.env.BLOG_WRITER_API_KEY || null;

/**
 * POST /api/workflow/multi-phase
 * Start a new multi-phase workflow (ALWAYS async via Cloud Tasks)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let queueId: string | null = null;
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const orgId = userProfile.org_id;
    const userId = user.id;

    const body = await request.json();
    const {
      topic,
      keywords = [],
      targetAudience,
      tone,
      wordCount = 1500,
      qualityLevel = 'high',
      generateFeaturedImage = true,
      generateContentImages = false,
      imageStyle = 'photographic',
      optimizeForSeo = true,
      generateStructuredData = true,
      crawlWebsite = true,
      maxInternalLinks = 5,
      maxExternalLinks = 3,
      includeClusterLinks = true,
      targetPlatform = 'webflow',
      collectionId,
      isDraft = true,
      customInstructions,
      // Support for Phase 2-only queue creation (minimal data)
      phase2Only = false,
    } = body;

    // Validate required fields
    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    // Get Webflow integration if crawling is enabled
    let webflowApiKey: string | undefined;
    let webflowSiteId: string | undefined;

    if (crawlWebsite) {
      try {
        const { data: integration, error: integrationError } = await supabase
          .from('integrations')
          .select('config, metadata')
          .eq('org_id', orgId)
          .eq('type', 'webflow')
          .eq('status', 'active')
          .maybeSingle(); // Use maybeSingle() instead of single() to avoid error if not found

        if (integrationError) {
          logger.warn('Error fetching Webflow integration', { error: integrationError.message });
        } else if (integration) {
          const config = integration.config as any;
          const metadata = integration.metadata as any;
          
          // Extract API key from config (could be api_key, apiToken, token, etc.)
          webflowApiKey = config?.api_key || config?.apiToken || config?.token;
          
          // Extract site_id from config or metadata
          webflowSiteId = config?.site_id || config?.siteId || metadata?.site_id;
          
          if (webflowApiKey && webflowSiteId) {
            logger.debug('Webflow integration found', { hasApiKey: !!webflowApiKey, hasSiteId: !!webflowSiteId });
          } else {
            logger.debug('Webflow integration found but missing credentials', { hasApiKey: !!webflowApiKey, hasSiteId: !!webflowSiteId });
          }
        } else {
          logger.debug('No Webflow integration found for organization', { orgId });
        }
      } catch (error: any) {
        logger.warn('Error fetching Webflow integration (non-critical)', { error: error.message });
        // Continue without Webflow integration - not critical for queue creation
      }
    }

    // Convert keywords to array format
    const keywordsArray = Array.isArray(keywords) ? keywords : (keywords ? [keywords] : []);

    // Step 1: Create queue entry in blog_generation_queue (same as quick generation)
    logger.info('📋 Creating queue entry for multi-phase workflow', { topic, orgId, userId, phase2Only });
    
    try {
      // Build metadata object - handle Phase 2-only case with minimal data
      const metadata: Record<string, unknown> = {
        workflow_type: phase2Only ? 'phase_2_only' : 'multi_phase',
        async_mode: true,
      };

      // Only include full metadata if not Phase 2-only
      if (!phase2Only) {
        metadata.generate_featured_image = generateFeaturedImage;
        metadata.generate_content_images = generateContentImages;
        metadata.image_style = imageStyle;
        metadata.optimize_for_seo = optimizeForSeo;
        metadata.generate_structured_data = generateStructuredData;
        metadata.crawl_website = crawlWebsite && !!webflowApiKey;
        metadata.max_internal_links = maxInternalLinks;
        metadata.max_external_links = maxExternalLinks;
        metadata.include_cluster_links = includeClusterLinks;
        metadata.target_platform = targetPlatform;
        if (collectionId) metadata.collection_id = collectionId;
        metadata.is_draft = isDraft;
        if (webflowSiteId) metadata.webflow_site_id = webflowSiteId;
      } else {
        // Phase 2-only: minimal metadata
        metadata.generate_featured_image = generateFeaturedImage;
        metadata.generate_content_images = generateContentImages;
        metadata.image_style = imageStyle || 'photographic';
        metadata.is_draft = true;
      }

      const { data: queueItem, error: queueError } = await supabase
        .from('blog_generation_queue')
        .insert({
          org_id: orgId,
          created_by: userId,
          topic: topic || 'Untitled Blog Post',
          keywords: keywordsArray,
          target_audience: targetAudience || 'general',
          tone: tone || 'professional',
          word_count: wordCount || 1500,
          quality_level: qualityLevel || 'high',
          custom_instructions: customInstructions || null,
          template_type: phase2Only ? 'phase_2_images' : 'multi_phase_workflow',
          status: phase2Only ? 'generating' : 'queued', // Phase 2-only starts immediately
          priority: 5, // Normal priority
          metadata: metadata,
          queued_at: new Date().toISOString(),
        })
        .select('queue_id')
        .single();

      if (queueError || !queueItem) {
        logger.error('Failed to create queue entry', { 
          error: queueError,
          errorCode: queueError?.code,
          errorDetails: queueError?.details,
          errorHint: queueError?.hint,
          orgId,
          userId,
        });
        throw new Error(`Failed to create queue entry: ${queueError?.message || 'Unknown error'}`);
      }

      queueId = queueItem.queue_id;
      logger.info('✅ Queue entry created', { queueId, phase2Only });
    } catch (error: any) {
      logger.error('Queue creation failed', { 
        error: error.message,
        stack: error.stack,
        orgId,
        userId,
      });
      throw new Error(`Failed to create workflow queue entry: ${error.message}`);
    }

    // If Phase 2-only, return immediately with queue_id (no need to call Blog Writer API)
    if (phase2Only) {
      logger.info('✅ Phase 2-only queue entry created', { queueId });
      return NextResponse.json({
        success: true,
        queue_id: queueId,
        status: 'generating',
        message: 'Queue entry created for Phase 2 image generation',
        workflow_type: 'phase_2_only',
      });
    }

    // Step 2: Fetch site context for intelligent generation
    let siteContext: SiteContext | null = null;
    try {
      siteContext = await getSiteContext({
        orgId,
        topic,
        keywords: keywordsArray,
        maxLinkOpportunities: 10,
      });
      
      if (siteContext) {
        logger.info('📚 Site context loaded for multi-phase generation', {
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

    // Step 3: Call Blog Writer API with async_mode=true (ALWAYS async for multi-phase)
    logger.info('🚀 Starting Phase 1 (Content Generation) in async mode', {
      queueId,
      topic,
      hasSiteContext: !!siteContext,
      endpoint: `${BLOG_WRITER_API_URL}/api/v1/blog/generate-enhanced?async_mode=true`,
    });

    const apiUrl = `${BLOG_WRITER_API_URL}/api/v1/blog/generate-enhanced?async_mode=true`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    // Build custom instructions with site context if available
    let finalCustomInstructions = customInstructions || getDefaultCustomInstructions();
    if (siteContext) {
      finalCustomInstructions = buildSiteAwareInstructions(
        finalCustomInstructions,
        siteContext,
        topic,
        MAX_CUSTOM_INSTRUCTIONS_LENGTH // Enforce API character limit
      );
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
      keywords: keywordsArray,
      targetAudience,
      tone: tone || 'professional',
      wordCount,
      qualityLevel,
      customInstructions: finalCustomInstructions,
      featureOverrides: {
        use_consensus_generation: true,
      },
      extraFields,
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('❌ Phase 1 API error', {
        status: response.status,
        error: errorText,
        queueId,
      });

      // Update queue entry with error
      if (queueId) {
        await supabase
          .from('blog_generation_queue')
          .update({
            status: 'failed',
            generation_error: `Phase 1 API error ${response.status}: ${errorText.substring(0, 500)}`,
            generation_completed_at: new Date().toISOString(),
          })
          .eq('queue_id', queueId);
      }

      throw new Error(`Content generation failed: ${errorText}`);
    }

    const result = await response.json();

    // Step 3: Handle async response (should always return job_id)
    if (result.job_id) {
      logger.info('✅ Async job created successfully', {
        job_id: result.job_id,
        queueId,
      });

      // Update queue entry with job_id and site context metadata
      if (queueId) {
        // Get current metadata first
        const { data: currentQueue } = await supabase
          .from('blog_generation_queue')
          .select('metadata')
          .eq('queue_id', queueId)
          .single();

        await supabase
          .from('blog_generation_queue')
          .update({
            status: 'queued',
            metadata: {
              ...(currentQueue?.metadata || {}),
              backend_job_id: result.job_id,
              estimated_completion_time: result.estimated_completion_time || null,
              async_mode: true,
              workflow_type: 'multi_phase',
              // Site context metadata
              site_context_used: !!siteContext,
              site_context_link_opportunities: siteContext?.linkOpportunities.length || 0,
              site_context_existing_content: siteContext?.totalContentItems || 0,
            },
            generation_started_at: new Date().toISOString(),
          })
          .eq('queue_id', queueId);
      }

      // Return immediately with queue_id and job_id (async mode)
      return NextResponse.json({
        success: true,
        queue_id: queueId,
        job_id: result.job_id,
        status: 'queued',
        message: 'Multi-phase workflow queued successfully. Processing will continue asynchronously.',
        estimated_completion_time: result.estimated_completion_time,
        workflow_type: 'multi_phase',
      });
    } else {
      // If async mode failed but API returned success, log warning
      logger.warn('⚠️ Async mode requested but no job_id returned', {
        resultKeys: Object.keys(result),
        queueId,
      });

      // Update queue to indicate async mode failed
      if (queueId) {
        // Get current metadata first
        const { data: currentQueue } = await supabase
          .from('blog_generation_queue')
          .select('metadata')
          .eq('queue_id', queueId)
          .single();

        await supabase
          .from('blog_generation_queue')
          .update({
            status: 'generating',
            metadata: {
              ...(currentQueue?.metadata || {}),
              async_mode_requested: true,
              async_mode_failed: true,
              fallback_to_sync: true,
              error: result.error || result.error_message || 'Async mode not available',
            },
          })
          .eq('queue_id', queueId);
      }

      // Still return queue_id so frontend can track it
      return NextResponse.json({
        success: true,
        queue_id: queueId,
        status: 'generating',
        message: 'Workflow started but async mode unavailable. Processing synchronously.',
        warning: 'Async mode not available, falling back to synchronous processing',
      });
    }
  } catch (error: any) {
    logger.error('Failed to start multi-phase workflow', {
      error: error.message,
      queueId,
    });

    // Update queue entry with error if it exists
    if (queueId) {
      try {
        const supabase = await createClient();
        await supabase
          .from('blog_generation_queue')
          .update({
            status: 'failed',
            generation_error: error.message,
            generation_completed_at: new Date().toISOString(),
          })
          .eq('queue_id', queueId);
      } catch (updateError) {
        logger.warn('Failed to update queue entry with error', { updateError });
      }
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to start multi-phase workflow',
        queue_id: queueId, // Include queue_id even on error for tracking
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflow/multi-phase?id=xxx or ?queue_id=xxx
 * Get workflow status from queue
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queueId = searchParams.get('queue_id') || searchParams.get('id');

    if (!queueId) {
      // Return list of multi-phase workflows for this user from queue
      const { data: userProfile } = await supabase
        .from('users')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!userProfile?.org_id) {
        return NextResponse.json({ error: 'No organization found' }, { status: 400 });
      }

      const { data: workflows, error } = await supabase
        .from('blog_generation_queue')
        .select('*')
        .eq('org_id', userProfile.org_id)
        .eq('metadata->>workflow_type', 'multi_phase')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        logger.error('Failed to fetch workflows', { error });
        return NextResponse.json(
          { error: 'Failed to fetch workflows' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        workflows: workflows || [],
        count: workflows?.length || 0,
      });
    }

    // Get specific workflow from queue
    const { data: queueItem, error } = await supabase
      .from('blog_generation_queue')
      .select('*')
      .eq('queue_id', queueId)
      .single();

    if (error || !queueItem) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this workflow
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (userProfile?.org_id !== queueItem.org_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      queue_id: queueItem.queue_id,
      status: queueItem.status,
      topic: queueItem.topic,
      metadata: queueItem.metadata,
      created_at: queueItem.created_at,
      generation_started_at: queueItem.generation_started_at,
      generation_completed_at: queueItem.generation_completed_at,
      generation_error: queueItem.generation_error,
    });
  } catch (error: any) {
    logger.error('Failed to get workflow status', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to get workflow status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflow/multi-phase?id=xxx or ?queue_id=xxx
 * Cancel a workflow by updating queue status
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queueId = searchParams.get('queue_id') || searchParams.get('id');

    if (!queueId) {
      return NextResponse.json(
        { error: 'Queue ID is required' },
        { status: 400 }
      );
    }

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Get workflow from queue
    const { data: queueItem, error: fetchError } = await supabase
      .from('blog_generation_queue')
      .select('*')
      .eq('queue_id', queueId)
      .single();

    if (fetchError || !queueItem) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this workflow
    if (queueItem.org_id !== userProfile.org_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Only allow cancellation if workflow is in a cancellable state
    const cancellableStates = ['queued', 'generating'];
    if (!cancellableStates.includes(queueItem.status)) {
      return NextResponse.json(
        { error: `Cannot cancel workflow in ${queueItem.status} state` },
        { status: 400 }
      );
    }

    // Update queue entry to cancelled status
    const { error: updateError } = await supabase
      .from('blog_generation_queue')
      .update({
        status: 'cancelled',
        generation_completed_at: new Date().toISOString(),
        generation_error: 'Workflow cancelled by user',
      })
      .eq('queue_id', queueId);

    if (updateError) {
      logger.error('Failed to cancel workflow', { error: updateError });
      return NextResponse.json(
        { error: 'Failed to cancel workflow' },
        { status: 500 }
      );
    }

    logger.info('Workflow cancelled', { queueId });

    return NextResponse.json({
      success: true,
      queue_id: queueId,
      message: 'Workflow cancelled successfully',
    });
  } catch (error: any) {
    logger.error('Failed to cancel workflow', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to cancel workflow' },
      { status: 500 }
    );
  }
}

