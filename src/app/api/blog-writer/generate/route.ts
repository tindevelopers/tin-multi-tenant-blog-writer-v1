import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import cloudRunHealth from '@/lib/cloud-run-health';
import { type GeneratedImage } from '@/lib/image-generation';
import { enhanceContentToRichHTML, extractSections, cleanExcerpt } from '@/lib/content-enhancer';
import { getDefaultCustomInstructions, getQualityFeaturesForLevel, buildEnhancedBlogRequestPayload } from '@/lib/blog-generation-utils';
import type { ProgressUpdate, EnhancedBlogResponse } from '@/types/blog-generation';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import { LLMAnalysisService } from '@/lib/llm-analysis-service';
import { validateBlogFields, type BlogFieldData } from '@/lib/blog-field-validator';
// Workflow models for premium/enterprise quality levels
import { workflowRegistry, executeWorkflow } from '@/lib/workflow-models';
import { getSiteContext, formatSiteContextForPrompt } from '@/lib/site-context-service';

// Image generation is now handled separately via /api/blog-writer/images/generate endpoint

/**
 * Helper function to build the transformed blog generation response
 * This centralizes response building to avoid duplication between response paths
 */
// v1.3.4 unified endpoint response types
interface BlogGenerationResult {
  // Standard/Abstraction format: { success, blog_post: { title, content, meta_description }, ... }
  success?: boolean;
  blog_post?: {
    title?: string;
    content?: string;
    meta_description?: string;
    excerpt?: string;
    summary?: string;
  };
  // Enhanced format: { title, content, meta_description, ... }
  title?: string;
  content?: string;
  meta_title?: string; // For backward compatibility
  meta_description?: string;
  excerpt?: string;
  // Common fields across all formats
  seo_score?: number;
  word_count?: number;
  generation_time_seconds?: number;
  error_message?: string;
  // Enhanced-specific fields
  quality_scores?: {
    readability?: number;
    seo?: number;
    structure?: number;
    factual?: number;
    uniqueness?: number;
    engagement?: number;
  };
  citations?: Array<{
    text: string;
    source: string;
    url: string;
  }>;
  // Local Business-specific fields
  businesses?: Array<{
    name: string;
    google_place_id?: string;
    address?: string;
    phone?: string;
    website?: string;
    rating?: number;
    review_count?: number;
    categories?: string[];
  }>;
  total_reviews_aggregated?: number;
  metadata?: Record<string, unknown>;
  // Legacy fields (for backward compatibility)
  readability_score?: number;
  quality_score?: number | null;
  quality_dimensions?: Record<string, number>;
  stage_results?: Array<{
    stage: string;
    provider: string;
    tokens: number;
    cost: number;
  }>;
  total_tokens?: number;
  total_cost?: number;
  generation_time?: number;
  semantic_keywords?: string[];
  structured_data?: Record<string, unknown> | null;
  knowledge_graph?: Record<string, unknown> | null;
  seo_metadata?: Record<string, unknown>;
  content_metadata?: Record<string, unknown>;
  warnings?: string[];
  suggestions?: string[];
  quality_scores_legacy?: unknown;
  internal_links?: Array<{
    anchor_text: string;
    url: string;
  }>;
  generated_images?: Array<{
    type: string;
    image_url: string;
    alt_text: string;
  }>;
}

interface BrandVoice {
  id?: string;
  name?: string;
  tone?: string;
  style?: string;
  [key: string]: unknown;
}

interface ContentPreset {
  id?: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
}

function buildBlogResponse(
  result: BlogGenerationResult,
  enhancedContent: string,
  progressUpdates: ProgressUpdate[],
  featuredImage: GeneratedImage | null,
  sectionImages: Array<{ position: number; image: GeneratedImage }>,
  imagePlaceholders: {
    featured_image: {
      prompt: string;
      style: string;
      aspect_ratio: string;
      quality: string;
      type: string;
      keywords: string[];
    };
    section_images: Array<{
      position: number;
      prompt: string;
      style: string;
      aspect_ratio: string;
      quality: string;
      type: string;
    }>;
  },
  options: {
    topic: string;
    brandVoice: BrandVoice | null;
    contentPreset: ContentPreset | null;
    endpoint: string;
    shouldUseEnhanced: boolean;
    requiresProductResearch: boolean;
  }
): EnhancedBlogResponse {
  const { topic, brandVoice, contentPreset, endpoint, shouldUseEnhanced, requiresProductResearch } = options;
  
  // v1.3.4: Title extraction from unified endpoint response formats
  // Fallback chain: blog_post.title → title → topic
  // All fallbacks ensure a valid string is always returned
  const title = result.blog_post?.title || result.title || topic;
  // Use cleaned excerpt if available, otherwise fallback chain
  const excerpt = result.excerpt || result.blog_post?.excerpt || result.blog_post?.summary || result.meta_description || '';
  
  return {
    // Core content fields
    content: enhancedContent,
    title,
    excerpt,
    
    // Progress tracking
    progress_updates: progressUpdates,
    
    // SEO and quality metrics
    meta_title: result.meta_title || result.title || title,
    meta_description: result.meta_description || result.excerpt || excerpt,
    readability_score: result.readability_score || 0,
    seo_score: result.seo_score || 0,
    quality_score: result.quality_score ?? null,
    quality_dimensions: result.quality_dimensions || {},
    
    // Stage results and costs
    stage_results: result.stage_results || [],
    total_tokens: result.total_tokens || 0,
    total_cost: result.total_cost || 0,
    generation_time: result.generation_time || 0,
    
    // Citations and sources - map API format to frontend format
    citations: (result.citations || []).map((citation: { text: string; source?: string; url: string; title?: string }) => ({
      text: citation.text,
      url: citation.url,
      title: citation.title || citation.source || citation.text.substring(0, 50), // Use source as fallback for title
    })),
    
    // Enhanced features data
    semantic_keywords: result.semantic_keywords || [],
    structured_data: result.structured_data || null,
    knowledge_graph: result.knowledge_graph || null,
    seo_metadata: result.seo_metadata || {},
    content_metadata: result.content_metadata || {},
    
    // Warnings and status
    warnings: result.warnings || [],
    success: result.success !== false, // Default to true if not specified
    
    // Word count
    word_count: result.word_count || 0,
    
    // Suggestions
    suggestions: result.suggestions || [],
    
    // Quality scores (legacy)
    quality_scores: result.quality_scores || null,
    
    // v1.3.1: Internal links (3-5 automatically generated)
    internal_links: result.internal_links || [],
    
    // Image placeholders (images will be generated separately via frontend)
    generated_images: null, // Images not generated during blog creation
    image_placeholders: imagePlaceholders, // Placeholders for frontend-triggered generation
    
    // Featured image placeholder (will be generated separately)
    featured_image: null,
    
    // Metadata about the generation process
    metadata: {
      used_brand_voice: !!brandVoice,
      used_preset: !!contentPreset,
      endpoint_used: endpoint,
      enhanced: shouldUseEnhanced,
      image_generated: false, // Images generated separately
      section_images_generated: 0, // Images generated separately
      content_enhanced: true,
      content_format: 'rich_html',
      product_research_requested: requiresProductResearch,
      web_research_requested: requiresProductResearch,
      has_progress_updates: progressUpdates.length > 0,
      total_progress_stages: progressUpdates.length > 0 
        ? progressUpdates[progressUpdates.length - 1].total_stages 
        : null,
      image_placeholders_created: true, // Indicates placeholders are available
    },
    
    // Image generation status (images not generated yet)
    image_generation_status: {
      featured_image: 'pending', // Will be generated separately
      featured_image_url: null,
      section_images_count: imagePlaceholders.section_images.length,
      section_images: imagePlaceholders.section_images.map(img => ({
        position: img.position,
        url: null,
        status: 'pending' as const
      }))
    }
  };
}

