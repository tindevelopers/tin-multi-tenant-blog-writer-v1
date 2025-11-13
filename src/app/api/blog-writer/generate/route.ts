import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import cloudRunHealth from '@/lib/cloud-run-health';
import BlogImageGenerator, { type GeneratedImage } from '@/lib/image-generation';
import { uploadViaBlogWriterAPI, saveMediaAsset } from '@/lib/cloudinary-upload';
import { enhanceContentToRichHTML, extractSections } from '@/lib/content-enhancer';

// Create server-side image generator (uses direct Cloud Run URL)
const imageGenerator = new BlogImageGenerator(
  process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west1.run.app',
  process.env.BLOG_WRITER_API_KEY || '',
  false // Don't use local route on server-side
);

export async function POST(request: NextRequest) {
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
      content_goal // Content goal from workflow (seo, engagement, conversions, brand_awareness)
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
    
    // Get authenticated user and org
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let orgId: string;
    let userId: string;
    
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
    
    // Fetch brand voice settings for the organization
    let brandVoice: any = null;
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
    let contentPreset: any = null;
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
    
    console.log('🌐 Calling external API:', `${API_BASE_URL}/api/v1/blog/generate`);
    console.log('🔑 API Key present:', !!API_KEY);
    
    // Determine which endpoint to use
    const shouldUseEnhanced = use_enhanced || 
      quality_level === 'premium' || 
      quality_level === 'enterprise' ||
      (contentPreset && contentPreset.quality_level === 'premium');
    
    const endpoint = shouldUseEnhanced 
      ? '/api/v1/blog/generate-enhanced'
      : '/api/v1/blog/generate';
    
    console.log('🌐 Using endpoint:', endpoint, shouldUseEnhanced ? '(Enhanced)' : '(Standard)');
    
    // Detect if topic requires product research (best, top, review, recommendation keywords)
    const keywordsArray = Array.isArray(keywords) ? keywords : (keywords ? [keywords] : []);
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
    
    // Add content goal prompt if available
    if (contentGoalPrompt?.system_prompt) {
      requestPayload.system_prompt = contentGoalPrompt.system_prompt;
      requestPayload.content_goal = content_goal;
      console.log('📝 Adding content goal prompt to API request:', {
        content_goal,
        prompt_length: contentGoalPrompt.system_prompt.length,
        has_user_template: !!contentGoalPrompt.user_prompt_template
      });
      
      // Add user prompt template if available
      if (contentGoalPrompt.user_prompt_template) {
        requestPayload.user_prompt_template = contentGoalPrompt.user_prompt_template;
      }
      
      // Add additional instructions if available
      if (contentGoalPrompt.instructions && Object.keys(contentGoalPrompt.instructions).length > 0) {
        requestPayload.additional_instructions = contentGoalPrompt.instructions;
      }
    }
    
    // Add web research and product research parameters if needed
    if (requiresProductResearch) {
      console.log('📊 Adding product research parameters...');
      requestPayload.include_web_research = true;
      requestPayload.research_depth = 'comprehensive';
      requestPayload.include_product_research = true;
      requestPayload.include_brands = true;
      requestPayload.include_models = true;
      requestPayload.include_prices = true;
      requestPayload.include_features = true;
      requestPayload.include_specifications = true;
      requestPayload.include_reviews = true;
      requestPayload.include_pros_cons = true;
      requestPayload.content_structure = {
        include_product_table: true,
        include_comparison_section: true,
        include_buying_guide: true,
        include_faq_section: true
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
    
    console.log('📤 Request payload:', requestPayload);
    
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
      contentPreview: result.content?.substring(0, 100) || 'No content'
    });
    
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
                await saveMediaAsset(
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
    if (result.success && result.blog_post) {
      const transformedResult = {
        content: enhancedContent, // Use enhanced rich HTML content
        title: result.blog_post.title || '',
        excerpt: result.blog_post.excerpt || result.blog_post.summary || '',
        word_count: result.word_count || 0,
        seo_score: result.seo_score || 0,
        readability_score: result.readability_score || 0,
        warnings: result.warnings || [],
        suggestions: result.suggestions || [],
        // Enhanced endpoint may return additional fields
        quality_scores: result.quality_scores || null,
        semantic_keywords: result.semantic_keywords || null,
        knowledge_graph: result.knowledge_graph || null,
        // Include generated featured image if available
        featured_image: featuredImage ? {
          image_id: featuredImage.image_id,
          image_url: featuredImage.image_url,
          image_data: featuredImage.image_data,
          width: featuredImage.width,
          height: featuredImage.height,
          format: featuredImage.format,
          alt_text: featuredImage.alt_text || `Featured image for ${result.blog_post.title || topic}`,
          quality_score: featuredImage.quality_score,
          safety_score: featuredImage.safety_score
        } : null,
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
          web_research_requested: requiresProductResearch
        },
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
      
      console.log('📄 Transformed result:', {
        contentLength: transformedResult.content.length,
        title: transformedResult.title,
        excerpt: transformedResult.excerpt,
        wordCount: transformedResult.word_count,
        seoScore: transformedResult.seo_score,
        enhanced: shouldUseEnhanced,
        productResearchRequested: requiresProductResearch,
        imageGenerated: !!featuredImage,
        sectionImagesCount: sectionImages.length
      });
      
      return NextResponse.json(transformedResult);
    } else if (result.content || result.title) {
      // Handle non-standard response format
      const transformedResult = {
        content: enhancedContent, // Use enhanced rich HTML content
        title: result.title || result.blog_post?.title || '',
        excerpt: result.excerpt || result.summary || result.blog_post?.excerpt || '',
        word_count: result.word_count || 0,
        seo_score: result.seo_score || 0,
        readability_score: result.readability_score || 0,
        warnings: result.warnings || [],
        suggestions: result.suggestions || [],
        // Include generated featured image if available
        featured_image: featuredImage ? {
          image_id: featuredImage.image_id,
          image_url: featuredImage.image_url,
          image_data: featuredImage.image_data,
          width: featuredImage.width,
          height: featuredImage.height,
          format: featuredImage.format,
          alt_text: featuredImage.alt_text || `Featured image for ${result.title || topic}`,
          quality_score: featuredImage.quality_score,
          safety_score: featuredImage.safety_score
        } : null,
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
          web_research_requested: requiresProductResearch
        },
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
      
      return NextResponse.json(transformedResult);
    } else {
      console.error('❌ API returned unsuccessful result:', {
        success: result.success,
        errorMessage: result.error_message || result.error,
        errorCode: result.error_code,
        keys: Object.keys(result)
      });
      return NextResponse.json(
        { error: result.error_message || result.error || 'Blog generation failed' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Error in blog generation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
