import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import cloudRunHealth from '@/lib/cloud-run-health';
import BlogImageGenerator, { type GeneratedImage } from '@/lib/image-generation';
import { uploadViaBlogWriterAPI, saveMediaAsset } from '@/lib/cloudinary-upload';
import { enhanceContentToRichHTML, extractSections } from '@/lib/content-enhancer';
import { getDefaultCustomInstructions, getQualityFeaturesForLevel, mapWordCountToLength, convertLengthToAPI } from '@/lib/blog-generation-utils';
import type { ProgressUpdate, EnhancedBlogResponse } from '@/types/blog-generation';

// Create server-side image generator (uses direct Cloud Run URL)
const imageGenerator = new BlogImageGenerator(
  process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west1.run.app',
  process.env.BLOG_WRITER_API_KEY || '',
  false // Don't use local route on server-side
);

/**
 * Helper function to build the transformed blog generation response
 * This centralizes response building to avoid duplication between response paths
 */
function buildBlogResponse(
  result: any,
  enhancedContent: string,
  progressUpdates: ProgressUpdate[],
  featuredImage: GeneratedImage | null,
  sectionImages: Array<{ position: number; image: GeneratedImage }>,
  options: {
    topic: string;
    brandVoice: any;
    contentPreset: any;
    endpoint: string;
    shouldUseEnhanced: boolean;
    requiresProductResearch: boolean;
  }
): EnhancedBlogResponse {
  const { topic, brandVoice, contentPreset, endpoint, shouldUseEnhanced, requiresProductResearch } = options;
  
  // Determine title and excerpt from various possible sources
  const title = result.blog_post?.title || result.title || result.meta_title || topic;
  const excerpt = result.blog_post?.excerpt || result.blog_post?.summary || result.excerpt || result.meta_description || '';
  
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
    
    // Citations and sources
    citations: result.citations || [],
    
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
    
    // Include generated featured image if available
    featured_image: featuredImage ? {
      image_id: featuredImage.image_id,
      image_url: featuredImage.image_url,
      image_data: featuredImage.image_data,
      width: featuredImage.width,
      height: featuredImage.height,
      format: featuredImage.format,
      alt_text: `Featured image for ${title}`,
      quality_score: featuredImage.quality_score,
      safety_score: featuredImage.safety_score
    } : null,
    
    // Metadata about the generation process
    metadata: {
      used_brand_voice: !!brandVoice,
      used_preset: !!contentPreset,
      endpoint_used: endpoint,
      enhanced: shouldUseEnhanced,
      image_generated: !!featuredImage,
      section_images_generated: sectionImages.length,
      content_enhanced: true,
      content_format: 'rich_html',
      product_research_requested: requiresProductResearch,
      web_research_requested: requiresProductResearch,
      has_progress_updates: progressUpdates.length > 0,
      total_progress_stages: progressUpdates.length > 0 
        ? progressUpdates[progressUpdates.length - 1].total_stages 
        : null,
    },
    
    // Image generation status
    image_generation_status: {
      featured_image: featuredImage ? 'success' : 'failed',
      featured_image_url: featuredImage?.image_url || null,
      section_images_count: sectionImages.length,
      section_images: sectionImages.map(img => ({
        position: img.position,
        url: img.image.image_url || null,
        status: img.image.image_url ? 'success' : 'failed'
      }))
    }
  };
}