export async function POST(request: NextRequest) {
  // Declare queueId outside try block so it's accessible in catch block
  let queueId: string | null = null;
  
  try {
    logger.debug('🚀 Blog generation API route called');
    
    // Check for async_mode query parameter
    const searchParams = request.nextUrl.searchParams;
    const asyncMode = searchParams.get('async_mode') === 'true';
    
    // Parse request body
    const body = await request.json();
    const { 
      topic, 
      keywords, 
      target_audience, 
      tone, 
      word_count,
      include_external_links,
      include_backlinks,
      backlink_count,
      quality_level,
      preset,
      preset_id,
      use_enhanced = false,
      content_goal, // Content goal from workflow (seo, engagement, conversions, brand_awareness)
      // Custom instructions and quality features (v1.3.0)
      custom_instructions,
      template_type,
      length,
      use_google_search,
      use_fact_checking,
      use_citations,
      use_serp_optimization,
      use_consensus_generation,
      use_knowledge_graph,
      use_semantic_keywords,
      use_quality_scoring,
      // Product research features
      include_product_research,
      include_brands,
      include_models,
      include_prices,
      include_features,
      include_reviews,
      include_pros_cons,
      include_product_table,
      include_comparison_section,
      include_buying_guide,
      include_faq_section,
      research_depth,
      // v1.3.4: Local business blog fields
      location,
      max_businesses,
      max_reviews_per_business,
      include_business_details,
      include_review_sentiment,
      use_google,
      use_dataforseo_content_generation = true, // ALWAYS use DataForSEO as primary (default: true)
      // v1.4: Generation mode and GSC multi-site support
      mode, // 'quick_generate' or 'multi_phase' (default: 'quick_generate')
      gsc_site_url, // Google Search Console site URL for multi-site support
    } = body;
    
    logger.debug('📝 Generation parameters:', {
      topic,
      keywords,
      target_audience,
      tone,
      word_count,
      include_external_links,
      include_backlinks,
      backlink_count,
      quality_level,
      preset,
      preset_id,
      use_enhanced,
      use_dataforseo_content_generation, // Passed to backend API for provider selection
      // v1.4: New parameters
      mode: mode || 'quick_generate', // Default to quick_generate
      gsc_site_url: gsc_site_url || null, // Multi-site GSC support
      research_depth: research_depth || 'standard',
    });
    
    // Validate required fields
    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }
    
    // Convert keywords to array format (needed for queue entry)
    const keywordsArray = Array.isArray(keywords) ? keywords : (keywords ? [keywords] : []);
    
    // Use enhanced endpoint (v1.3.6 - unified endpoint removed, enhanced is now primary)
    const shouldUseEnhanced = true; // Always use enhanced blog type
    const endpoint = '/api/v1/blog/generate-enhanced';
    
    // Initialize variables that will be used in queue entry
    let brandVoice: BrandVoice | null = null;
    let contentPreset: ContentPreset | null = null;
    
    // Get authenticated user and org
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let orgId: string;
    let userId: string;
    // queueId already declared at function scope
    
    if (user) {
      // Get user's org_id
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (userError || !userProfile) {
        // Fallback to system defaults
        const serviceSupabase = createServiceClient();
        userId = '00000000-0000-0000-0000-000000000002';
        orgId = '00000000-0000-0000-0000-000000000001';
        logger.debug('⚠️ User org not found, using system defaults');
      } else {
        userId = user.id;
        orgId = userProfile.org_id;
        logger.debug('✅ Using authenticated user', { userId, orgId });
      }
    } else {
      // Use service client with default system values
      const serviceSupabase = createServiceClient();
      userId = '00000000-0000-0000-0000-000000000002';
      orgId = '00000000-0000-0000-0000-000000000001';
      logger.debug('✅ Using service client with system user', { userId, orgId });
    }
    
    // Create queue entry before generation starts
    if (orgId && userId) {
      try {
        logger.debug('📋 Creating queue entry for blog generation...');
        const { data: queueItem, error: queueError } = await supabase
          .from('blog_generation_queue')
          .insert({
            org_id: orgId,
            created_by: userId,
            topic: topic,
            keywords: keywordsArray,
            target_audience: target_audience,
            tone: tone,
            word_count: word_count,
            quality_level: quality_level,
            custom_instructions: custom_instructions,
            template_type: template_type,
            priority: 5, // Default priority
            status: 'generating',
            progress_percentage: 0,
            generation_started_at: new Date().toISOString(),
            metadata: {
              quality_level,
              use_enhanced: shouldUseEnhanced,
              endpoint: endpoint,
              has_brand_voice: !!brandVoice,
              has_content_preset: !!contentPreset,
              content_goal: content_goal
            }
          })
          .select('queue_id')
          .single();
        
        if (queueError) {
          logger.warn('⚠️ Failed to create queue entry:', queueError);
          // Continue without queue entry (non-blocking)
        } else if (queueItem) {
          queueId = queueItem.queue_id;
          logger.debug('✅ Queue entry created:', queueId);
        }
      } catch (error) {
        logger.warn('⚠️ Error creating queue entry:', error);
        // Continue without queue entry (non-blocking)
      }
    }
    
    // Fetch brand voice settings for the organization
    if (orgId) {
      const serviceSupabase = createServiceClient();
      const { data: brandSettings } = await serviceSupabase
        .from('brand_settings')
        .select('*')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (brandSettings) {
        brandVoice = brandSettings;
        logger.debug('🎨 Found brand voice settings:', {
          tone: brandSettings.tone,
          hasGuidelines: !!brandSettings.style_guidelines,
          vocabularyCount: Array.isArray(brandSettings.vocabulary) ? brandSettings.vocabulary.length : 0
        });
      }
    }
    
    // Fetch content goal prompt if content_goal is provided
    let contentGoalPrompt: { system_prompt: string; user_prompt_template?: string; instructions?: Record<string, unknown> } | null = null;
    if (content_goal && orgId) {
      try {
        const serviceSupabase = createServiceClient();
        // Try to get org-specific prompt first, then system default
        const { data: orgPrompt } = await serviceSupabase
          .from('content_goal_prompts')
          .select('system_prompt, user_prompt_template, instructions')
          .eq('content_goal', content_goal)
          .eq('is_active', true)
          .eq('org_id', orgId)
          .eq('is_system_default', false)
          .order('priority', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (orgPrompt) {
          contentGoalPrompt = orgPrompt;
          logger.debug('📝 Found org-specific content goal prompt for:', content_goal);
        } else {
          // Get system default
          const { data: systemPrompt } = await serviceSupabase
            .from('content_goal_prompts')
            .select('system_prompt, user_prompt_template, instructions')
            .eq('content_goal', content_goal)
            .eq('is_system_default', true)
            .eq('is_active', true)
            .order('priority', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (systemPrompt) {
            contentGoalPrompt = systemPrompt;
            logger.debug('📝 Found system default content goal prompt for:', content_goal);
          }
        }
      } catch (error) {
        logger.warn('⚠️ Failed to fetch content goal prompt:', error);
        // Continue without prompt - not critical
      }
    }
    
    // Fetch content preset if preset_id is provided
    // contentPreset already declared above for queue entry
    if (preset_id && orgId) {
      const serviceSupabase = createServiceClient();
      const { data: preset } = await serviceSupabase
        .from('content_presets')
        .select('*')
        .eq('preset_id', preset_id)
        .eq('org_id', orgId)
        .eq('is_active', true)
        .single();
      
      if (preset) {
        contentPreset = preset;
        logger.debug('📋 Found content preset:', {
          name: preset.name,
          format: preset.content_format,
          wordCount: preset.word_count,
          qualityLevel: preset.quality_level
        });
      }
    } else if (!preset_id && orgId) {
      // Try to get default preset
      const serviceSupabase = createServiceClient();
      const { data: defaultPreset } = await serviceSupabase
        .from('content_presets')
        .select('*')
        .eq('org_id', orgId)
        .eq('is_default', true)
        .eq('is_active', true)
        .maybeSingle();
      
      if (defaultPreset) {
        contentPreset = defaultPreset;
        logger.debug('📋 Using default content preset:', defaultPreset.name);
      }
    }
    
    // First, ensure Cloud Run is awake and healthy
    logger.debug('🌅 Checking Cloud Run health...');
    const healthStatus = await cloudRunHealth.wakeUpAndWait();
    
    if (!healthStatus.isHealthy) {
      logger.error('❌ Cloud Run is not healthy:', healthStatus.error);
      
      // Provide a cleaner error message
      let errorMessage = 'Cloud Run service is not available';
      if (healthStatus.error) {
        // Clean up URL parsing errors
        if (healthStatus.error.includes('Failed to parse URL')) {
          errorMessage = healthStatus.isWakingUp 
            ? 'Cloud Run service is starting up. Please wait a moment and try again.'
            : 'Cloud Run service is not available. Please try again later.';
        } else {
          errorMessage = healthStatus.isWakingUp
            ? `Cloud Run is starting up: ${healthStatus.error}`
            : `Cloud Run is not healthy: ${healthStatus.error}`;
        }
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: healthStatus.isWakingUp ? 503 : 503 }
      );
    }
    
    logger.debug('✅ Cloud Run is healthy, proceeding with blog generation...');
    
    // Check if workflow model should be used (premium/enterprise quality levels)
    // This enables structured multi-phase generation for higher quality output
    const useWorkflowModel = (quality_level === 'premium' || quality_level === 'enterprise') && 
                              !asyncMode; // Workflow models don't support async mode yet
    
    if (useWorkflowModel) {
      try {
        logger.debug('🔄 Using workflow model for premium/enterprise generation');
        
        // Initialize workflow registry
        await workflowRegistry.initialize();
        
        // Detect content type for workflow selection
        const detectedContentType = 
          topicLower.includes('compare') || topicLower.includes('vs') || topicLower.includes('versus') 
            ? 'comparison' 
            : topicLower.includes('review') || topicLower.includes('best') || topicLower.includes('top')
              ? 'product'
              : undefined;
        
        // Select appropriate workflow model
        const workflowModel = workflowRegistry.selectModel({
          qualityLevel: quality_level,
          contentType: detectedContentType || template_type,
        });
        
        logger.debug('📋 Selected workflow model:', {
          modelId: workflowModel.id,
          modelName: workflowModel.name,
          phases: workflowModel.phases.length,
          contentType: detectedContentType,
        });
        
        // Get site context for interlinking
        let siteContext = '';
        if (orgId) {
          const context = await getSiteContext({
            orgId,
            topic,
            keywords: keywordsArray,
            maxLinkOpportunities: 10,
          });
          if (context) {
            siteContext = formatSiteContextForPrompt(context, {
              maxLinks: 8,
              includeTopics: true,
            });
          }
        }
        
        // Update queue with workflow info
        if (queueId) {
          await supabase
            .from('blog_generation_queue')
            .update({
              status: 'generating',
              metadata: {
                workflow_model: workflowModel.id,
                workflow_phases: workflowModel.phases.map(p => p.id),
              }
            })
            .eq('queue_id', queueId);
        }
        
        // Execute workflow with progress tracking
        const workflowResult = await executeWorkflow(
          workflowModel,
          {
            topic,
            keywords: keywordsArray,
            primaryKeyword: keywordsArray[0] || topic,
            secondaryKeywords: keywordsArray.slice(1),
            targetAudience: target_audience || 'general audience',
            tone: tone || 'professional',
            wordCount: word_count || 1500,
            articleGoal: content_goal || 'inform and engage',
            siteContext,
            customInstructions: custom_instructions,
            qualityLevel: quality_level,
            contentType: detectedContentType,
            orgId,
            userId,
          },
          {
            onProgress: async (phase, progress, message) => {
              logger.debug(`Workflow progress: ${phase} - ${progress}%`, { message });
              // Update queue with progress
              if (queueId) {
                try {
                  await supabase
                    .from('blog_generation_queue')
                    .update({
                      progress_percentage: progress,
                      current_stage: phase,
                    })
                    .eq('queue_id', queueId);
                } catch (e) {
                  // Non-blocking
                }
              }
            },
          }
        );
        
        if (!workflowResult.success) {
          logger.error('❌ Workflow execution failed:', workflowResult.error);
          throw new Error(workflowResult.error || 'Workflow execution failed');
        }
        
        logger.debug('✅ Workflow execution completed:', {
          contentLength: workflowResult.content?.length || 0,
          phases: workflowResult.metadata?.phases,
          duration: workflowResult.metadata?.duration,
        });
        
        // Enhance workflow output with rich HTML
        const enhancedContent = enhanceContentToRichHTML(workflowResult.content || '', {
          featuredImage: null,
          sectionImages: [],
          includeImages: false,
          enhanceFormatting: true,
          addStructure: true,
        });
        
        // Create image placeholders
        const sections = extractSections(workflowResult.content || '');
        const imagePlaceholders = {
          featured_image: {
            prompt: `Professional blog image for: ${topic}`,
            style: 'photographic' as const,
            aspect_ratio: '16:9' as const,
            quality: 'high' as const,
            type: 'featured' as const,
            keywords: keywordsArray,
          },
          section_images: sections.slice(0, 4).map((section) => ({
            position: section.wordPosition,
            prompt: `Professional blog image: ${section.title}`,
            style: 'photographic' as const,
            aspect_ratio: '16:9' as const,
            quality: 'high' as const,
            type: 'section' as const,
          })),
        };
        
        // Build response
        const workflowResponse: EnhancedBlogResponse = {
          content: enhancedContent,
          title: topic,
          excerpt: workflowResult.excerpt || '',
          progress_updates: [{
            stage: 'finalization',
            stage_number: workflowModel.phases.length,
            total_stages: workflowModel.phases.length,
            progress_percentage: 100,
            status: 'Complete',
            details: `Generated using ${workflowModel.name}`,
            metadata: workflowResult.metadata || {},
            timestamp: Date.now() / 1000,
          }],
          meta_title: topic,
          meta_description: workflowResult.excerpt || '',
          readability_score: 0,
          seo_score: 0,
          quality_score: null,
          quality_dimensions: {},
          stage_results: [],
          total_tokens: 0,
          total_cost: 0,
          generation_time: (workflowResult.metadata?.duration as number) || 0,
          citations: [],
          semantic_keywords: keywordsArray,
          structured_data: null,
          knowledge_graph: null,
          seo_metadata: {},
          content_metadata: {},
          warnings: [],
          success: true,
          word_count: (workflowResult.content?.split(/\s+/).length) || 0,
          suggestions: [],
          quality_scores: null,
          internal_links: [],
          generated_images: null,
          image_placeholders: imagePlaceholders,
          featured_image: null,
          metadata: {
            ...workflowResult.metadata,
            workflow_model: workflowModel.id,
            workflow_name: workflowModel.name,
            used_workflow: true,
          },
          image_generation_status: {
            featured_image: 'pending',
            featured_image_url: null,
            section_images_count: imagePlaceholders.section_images.length,
            section_images: imagePlaceholders.section_images.map(img => ({
              position: img.position,
              url: null,
              status: 'pending' as const,
            })),
          },
        };
        
        // Update queue with final results
        if (queueId) {
          await supabase
            .from('blog_generation_queue')
            .update({
              status: 'generated',
              generated_content: enhancedContent,
              generated_title: topic,
              generation_metadata: workflowResponse.metadata,
              progress_percentage: 100,
              generation_completed_at: new Date().toISOString(),
            })
            .eq('queue_id', queueId);
        }
        
        return NextResponse.json({
          ...workflowResponse,
          queue_id: queueId,
        });
        
      } catch (workflowError) {
        logger.error('❌ Workflow model failed, falling back to standard generation:', workflowError);
        // Fall through to standard generation
      }
    }
    
    // Call the external blog writer API
    // Note: DataForSEO Content Generation is handled by the backend API service
    // The use_dataforseo_content_generation flag is passed to the backend,
    // which will handle the provider selection and API calls
    // Use the blog-writer-api-url.ts helper to get the correct URL based on branch
    const { BLOG_WRITER_API_URL: resolvedApiUrl } = await import('@/lib/blog-writer-api-url');
    const API_BASE_URL = process.env.BLOG_WRITER_API_URL || resolvedApiUrl || 'https://blog-writer-api-dev-613248238610.europe-west9.run.app';
    
    // API is open - no authentication required, but check for optional API key
    // Only use API key if explicitly provided (for future use or special endpoints)
    const API_KEY = process.env.BLOG_WRITER_API_KEY || null;
    
    // Log API call details
    logger.debug('🌐 Calling external API', { 
      url: `${API_BASE_URL}${endpoint}`,
      hasApiKey: !!API_KEY,
      authentication: API_KEY ? 'Bearer token' : 'Open API (no auth required)'
    });
    
    logger.debug('🌐 Using endpoint (Enhanced - Always Enabled)', { endpoint });
    
    // Auto-enable quality features for premium/enterprise quality levels
    const isPremiumQuality = quality_level === 'premium' || quality_level === 'enterprise' || 
                             (contentPreset && (contentPreset.quality_level === 'premium' || contentPreset.quality_level === 'enterprise'));
    
    // Get default custom instructions for premium quality (per CLIENT_SIDE_PROMPT_GUIDE.md)
    const defaultCustomInstructions = isPremiumQuality 
      ? getDefaultCustomInstructions(template_type as any, true)
      : null;
    
    // Detect if topic requires product research (best, top, review, recommendation keywords)
    // keywordsArray already declared above for queue entry
    const topicLower = topic.toLowerCase();
    const requiresProductResearch = 
      topicLower.includes('best') ||
      topicLower.includes('top') ||
      topicLower.includes('review') ||
      topicLower.includes('recommendation') ||
      topicLower.includes('compare') ||
      topicLower.includes('vs') ||
      keywordsArray.some((k: string) => {
        const kw = String(k).toLowerCase();
        return kw.includes('best') || kw.includes('top') || kw.includes('review');
      });
    
    logger.debug('🔍 Product research detection:', {
      topic,
      requiresProductResearch,
      keywords: keywordsArray
    });

    // Perform enhanced keyword analysis if keywords are provided (v1.3.0)
    interface EnhancedKeywordInsights {
      trendsData?: Record<string, unknown>;
      serpAISummary?: Record<string, unknown>;
      keywordIdeas?: Array<{
        keyword: string;
        search_volume?: number;
        difficulty?: number;
        [key: string]: unknown;
      }>;
      isTrending?: boolean;
      mainTopics?: string[];
      missingTopics?: string[];
      commonQuestions?: string[];
      recommendations?: string[];
    }
    
    let enhancedKeywordInsights: EnhancedKeywordInsights = {};
    
    if (keywordsArray.length > 0 && shouldUseEnhanced) {
      try {
        logger.debug('🔬 Performing enhanced keyword analysis for blog generation...');
        const primaryKeyword = keywordsArray[0] || topic;
        
        // Call the keywords analyze API route with enhanced features
        const analyzeResponse = await fetch(`${request.nextUrl.origin}/api/keywords/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            keywords: [primaryKeyword],
            location: body.location || 'United States',
            language: 'en',
            max_suggestions_per_keyword: 75,
            include_trends: true,
            include_keyword_ideas: true,
            include_relevant_pages: true,
            include_serp_ai_summary: true,
          }),
        });
        
        if (analyzeResponse.ok) {
          const analyzeData = await analyzeResponse.json();
          const enhancedAnalysis = analyzeData.enhanced_analysis || analyzeData.keyword_analysis || {};
          const keywordData = enhancedAnalysis[primaryKeyword];
          
          if (keywordData) {
            // Extract enhanced insights
            enhancedKeywordInsights = {
              trendsData: keywordData.trends_data,
              serpAISummary: keywordData.serp_ai_summary,
              keywordIdeas: keywordData.keyword_ideas,
              isTrending: keywordData.trends_data?.is_trending || false,
              mainTopics: keywordData.serp_ai_summary?.main_topics,
              missingTopics: keywordData.serp_ai_summary?.missing_topics,
              commonQuestions: keywordData.serp_ai_summary?.common_questions,
              recommendations: keywordData.serp_ai_summary?.recommendations,
            };
            
            logger.debug('✅ Enhanced keyword analysis complete:', {
              isTrending: enhancedKeywordInsights.isTrending,
              hasSERPSummary: !!enhancedKeywordInsights.serpAISummary,
              mainTopicsCount: enhancedKeywordInsights.mainTopics?.length || 0,
              keywordIdeasCount: enhancedKeywordInsights.keywordIdeas?.length || 0,
            });
          }
        } else {
          logger.warn('⚠️ Enhanced keyword analysis API call failed (non-critical)');
        }
      } catch (error) {
        logger.warn('⚠️ Enhanced keyword analysis failed (non-critical):', error);
        // Continue without enhanced insights - not critical for blog generation
      }
    }
    
    // Build request payload for enhanced endpoint (v1.3.6)
    const resolvedCustomInstructions =
      custom_instructions || defaultCustomInstructions || undefined;

    if (custom_instructions) {
      logger.debug('📝 Using provided custom instructions');
    } else if (defaultCustomInstructions) {
      logger.debug('📝 Using default premium custom instructions');
    }

    const requestPayload: Record<string, unknown> = buildEnhancedBlogRequestPayload({
      topic,
      keywords: keywordsArray,
      targetAudience: target_audience || brandVoice?.target_audience || 'general',
      tone: tone || brandVoice?.tone || 'professional',
      wordCount: word_count || contentPreset?.word_count || 1500,
      qualityLevel: quality_level || contentPreset?.quality_level || 'medium',
      customInstructions: resolvedCustomInstructions,
      templateType: template_type || undefined,
      length: length || undefined,
      includeFAQ: include_faq_section,
      location,
      // v1.4: Generation mode and GSC multi-site support
      mode: mode || undefined, // Will use default based on quality level if not specified
      gscSiteUrl: gsc_site_url || undefined, // Multi-site GSC support
      researchDepth: research_depth || undefined, // Default: 'standard'
    });

    // Add quality features (enable automatically for premium, or use provided values)
    const effectiveQualityLevel = quality_level || contentPreset?.quality_level || 'medium';
    const recommendedQualityFeatures = getQualityFeaturesForLevel(effectiveQualityLevel);
    
    if (isPremiumQuality) {
      // Auto-enable all quality features for premium/enterprise, but allow overrides
      requestPayload.use_google_search = use_google_search !== undefined ? use_google_search : recommendedQualityFeatures.use_google_search;
      requestPayload.use_fact_checking = use_fact_checking !== undefined ? use_fact_checking : recommendedQualityFeatures.use_fact_checking;
      requestPayload.use_citations = use_citations !== undefined ? use_citations : recommendedQualityFeatures.use_citations;
      requestPayload.use_serp_optimization = use_serp_optimization !== undefined ? use_serp_optimization : recommendedQualityFeatures.use_serp_optimization;
      requestPayload.use_consensus_generation = use_consensus_generation !== undefined ? use_consensus_generation : recommendedQualityFeatures.use_consensus_generation; // Best quality: GPT-4o + Claude
      requestPayload.use_knowledge_graph = use_knowledge_graph !== undefined ? use_knowledge_graph : recommendedQualityFeatures.use_knowledge_graph;
      requestPayload.use_semantic_keywords = use_semantic_keywords !== undefined ? use_semantic_keywords : recommendedQualityFeatures.use_semantic_keywords;
      requestPayload.use_quality_scoring = use_quality_scoring !== undefined ? use_quality_scoring : recommendedQualityFeatures.use_quality_scoring;
      logger.debug('✨ Premium quality: Auto-enabled quality features', recommendedQualityFeatures);
    } else {
      // Use provided values or recommended defaults for quality level
      requestPayload.use_google_search = use_google_search !== undefined ? use_google_search : recommendedQualityFeatures.use_google_search;
      requestPayload.use_fact_checking = use_fact_checking !== undefined ? use_fact_checking : recommendedQualityFeatures.use_fact_checking;
      requestPayload.use_citations = use_citations !== undefined ? use_citations : recommendedQualityFeatures.use_citations;
      requestPayload.use_serp_optimization = use_serp_optimization !== undefined ? use_serp_optimization : recommendedQualityFeatures.use_serp_optimization;
      requestPayload.use_consensus_generation = use_consensus_generation !== undefined ? use_consensus_generation : recommendedQualityFeatures.use_consensus_generation;
      requestPayload.use_knowledge_graph = use_knowledge_graph !== undefined ? use_knowledge_graph : recommendedQualityFeatures.use_knowledge_graph;
      requestPayload.use_semantic_keywords = use_semantic_keywords !== undefined ? use_semantic_keywords : recommendedQualityFeatures.use_semantic_keywords;
      requestPayload.use_quality_scoring = use_quality_scoring !== undefined ? use_quality_scoring : recommendedQualityFeatures.use_quality_scoring;
    }

    // Note: v1.3.6 enhanced endpoint handles keyword insights internally
    
    // v1.3.6: Add common fields supported by all blog types
    // Add focus_keyword if available
    if (keywordsArray.length > 0) {
      requestPayload.focus_keyword = keywordsArray[0];
    }
    
    // Add include flags (supported by all blog types)
    requestPayload.include_introduction = true; // Default to true
    requestPayload.include_conclusion = true; // Default to true
    requestPayload.include_faq = include_faq_section !== undefined ? include_faq_section : false;
    requestPayload.include_toc = false; // Default to false
    
    // v1.3.4: Abstraction blog type is not currently used in this implementation
    // If needed in the future, add logic to determine when blogType should be 'abstraction'
    // Abstraction blogs support content_strategy and quality_target fields
    
    logger.debug('📤 Request payload', { payload: JSON.stringify(requestPayload, null, 2) });
    const systemPromptForLog = typeof requestPayload.system_prompt === 'string' ? requestPayload.system_prompt : '';
    logger.debug('📤 Key parameters being sent to Cloud Run backend:', {
      topic: requestPayload.topic,
      keywords: requestPayload.keywords,
      target_audience: requestPayload.target_audience,
      tone: requestPayload.tone,
      word_count_target: requestPayload.word_count_target,
      quality_level: quality_level || contentPreset?.quality_level || 'medium',
      endpoint: endpoint,
      has_custom_instructions: !!requestPayload.custom_instructions,
      has_enhanced_insights: !!requestPayload.enhanced_keyword_insights,
      has_content_goal: !!requestPayload.content_goal,
      system_prompt_length: systemPromptForLog.length,
      async_mode: asyncMode,
      use_dataforseo_content_generation: requestPayload.use_dataforseo_content_generation,
      use_openai_fallback: requestPayload.use_openai_fallback,
      use_consensus_generation: requestPayload.use_consensus_generation,
    });
    
    // Add async_mode query parameter if requested
    const apiUrl = asyncMode 
      ? `${API_BASE_URL}${endpoint}?async_mode=true`
      : `${API_BASE_URL}${endpoint}`;
    
    // Build headers - only include Authorization if API key is provided
    // API is open, so authentication is optional
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Only add Authorization header if API key is explicitly provided
    if (API_KEY && API_KEY.trim() !== '') {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestPayload),
    });
    
    logger.debug('📥 External API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('❌ External API error', { 
        status: response.status, 
        error: errorText,
        url: apiUrl,
        hasApiKey: !!API_KEY,
        authentication: API_KEY ? 'Bearer token' : 'Open API (no auth)',
        queueId: queueId
      });
      
      // Update queue entry with error if queue exists
      if (queueId) {
        try {
          await supabase
            .from('blog_generation_queue')
            .update({
              status: 'failed',
              generation_error: `API error ${response.status}: ${errorText.substring(0, 500)}`,
              generation_completed_at: new Date().toISOString()
            })
            .eq('queue_id', queueId);
          logger.debug('✅ Queue entry updated with error status', { queueId });
        } catch (error) {
          logger.warn('⚠️ Failed to update queue entry with error:', error);
        }
      }
      
      // Always return queue_id even on error so frontend can track the failed generation
      if (queueId) {
        return NextResponse.json(
          { 
            error: `External API error: ${response.status} ${errorText}`,
            queue_id: queueId, // Include queue_id so frontend can track this failed generation
            status: 'failed'
          },
          { status: 500 } // Return 500 to indicate server error, but include queue_id
        );
      }
      
      // If no queue_id, return error without queue_id
      return NextResponse.json(
        { error: `External API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    
    // Handle async mode response (returns job_id instead of blog content)
    if (asyncMode && result.job_id) {
      logger.debug('✅ Async job created successfully', { job_id: result.job_id });
      
      // Update queue entry with job_id if queue exists
      if (queueId) {
        try {
          await supabase
            .from('blog_generation_queue')
            .update({
              status: 'queued',
              metadata: {
                backend_job_id: result.job_id,
                estimated_completion_time: result.estimated_completion_time || null,
                async_mode: true
              },
              generation_started_at: new Date().toISOString()
            })
            .eq('queue_id', queueId);
        } catch (error) {
          logger.warn('⚠️ Failed to update queue entry with job_id:', error);
        }
      }
      
      // Return async job response
      return NextResponse.json({
        job_id: result.job_id,
        status: result.status || 'queued',
        message: result.message || 'Blog generation job created',
        estimated_completion_time: result.estimated_completion_time,
        queue_id: queueId // Include our internal queue_id for tracking
      });
    }
    
    // If async_mode was requested but no job_id returned, check if it's an error
    // The external API might not support async mode (missing GOOGLE_CLOUD_PROJECT)
    if (asyncMode && !result.job_id) {
      logger.warn('⚠️ Async mode requested but no job_id returned. External API may not support async mode.', {
        resultKeys: Object.keys(result),
        error: result.error || result.error_message
      });
      
      // If queue exists, update it to indicate async mode failed
      // But still return queue_id so frontend can track it
      if (queueId) {
        try {
          await supabase
            .from('blog_generation_queue')
            .update({
              status: 'generating', // Keep as generating - will be updated when content arrives
              metadata: {
                async_mode_requested: true,
                async_mode_failed: true,
                fallback_to_sync: true,
                error: result.error || result.error_message || 'Async mode not available'
              }
            })
            .eq('queue_id', queueId);
        } catch (error) {
          logger.warn('⚠️ Failed to update queue entry:', error);
        }
      }
      
      // Continue with synchronous processing - the content will be returned below
      // But ensure queue_id is included in response
    }
    
    logger.debug('✅ Blog generated successfully from external API');
    logger.debug('📄 Full API response structure:', {
      hasContent: !!result.content,
      hasTitle: !!result.title,
      hasExcerpt: !!result.excerpt,
      hasBlogPost: !!result.blog_post,
      keys: Object.keys(result),
      contentPreview: result.content?.substring(0, 200) || result.blog_post?.content?.substring(0, 200) || 'No content',
      contentLength: result.content?.length || result.blog_post?.content?.length || 0,
    });
    logger.debug('📄 Raw API response (first 500 chars)', { response: JSON.stringify(result).substring(0, 500) });
    
    // Update queue entry with progress updates if queue exists
    if (queueId) {
      try {
        // Extract progress updates from result
        let progressUpdates: ProgressUpdate[] = [];
        if (result.progress_updates && Array.isArray(result.progress_updates)) {
          progressUpdates = result.progress_updates;
        }
        
        const latestProgress = progressUpdates.length > 0 
          ? progressUpdates[progressUpdates.length - 1] 
          : null;
        
        const progressPercentage = latestProgress?.progress_percentage || 100;
        const currentStage = latestProgress?.stage || 'finalization';
        
        // Update queue with progress
        await supabase
          .from('blog_generation_queue')
          .update({
            progress_percentage: progressPercentage,
            current_stage: currentStage,
            progress_updates: progressUpdates,
            status: 'generated',
            generation_completed_at: new Date().toISOString()
          })
          .eq('queue_id', queueId);
        
        logger.debug('✅ Queue entry updated with progress:', {
          queue_id: queueId,
          progress: progressPercentage,
          stage: currentStage,
          updates_count: progressUpdates.length
        });
      } catch (error) {
        logger.warn('⚠️ Failed to update queue entry:', error);
        // Continue without queue update (non-blocking)
      }
    }
    
    // Extract progress updates from external API response
    // Handle both new format (progress_updates array) and legacy format
    let progressUpdates: ProgressUpdate[] = [];
    
    if (result.progress_updates && Array.isArray(result.progress_updates)) {
      // New format: array of progress updates
      progressUpdates = result.progress_updates;
    } else if (result.progress) {
      // Legacy format: single progress object (convert to array)
      progressUpdates = [{
        stage: result.progress.stage || 'unknown',
        stage_number: result.progress.stage_number || 0,
        total_stages: result.progress.total_stages || 12,
        progress_percentage: result.progress.progress_percentage || 0,
        status: result.progress.status || 'Processing',
        details: result.progress.details,
        metadata: result.progress.metadata || {},
        timestamp: result.progress.timestamp || Date.now() / 1000
      }];
    } else {
      // No progress data - create a synthetic update for completion
      progressUpdates = [{
        stage: 'finalization',
        stage_number: 12,
        total_stages: 12,
        progress_percentage: 100,
        status: 'Blog generation complete',
        details: 'Content generated successfully',
        metadata: {},
        timestamp: Date.now() / 1000
      }];
    }
    
    // Log progress updates (only in development or when explicitly enabled)
    if (process.env.NODE_ENV === 'development' || process.env.LOG_PROGRESS === 'true') {
      logger.debug('📊 Progress updates received:', {
        count: progressUpdates.length,
        latestProgress: progressUpdates.length > 0 
          ? progressUpdates[progressUpdates.length - 1].progress_percentage 
          : 0,
        latestStatus: progressUpdates.length > 0 
          ? progressUpdates[progressUpdates.length - 1].status 
          : 'No progress data'
      });
    }
    
    // Extract content for processing (v1.3.4 unified endpoint response formats)
    // Handle Standard/Abstraction format: { success, blog_post: { title, content, meta_description }, ... }
    // Handle Enhanced format: { title, content, meta_description, ... }
    // Handle Local Business format: { title, content, businesses, ... }
    const rawContent = result.blog_post?.content || result.content || '';
    const blogTitle = result.blog_post?.title || result.title || topic;
    const metaDescription = result.blog_post?.meta_description || result.meta_description;
    
    // Clean excerpt immediately if it contains artifacts (before any processing)
    const rawExcerpt = result.blog_post?.excerpt || result.excerpt || '';
    let cleanedExcerpt = rawExcerpt;
    if (rawExcerpt && (rawExcerpt.includes("enhanced version") || rawExcerpt.includes("addressing the specified") || rawExcerpt.includes("readability concerns") || rawExcerpt.includes("!AI"))) {
      cleanedExcerpt = cleanExcerpt(rawExcerpt);
      // If excerpt is still bad after cleaning, force regeneration
      if (cleanedExcerpt.length < 50 || cleanedExcerpt.includes("enhanced version") || cleanedExcerpt.includes("addressing")) {
        cleanedExcerpt = ''; // Force regeneration from cleaned content
      }
    }
    
    // Check for missing mandatory fields from DataForSEO response
    // If missing, use OpenAI to fill them in (fallback)
    logger.debug('🔍 Checking for missing mandatory fields from DataForSEO response...');
    const dataForSEOFields: BlogFieldData = {
      title: blogTitle,
      content: rawContent,
      excerpt: cleanedExcerpt || result.blog_post?.excerpt || result.excerpt || '',
      meta_description: metaDescription,
      seo_title: result.meta_title || result.title || blogTitle,
    };
    
    const validation = validateBlogFields(dataForSEOFields);
    const missingFields = [...validation.missingRequired, ...validation.missingRecommended];
    
    if (missingFields.length > 0) {
      logger.info('⚠️ Missing mandatory fields detected, using OpenAI fallback to fill them:', {
        missingRequired: validation.missingRequired,
        missingRecommended: validation.missingRecommended,
      });
      
      try {
        // Use OpenAI to fill missing fields
        const llmService = new LLMAnalysisService();
        if (llmService.isConfigured()) {
          const openAIResult = await llmService.analyzeBlogContent({
            title: blogTitle || topic,
            content: rawContent,
            existingFields: {
              excerpt: dataForSEOFields.excerpt,
              metaDescription: dataForSEOFields.meta_description,
              seoTitle: dataForSEOFields.seo_title,
            },
          });
          
          // Merge OpenAI results with DataForSEO results
          if (!dataForSEOFields.excerpt && openAIResult.excerpt) {
            result.excerpt = openAIResult.excerpt;
            logger.debug('✅ OpenAI filled missing excerpt');
          }
          if (!dataForSEOFields.meta_description && openAIResult.metaDescription) {
            result.meta_description = openAIResult.metaDescription;
            logger.debug('✅ OpenAI filled missing meta_description');
          }
          if (!dataForSEOFields.seo_title && openAIResult.seoTitle) {
            result.meta_title = openAIResult.seoTitle;
            logger.debug('✅ OpenAI filled missing seo_title');
          }
          
          logger.debug('✅ OpenAI fallback completed, merged results');
        } else {
          logger.warn('⚠️ OpenAI credentials not configured, cannot fill missing fields');
        }
      } catch (error) {
        logger.error('❌ OpenAI fallback failed:', error);
        // Continue with DataForSEO results even if OpenAI fails
      }
    } else {
      logger.debug('✅ All mandatory fields present in DataForSEO response');
    }
    
    // Map v1.3.4 response fields to our internal format
    // Map generation_time_seconds to generation_time for backward compatibility
    if (result.generation_time_seconds && !result.generation_time) {
      result.generation_time = result.generation_time_seconds;
    }
    
    // Map quality_scores structure if present
    if (result.quality_scores && typeof result.quality_scores === 'object') {
      const qs = result.quality_scores as Record<string, number>;
      result.quality_dimensions = qs;
      // Calculate overall quality_score as average
      const scores = Object.values(qs).filter(v => typeof v === 'number');
      if (scores.length > 0) {
        result.quality_score = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
    }
    
    // Image generation is now handled separately after blog creation
    // Create placeholders for image generation that can be triggered from the frontend
    const imageKeywords = Array.isArray(keywords) ? keywords : [];
    const imageTopic = topic || result.title || result.blog_post?.title || 'blog post';
    
    // Extract sections for potential section images
    const sections = extractSections(rawContent);
    const sectionImagePlaceholders = sections
      .slice(0, 4) // Limit to 4 section images max
      .map((section, index) => ({
        position: section.wordPosition,
        prompt: `Professional blog image illustrating: ${section.title}, ${imageTopic}`,
        style: 'photographic' as const,
        aspect_ratio: '16:9' as const,
        quality: 'high' as const,
        type: 'section' as const
      }));
    
    // Create image generation placeholders
    const imagePlaceholders = {
      featured_image: {
        prompt: `Professional product photography: ${imageTopic}. High quality, clean background, professional lighting`,
        style: 'photographic' as const,
        aspect_ratio: '16:9' as const,
        quality: 'high' as const,
        type: 'featured' as const,
        keywords: imageKeywords
      },
      section_images: sectionImagePlaceholders
    };
    
    logger.debug('📸 Image generation placeholders created:', {
      featuredImagePrompt: imagePlaceholders.featured_image.prompt,
      sectionImageCount: imagePlaceholders.section_images.length
    });
    
    // Set featuredImage and sectionImages to null (images will be generated separately)
    const featuredImage: GeneratedImage | null = null;
    const sectionImages: Array<{ position: number; image: GeneratedImage }> = [];
    
    // Enhance content to rich HTML (without images - they'll be added later)
    logger.debug('✨ Enhancing content to rich HTML...');
    let enhancedContent = enhanceContentToRichHTML(rawContent, {
      featuredImage: null, // Images will be generated separately
      sectionImages: [], // Images will be generated separately
      includeImages: false, // Don't include images in initial generation
      enhanceFormatting: true,
      addStructure: true
    });
    
    // Phase 3: Additional content enhancement for formatting fixes
    // This addresses DataForSEO formatting issues (malformed markdown, poor structure)
    if (enhancedContent && enhancedContent.length > 0) {
      try {
        logger.debug('🔧 Running Phase 3: Content Enhancement (formatting fixes)...');
        const enhancementResponse = await fetch(`${request.nextUrl.origin}/api/workflow/enhance-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: enhancedContent,
            title: blogTitle,
            topic,
            keywords: keywordsArray,
            improve_formatting: true,
            generate_structured_data: false, // Already handled above
          }),
        });
        
        if (enhancementResponse.ok) {
          const enhancementData = await enhancementResponse.json();
          if (enhancementData.enhanced_content && enhancementData.enhanced_content.length > enhancedContent.length * 0.5) {
            enhancedContent = enhancementData.enhanced_content;
            logger.debug('✅ Phase 3 enhancement applied successfully', {
              originalLength: rawContent.length,
              enhancedLength: enhancedContent.length,
            });
            
            // Update excerpt and meta_description if enhanced versions are better
            if (enhancementData.enhanced_fields?.excerpt && enhancementData.enhanced_fields.excerpt.length > 100) {
              result.excerpt = enhancementData.enhanced_fields.excerpt;
            }
            if (enhancementData.enhanced_fields?.meta_description && enhancementData.enhanced_fields.meta_description.length > 100) {
              result.meta_description = enhancementData.enhanced_fields.meta_description;
            }
            if (enhancementData.enhanced_fields?.meta_title) {
              result.meta_title = enhancementData.enhanced_fields.meta_title;
            }
          }
        } else {
          logger.warn('⚠️ Phase 3 enhancement failed, using basic enhancement', {
            status: enhancementResponse.status,
          });
        }
      } catch (error) {
        logger.warn('⚠️ Phase 3 enhancement error (non-critical), continuing with basic enhancement', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with basic enhancement - non-critical
      }
    }
    
    logger.debug('📊 Content enhancement:', {
      originalLength: rawContent.length,
      enhancedLength: enhancedContent.length,
      hasFeaturedImage: !!featuredImage,
      sectionImageCount: sectionImages.length,
      isHTML: enhancedContent.includes('<')
    });
    
    // Transform the response to match our expected format
    // Use helper function to build response (avoids duplication)
    const transformedResult = buildBlogResponse(
      result,
      enhancedContent,
      progressUpdates,
      featuredImage,
      sectionImages,
      imagePlaceholders,
      {
        topic,
        brandVoice,
        contentPreset,
        endpoint,
        shouldUseEnhanced,
        requiresProductResearch
      }
    );
    
    // Verify progress updates structure
    if (progressUpdates.length > 0) {
      const latest = progressUpdates[progressUpdates.length - 1];
      if (process.env.NODE_ENV === 'development' || process.env.LOG_PROGRESS === 'true') {
        logger.debug('✅ Latest progress:', {
          stage: latest.stage,
          percentage: latest.progress_percentage,
          status: latest.status
        });
      }
    }
    
    // Ensure response includes progress_updates
    if (!transformedResult.progress_updates) {
      transformedResult.progress_updates = progressUpdates;
    }
    
    logger.debug('📄 Transformed result:', {
      contentLength: transformedResult.content.length,
      title: transformedResult.title,
      excerpt: transformedResult.excerpt,
      wordCount: transformedResult.word_count,
      seoScore: transformedResult.seo_score,
      enhanced: shouldUseEnhanced,
      productResearchRequested: requiresProductResearch,
      imageGenerated: false, // Images generated separately
      sectionImagesCount: 0, // Images generated separately
      imagePlaceholdersCreated: true,
      progressUpdatesCount: transformedResult.progress_updates.length,
      hasProgressUpdates: transformedResult.progress_updates.length > 0
    });
    
    // Update queue entry with final results if queue exists
    if (queueId && transformedResult) {
      try {
        // Save ENHANCED content (with Cloudinary URLs and proper HTML structure) instead of raw content
        // This ensures drafts have images, proper headings (H1, H2, H3), and all formatting
        await supabase
          .from('blog_generation_queue')
          .update({
            generated_content: enhancedContent, // Use enhanced content with Cloudinary URLs and HTML structure
            generated_title: transformedResult.title,
            generation_metadata: {
              ...transformedResult.metadata,
              seo_score: transformedResult.seo_score,
              readability_score: transformedResult.readability_score,
              quality_score: transformedResult.quality_score,
              word_count: transformedResult.word_count,
              total_cost: transformedResult.total_cost,
              generation_time: transformedResult.generation_time,
              // Include SEO metadata (Twitter OG tags, etc.) from API response
              seo_metadata: transformedResult.seo_metadata || {},
              structured_data: transformedResult.structured_data || null,
              meta_title: transformedResult.meta_title,
              meta_description: transformedResult.meta_description,
              // Image placeholders (images generated separately)
              featured_image_url: null, // Will be generated separately
              featured_image_alt_text: `Featured image for ${transformedResult.title}`,
              // Include image placeholders for frontend-triggered generation
              image_placeholders: imagePlaceholders,
              generated_images: null, // Images not generated during blog creation
              // Include internal links
              internal_links: transformedResult.internal_links || [],
              // Include excerpt
              excerpt: transformedResult.excerpt,
            }
          })
          .eq('queue_id', queueId);
        
        logger.debug('✅ Queue entry updated with enhanced content (includes Cloudinary URLs and HTML structure)');
      } catch (error) {
        logger.warn('⚠️ Failed to update queue entry with content:', error);
      }
    }
    
    if (result.success && result.blog_post) {
      // Include queue_id in response if available
      if (queueId) {
        return NextResponse.json({
          ...transformedResult,
          queue_id: queueId
        });
      }
      return NextResponse.json(transformedResult);
    } else if (result.content || result.title) {
      // Handle non-standard response format
      // Include queue_id in response if available
      if (queueId) {
        return NextResponse.json({
          ...transformedResult,
          queue_id: queueId
        });
      }
      return NextResponse.json(transformedResult);
    } else {
      logger.error('❌ API returned unsuccessful result:', {
        success: result.success,
        errorMessage: result.error_message || result.error,
        errorCode: result.error_code,
        keys: Object.keys(result)
      });
      
      // Update queue entry with error if queue exists
      if (queueId) {
        try {
          await supabase
            .from('blog_generation_queue')
            .update({
              status: 'failed',
              generation_error: result.error_message || result.error || 'Blog generation failed',
              generation_completed_at: new Date().toISOString()
            })
            .eq('queue_id', queueId);
        } catch (error) {
          logger.warn('⚠️ Failed to update queue entry with error:', error);
        }
      }
      
      // Always return queue_id even on error so frontend can track the failed generation
      if (queueId) {
        return NextResponse.json(
          { 
            error: result.error_message || result.error || 'Blog generation failed',
            queue_id: queueId, // Include queue_id so frontend can track this failed generation
            status: 'failed'
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: result.error_message || result.error || 'Blog generation failed' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    logger.error('❌ Error in blog generation API:', error);
    
    // Update queue entry with error if queue exists
    // Note: queueId is declared in outer scope, so it's accessible here
    if (queueId) {
      try {
        const errorSupabase = await createClient();
        await errorSupabase
          .from('blog_generation_queue')
          .update({
            status: 'failed',
            generation_error: error instanceof Error ? error.message : 'Internal server error',
            generation_completed_at: new Date().toISOString()
          })
          .eq('queue_id', queueId);
        logger.debug('✅ Queue entry updated with error status in catch block', { queueId });
      } catch (updateError) {
        logger.warn('⚠️ Failed to update queue entry with error:', updateError);
      }
    }
    
    // Always return queue_id even on error so frontend can track the failed generation
    if (queueId) {
      return NextResponse.json(
        { 
          error: 'Internal server error',
          queue_id: queueId, // Include queue_id so frontend can track this failed generation
          status: 'failed'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
