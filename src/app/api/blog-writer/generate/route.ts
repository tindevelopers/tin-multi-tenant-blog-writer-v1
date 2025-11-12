import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import cloudRunHealth from '@/lib/cloud-run-health';

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
      use_enhanced = false
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
      return NextResponse.json(
        { error: `Cloud Run is not healthy: ${healthStatus.error}` },
        { status: 503 }
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
    
    // Build request payload with optional external links parameters
    const requestPayload: Record<string, unknown> = {
      topic,
      keywords: keywords || [],
      target_audience: target_audience || brandVoice?.target_audience || 'general',
      tone: tone || brandVoice?.tone || 'professional',
      word_count: word_count || contentPreset?.word_count || 1000
    };
    
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
    
    // Transform the response to match our expected format
    if (result.success && result.blog_post) {
      const transformedResult = {
        content: result.blog_post.content || result.blog_post.body || '',
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
        metadata: {
          used_brand_voice: !!brandVoice,
          used_preset: !!contentPreset,
          endpoint_used: endpoint,
          enhanced: shouldUseEnhanced
        }
      };
      
      console.log('📄 Transformed result:', {
        contentLength: transformedResult.content.length,
        title: transformedResult.title,
        excerpt: transformedResult.excerpt,
        wordCount: transformedResult.word_count,
        seoScore: transformedResult.seo_score,
        enhanced: shouldUseEnhanced
      });
      
      return NextResponse.json(transformedResult);
    } else if (result.content || result.title) {
      // Handle non-standard response format
      const transformedResult = {
        content: result.content || result.blog_post?.content || result.blog_post?.body || '',
        title: result.title || result.blog_post?.title || '',
        excerpt: result.excerpt || result.summary || result.blog_post?.excerpt || '',
        word_count: result.word_count || 0,
        seo_score: result.seo_score || 0,
        readability_score: result.readability_score || 0,
        warnings: result.warnings || [],
        suggestions: result.suggestions || [],
        metadata: {
          used_brand_voice: !!brandVoice,
          used_preset: !!contentPreset,
          endpoint_used: endpoint,
          enhanced: shouldUseEnhanced
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