export async function POST(request: NextRequest) {
  // Declare queueId outside try block so it's accessible in catch block
  let queueId: string | null = null;
  
  try {
    console.log('🚀 Blog generation API route called');
    
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
    } = body;
    
    console.log('📝 Generation parameters:', {
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
      use_enhanced
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
    
    // Always use enhanced endpoint for better content quality
    const shouldUseEnhanced = true; // Always use enhanced endpoint
    const endpoint = '/api/v1/blog/generate-enhanced';
    
    // Initialize variables that will be used in queue entry
    let brandVoice: any = null;
    let contentPreset: any = null;
    
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
        console.log('⚠️ User org not found, using system defaults');
      } else {
        userId = user.id;
        orgId = userProfile.org_id;
        console.log('✅ Using authenticated user:', userId, 'Org:', orgId);
      }
    } else {
      // Use service client with default system values
      const serviceSupabase = createServiceClient();
      userId = '00000000-0000-0000-0000-000000000002';
      orgId = '00000000-0000-0000-0000-000000000001';
      console.log('✅ Using service client with system user:', userId, 'Org:', orgId);
    }
    
    // Create queue entry before generation starts
    if (orgId && userId) {
      try {
        console.log('📋 Creating queue entry for blog generation...');
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
          console.warn('⚠️ Failed to create queue entry:', queueError);
          // Continue without queue entry (non-blocking)
        } else if (queueItem) {
          queueId = queueItem.queue_id;
          console.log('✅ Queue entry created:', queueId);
        }
      } catch (error) {
        console.warn('⚠️ Error creating queue entry:', error);
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
        console.log('🎨 Found brand voice settings:', {
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
          console.log('📝 Found org-specific content goal prompt for:', content_goal);
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
            console.log('📝 Found system default content goal prompt for:', content_goal);
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch content goal prompt:', error);
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
        console.log('📋 Found content preset:', {
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
        console.log('📋 Using default content preset:', defaultPreset.name);
      }
    }
    
    // First, ensure Cloud Run is awake and healthy
    console.log('🌅 Checking Cloud Run health...');
    const healthStatus = await cloudRunHealth.wakeUpAndWait();
    
    if (!healthStatus.isHealthy) {
      console.error('❌ Cloud Run is not healthy:', healthStatus.error);
      
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
    
    console.log('✅ Cloud Run is healthy, proceeding with blog generation...');
    
    // Call the external blog writer API
    const API_BASE_URL = process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west1.run.app';
    const API_KEY = process.env.BLOG_WRITER_API_KEY;
    
    // shouldUseEnhanced and endpoint already declared above for queue entry
    console.log('🌐 Calling external API:', `${API_BASE_URL}${endpoint}`);
    console.log('🔑 API Key present:', !!API_KEY);
    console.log('🌐 Using endpoint:', endpoint, '(Enhanced - Always Enabled)');
    
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
    
    console.log('🔍 Product research detection:', {
      topic,
      requiresProductResearch,
      keywords: keywordsArray
    });

    // Perform enhanced keyword analysis if keywords are provided (v1.3.0)
    let enhancedKeywordInsights: {
      trendsData?: any;
      serpAISummary?: any;
      keywordIdeas?: any[];
      isTrending?: boolean;
      mainTopics?: string[];
      missingTopics?: string[];
      commonQuestions?: string[];
      recommendations?: string[];
    } = {};
    
    if (keywordsArray.length > 0 && shouldUseEnhanced) {
      try {
        console.log('🔬 Performing enhanced keyword analysis for blog generation...');
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
            
            console.log('✅ Enhanced keyword analysis complete:', {
              isTrending: enhancedKeywordInsights.isTrending,
              hasSERPSummary: !!enhancedKeywordInsights.serpAISummary,
              mainTopicsCount: enhancedKeywordInsights.mainTopics?.length || 0,
              keywordIdeasCount: enhancedKeywordInsights.keywordIdeas?.length || 0,
            });
          }
        } else {
          console.warn('⚠️ Enhanced keyword analysis API call failed (non-critical)');
        }
      } catch (error) {
        console.warn('⚠️ Enhanced keyword analysis failed (non-critical):', error);
        // Continue without enhanced insights - not critical for blog generation
      }
    }
    
    // Build request payload with optional external links parameters
    const requestPayload: Record<string, unknown> = {
      topic,
      keywords: keywordsArray,
      target_audience: target_audience || brandVoice?.target_audience || 'general',
      tone: tone || brandVoice?.tone || 'professional',
      word_count: word_count || contentPreset?.word_count || 1000,
      // Request rich HTML format
      content_format: 'html',
      include_formatting: true,
      include_images: true, // Request API to include image placeholders
    };

    // Add custom instructions (use provided or default for premium)
    if (custom_instructions) {
      requestPayload.custom_instructions = custom_instructions;
      console.log('📝 Using provided custom instructions');
    } else if (defaultCustomInstructions) {
      requestPayload.custom_instructions = defaultCustomInstructions;
      console.log('📝 Using default premium custom instructions');
    }

    // Add template type if provided
    if (template_type) {
      requestPayload.template_type = template_type;
    }

    // Add length preference (map word_count to length if not provided)
    // Convert UI length ('very_long') to API length ('extended')
    if (length) {
      requestPayload.length = convertLengthToAPI(length);
    } else if (word_count) {
      requestPayload.length = convertLengthToAPI(mapWordCountToLength(word_count));
    }

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
      console.log('✨ Premium quality: Auto-enabled quality features', recommendedQualityFeatures);
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

    // Add enhanced keyword insights if available (v1.3.0)
    if (enhancedKeywordInsights.serpAISummary) {
      requestPayload.enhanced_keyword_insights = {
        // SERP AI Summary for content structure
        main_topics: enhancedKeywordInsights.mainTopics || [],
        missing_topics: enhancedKeywordInsights.missingTopics || [],
        common_questions: enhancedKeywordInsights.commonQuestions || [],
        recommendations: enhancedKeywordInsights.recommendations || [],
        content_summary: enhancedKeywordInsights.serpAISummary.summary,
        // Trends data for timely content
        is_trending: enhancedKeywordInsights.isTrending || false,
        trend_score: enhancedKeywordInsights.trendsData?.trend_score,
        related_topics: enhancedKeywordInsights.trendsData?.related_topics || [],
        // Keyword ideas for content expansion
        keyword_ideas: enhancedKeywordInsights.keywordIdeas?.slice(0, 10).map(idea => idea.keyword) || [],
      };
      
      console.log('📊 Adding enhanced keyword insights to blog generation:', {
        mainTopicsCount: enhancedKeywordInsights.mainTopics?.length || 0,
        missingTopicsCount: enhancedKeywordInsights.missingTopics?.length || 0,
        questionsCount: enhancedKeywordInsights.commonQuestions?.length || 0,
        isTrending: enhancedKeywordInsights.isTrending,
        keywordIdeasCount: enhancedKeywordInsights.keywordIdeas?.length || 0,
      });
    }
    
    // Add content goal prompt if available
    // IMPORTANT: Ensure topic is always included in the prompt, even with content goal prompts
    if (contentGoalPrompt?.system_prompt) {
      // Combine content goal prompt with topic-specific instructions
      // This ensures the AI knows what topic to write about
      const topicSpecificInstruction = `Write a comprehensive blog post about: ${topic}${keywordsArray.length > 0 ? `\n\nTarget keywords: ${keywordsArray.join(', ')}` : ''}`;
      
      // Combine system prompt with topic instruction
      const systemPrompt = `${contentGoalPrompt.system_prompt}\n\n${topicSpecificInstruction}`;
      requestPayload.system_prompt = systemPrompt;
      requestPayload.content_goal = content_goal;
      console.log('📝 Adding content goal prompt to API request:', {
        content_goal,
        prompt_length: systemPrompt.length,
        has_user_template: !!contentGoalPrompt.user_prompt_template,
        topic_included: systemPrompt.includes(topic)
      });
      
      // Add user prompt template if available (should include {topic} placeholder)
      if (contentGoalPrompt.user_prompt_template) {
        // Replace {topic} placeholder if present, otherwise append topic
        const userTemplate = contentGoalPrompt.user_prompt_template.includes('{topic}')
          ? contentGoalPrompt.user_prompt_template.replace(/{topic}/g, topic)
          : `${contentGoalPrompt.user_prompt_template}\n\nTopic: ${topic}`;
        requestPayload.user_prompt_template = userTemplate;
      } else {
        // If no user template, create one with the topic
        requestPayload.user_prompt_template = `Write a comprehensive blog post about: ${topic}${keywordsArray.length > 0 ? `\n\nTarget keywords: ${keywordsArray.join(', ')}` : ''}`;
      }
      
      // Add additional instructions if available
      if (contentGoalPrompt.instructions && Object.keys(contentGoalPrompt.instructions).length > 0) {
        requestPayload.additional_instructions = {
          ...contentGoalPrompt.instructions,
          topic: topic,
          keywords: keywordsArray,
        };
      }
    } else {
      // Even without content goal prompt, ensure topic is in user prompt template
      requestPayload.user_prompt_template = `Write a comprehensive blog post about: ${topic}${keywordsArray.length > 0 ? `\n\nTarget keywords: ${keywordsArray.join(', ')}` : ''}`;
    }
    
    // Add web research and product research parameters
    // Use explicit parameters if provided, otherwise auto-detect
    const shouldIncludeProductResearch = include_product_research !== undefined 
      ? include_product_research 
      : requiresProductResearch;
    
    if (shouldIncludeProductResearch) {
      console.log('📊 Adding product research parameters...');
      requestPayload.include_web_research = true;
      requestPayload.include_product_research = true;
      
      // Use provided values or defaults
      requestPayload.research_depth = research_depth || 'comprehensive';
      requestPayload.include_brands = include_brands !== undefined ? include_brands : true;
      requestPayload.include_models = include_models !== undefined ? include_models : true;
      requestPayload.include_prices = include_prices !== undefined ? include_prices : true;
      requestPayload.include_features = include_features !== undefined ? include_features : true;
      requestPayload.include_specifications = true; // Always include specifications
      requestPayload.include_reviews = include_reviews !== undefined ? include_reviews : true;
      requestPayload.include_pros_cons = include_pros_cons !== undefined ? include_pros_cons : true;
      
      // Content structure options
      requestPayload.content_structure = {
        include_product_table: include_product_table !== undefined ? include_product_table : true,
        include_comparison_section: include_comparison_section !== undefined ? include_comparison_section : true,
        include_buying_guide: include_buying_guide !== undefined ? include_buying_guide : true,
        include_faq_section: include_faq_section !== undefined ? include_faq_section : true
      };
    }
    
    // Add brand voice settings if available
    if (brandVoice) {
      requestPayload.brand_voice = {
        tone: brandVoice.tone,
        style_guidelines: brandVoice.style_guidelines,
        vocabulary: brandVoice.vocabulary,
        industry_terms: brandVoice.industry_specific_terms,
        examples: brandVoice.examples
      };
    }
    
    // Add content preset settings if available
    if (contentPreset) {
      if (contentPreset.content_format) {
        requestPayload.content_format = contentPreset.content_format;
      }
      if (contentPreset.quality_level && !quality_level) {
        requestPayload.quality_level = contentPreset.quality_level;
      } else if (quality_level) {
        requestPayload.quality_level = quality_level;
      }
      if (contentPreset.preset_config) {
        Object.assign(requestPayload, contentPreset.preset_config);
      }
    } else if (quality_level) {
      requestPayload.quality_level = quality_level;
    }
    
    // Add preset string if provided (legacy support)
    if (preset) {
      requestPayload.preset = preset;
    }
    
    // Add external links parameters if provided
    if (include_external_links !== undefined) {
      requestPayload.include_external_links = include_external_links;
    }
    if (include_backlinks !== undefined) {
      requestPayload.include_backlinks = include_backlinks;
    }
    if (backlink_count !== undefined) {
      requestPayload.backlink_count = backlink_count;
    }
    
    console.log('📤 Request payload:', JSON.stringify(requestPayload, null, 2));
    const systemPromptForLog = typeof requestPayload.system_prompt === 'string' ? requestPayload.system_prompt : '';
    console.log('📤 Key parameters being sent:', {
      topic: requestPayload.topic,
      keywords: requestPayload.keywords,
      target_audience: requestPayload.target_audience,
      tone: requestPayload.tone,
      word_count: requestPayload.word_count,
      quality_level: requestPayload.quality_level,
      endpoint: endpoint,
      has_custom_instructions: !!requestPayload.custom_instructions,
      has_enhanced_insights: !!requestPayload.enhanced_keyword_insights,
      has_content_goal: !!requestPayload.content_goal,
      system_prompt_length: systemPromptForLog.length,
    });
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
      },
      body: JSON.stringify(requestPayload),
    });
    
    console.log('📥 External API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ External API error:', response.status, errorText);
      
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
        } catch (error) {
          console.warn('⚠️ Failed to update queue entry with error:', error);
        }
      }
      
      return NextResponse.json(
        { error: `External API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    console.log('✅ Blog generated successfully from external API');
    console.log('📄 Full API response structure:', {
      hasContent: !!result.content,
      hasTitle: !!result.title,
      hasExcerpt: !!result.excerpt,
      hasBlogPost: !!result.blog_post,
      keys: Object.keys(result),
      contentPreview: result.content?.substring(0, 200) || result.blog_post?.content?.substring(0, 200) || 'No content',
      contentLength: result.content?.length || result.blog_post?.content?.length || 0,
    });
    console.log('📄 Raw API response (first 500 chars):', JSON.stringify(result).substring(0, 500));
    
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
        
        console.log('✅ Queue entry updated with progress:', {
          queue_id: queueId,
          progress: progressPercentage,
          stage: currentStage,
          updates_count: progressUpdates.length
        });
      } catch (error) {
        console.warn('⚠️ Failed to update queue entry:', error);
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
      console.log('📊 Progress updates received:', {
        count: progressUpdates.length,
        latestProgress: progressUpdates.length > 0 
          ? progressUpdates[progressUpdates.length - 1].progress_percentage 
          : 0,
        latestStatus: progressUpdates.length > 0 
          ? progressUpdates[progressUpdates.length - 1].status 
          : 'No progress data'
      });
    }
    
    // Extract content for processing
    const rawContent = result.blog_post?.content || result.blog_post?.body || result.content || '';
    const blogTitle = result.blog_post?.title || result.title || topic;
    
    // Generate featured image (non-blocking, but wait for it)
    let featuredImage: GeneratedImage | null = null;
    const sectionImages: Array<{ position: number; image: GeneratedImage }> = [];
    try {
      console.log('🖼️ Starting featured image generation...');
      const imageKeywords = Array.isArray(keywords) ? keywords : [];
      const imageTopic = topic || result.title || result.blog_post?.title || 'blog post';
      
      // Generate image with timeout (don't block blog generation if it takes too long)
      featuredImage = await Promise.race([
        imageGenerator.generateFeaturedImage(
          imageTopic,
          imageKeywords,
          {
            style: 'photographic',
            quality: 'high',
            aspect_ratio: '16:9'
          }
        ),
        new Promise<null>((resolve) => 
          setTimeout(() => {
            console.warn('⏱️ Image generation timeout - continuing without image');
            resolve(null);
          }, 30000) // 30 second timeout
        )
      ]);
      
      if (featuredImage) {
        console.log('✅ Featured image generated successfully:', {
          imageId: featuredImage.image_id,
          width: featuredImage.width,
          height: featuredImage.height,
          hasUrl: !!featuredImage.image_url,
          imageUrl: featuredImage.image_url?.substring(0, 100) || 'No URL'
        });
      } else {
        console.error('❌ Featured image generation failed or returned null');
        console.error('   Topic:', imageTopic);
        console.error('   Keywords:', imageKeywords);
        console.error('   This may indicate:');
        console.error('   1. Stability AI API not configured');
        console.error('   2. Image generation endpoint not working');
        console.error('   3. Timeout (30 seconds exceeded)');
        console.error('   4. API returned error');
      }

      // Upload to Cloudinary if org has credentials configured
      if (featuredImage) {
        try {
          const imageFileName = `blog-featured-${Date.now()}.${featuredImage.format || 'png'}`;
          const folder = `blog-images/${orgId}`;
          
          console.log('☁️ Uploading featured image to Cloudinary...');
          const cloudinaryResult = await uploadViaBlogWriterAPI(
            featuredImage.image_url || '',
            featuredImage.image_data || null,
            orgId,
            imageFileName,
            folder
          );

          if (cloudinaryResult) {
            console.log('✅ Featured image uploaded to Cloudinary:', {
              publicId: cloudinaryResult.public_id,
              secureUrl: cloudinaryResult.secure_url
            });

            // Save to media_assets table
            const assetId = await saveMediaAsset(
              orgId,
              userId || null,
              cloudinaryResult,
              imageFileName,
              {
                source: 'ai_generated',
                blog_topic: imageTopic,
                keywords: imageKeywords,
                original_image_id: featuredImage.image_id,
                quality_score: featuredImage.quality_score,
                safety_score: featuredImage.safety_score,
                image_type: 'featured'
              }
            );

            if (assetId) {
              console.log('✅ Featured image saved to media_assets:', assetId);
              // Update featuredImage to use Cloudinary URL
              featuredImage.image_url = cloudinaryResult.secure_url;
              featuredImage.image_data = undefined;
            } else {
              console.warn('⚠️ Featured image uploaded to Cloudinary but failed to save to database');
            }
          }
        } catch (uploadError) {
          console.warn('⚠️ Cloudinary upload error (non-critical):', uploadError);
        }
      }

      // Generate section images for better visual engagement
      try {
        console.log('🖼️ Generating section images...');
        const sections = extractSections(rawContent);
        const imageKeywords = Array.isArray(keywords) ? keywords : [];
        
        // Generate images for every other section (to avoid too many images)
        for (let i = 0; i < sections.length; i += 2) {
          if (i >= 4) break; // Limit to 4 section images max
          
          const section = sections[i];
          const sectionPrompt = `Professional blog image illustrating: ${section.title}, ${imageTopic}`;
          
          try {
            const sectionImage = await imageGenerator.generateImage({
              prompt: sectionPrompt,
              style: 'photographic',
              aspect_ratio: '16:9',
              quality: 'high',
              width: 1920,
              height: 1080,
              negative_prompt: 'blurry, low quality, watermark, text overlay'
            });

            if (sectionImage.success && sectionImage.images.length > 0) {
              const img = sectionImage.images[0];
              
              // Upload to Cloudinary
              const imageFileName = `blog-section-${i}-${Date.now()}.${img.format || 'png'}`;
              const folder = `blog-images/${orgId}`;
              
              const cloudinaryResult = await uploadViaBlogWriterAPI(
                img.image_url || '',
                img.image_data || null,
                orgId,
                imageFileName,
                folder
              );

              if (cloudinaryResult) {
                img.image_url = cloudinaryResult.secure_url;
                img.image_data = undefined;
                
                // Save to media_assets
                const sectionAssetId = await saveMediaAsset(
                  orgId,
                  userId || null,
                  cloudinaryResult,
                  imageFileName,
                  {
                    source: 'ai_generated',
                    blog_topic: imageTopic,
                    section_title: section.title,
                    original_image_id: img.image_id,
                    image_type: 'section'
                  }
                );

                if (sectionAssetId) {
                  console.log(`✅ Section image ${i + 1} saved to media_assets:`, sectionAssetId);
                } else {
                  console.warn(`⚠️ Section image ${i + 1} uploaded to Cloudinary but failed to save to database`);
                }

                sectionImages.push({
                  position: section.wordPosition,
                  image: img
                });
                
                console.log(`✅ Section image ${i + 1} generated and uploaded`);
              }
            }
          } catch (sectionImageError) {
            console.warn(`⚠️ Failed to generate section image ${i + 1}:`, sectionImageError);
            // Continue with other sections
          }
        }
      } catch (error) {
        console.warn('⚠️ Section image generation failed (non-critical):', error);
      }
    } catch (error) {
      // Log detailed error information
      const errorDetails = error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : { error: String(error) };
      
      const imageTopic = topic || result.title || result.blog_post?.title || 'blog post';
      const imageKeywords = Array.isArray(keywords) ? keywords : [];
      
      console.error('❌ Image generation failed:', {
        ...errorDetails,
        topic: imageTopic,
        keywords: imageKeywords,
        timestamp: new Date().toISOString()
      });
      
      // Don't fail blog generation, but log the error for debugging
      console.warn('⚠️ Continuing blog generation without images');
    }
    
    // Enhance content to rich HTML with images embedded
    console.log('✨ Enhancing content to rich HTML...');
    const enhancedContent = enhanceContentToRichHTML(rawContent, {
      featuredImage,
      sectionImages,
      includeImages: true,
      enhanceFormatting: true,
      addStructure: true
    });
    
    console.log('📊 Content enhancement:', {
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
        console.log('✅ Latest progress:', {
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
    
    console.log('📄 Transformed result:', {
      contentLength: transformedResult.content.length,
      title: transformedResult.title,
      excerpt: transformedResult.excerpt,
      wordCount: transformedResult.word_count,
      seoScore: transformedResult.seo_score,
      enhanced: shouldUseEnhanced,
      productResearchRequested: requiresProductResearch,
      imageGenerated: !!featuredImage,
      sectionImagesCount: sectionImages.length,
      progressUpdatesCount: transformedResult.progress_updates.length,
      hasProgressUpdates: transformedResult.progress_updates.length > 0
    });
    
    // Update queue entry with final results if queue exists
    if (queueId && transformedResult) {
      try {
        const rawContent = result.blog_post?.content || result.content || transformedResult.content || '';
        await supabase
          .from('blog_generation_queue')
          .update({
            generated_content: rawContent,
            generated_title: transformedResult.title,
            generation_metadata: {
              ...transformedResult.metadata,
              seo_score: transformedResult.seo_score,
              readability_score: transformedResult.readability_score,
              quality_score: transformedResult.quality_score,
              word_count: transformedResult.word_count,
              total_cost: transformedResult.total_cost,
              generation_time: transformedResult.generation_time
            }
          })
          .eq('queue_id', queueId);
        
        console.log('✅ Queue entry updated with generated content');
      } catch (error) {
        console.warn('⚠️ Failed to update queue entry with content:', error);
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
      console.error('❌ API returned unsuccessful result:', {
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
          console.warn('⚠️ Failed to update queue entry with error:', error);
        }
      }
      
      return NextResponse.json(
        { error: result.error_message || result.error || 'Blog generation failed' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Error in blog generation API:', error);
    
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
      } catch (updateError) {
        console.warn('⚠️ Failed to update queue entry with error:', updateError);
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
