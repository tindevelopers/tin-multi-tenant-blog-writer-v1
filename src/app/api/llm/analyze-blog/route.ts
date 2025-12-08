/**
 * API Route: LLM Blog Analysis
 * 
 * POST /api/llm/analyze-blog
 * 
 * Proxies to backend Blog Writer API endpoint which handles OpenAI requests internally
 * No frontend OpenAI credentials required - backend handles all LLM operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { handleApiError } from '@/lib/api-utils';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      content,
      images = [],
      existingFields = {},
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    logger.debug('LLM blog analysis request - proxying to backend', {
      userId: user.id,
      title,
      contentLength: content.length,
      imageCount: images.length,
    });

    // Proxy to backend Blog Writer API endpoint
    // Backend handles OpenAI requests internally - no frontend credentials needed
    const backendEndpoint = `${BLOG_WRITER_API_URL}/api/v1/content/enhance-fields`;
    
    // Extract featured image URL if available
    const featuredImageUrl = images.find((img: { type?: string }) => img.type === 'featured')?.url 
      || images[0]?.url 
      || existingFields.featuredImage;

    try {
      const backendResponse = await fetch(backendEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          featured_image_url: featuredImageUrl,
          enhance_seo_title: true,
          enhance_meta_description: true,
          enhance_slug: true,
          enhance_image_alt: !!featuredImageUrl,
        }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json().catch(() => ({ detail: backendResponse.statusText }));
        const errorMessage = errorData.detail || `HTTP ${backendResponse.status}: ${backendResponse.statusText}`;
        
        logger.warn('Backend LLM analysis unavailable, using fallback', {
          status: backendResponse.status,
          error: errorMessage,
          userId: user.id,
        });
        
        // Return fallback analysis if backend is unavailable
        return NextResponse.json({
          success: true,
          fallback: true,
          message: 'Backend LLM analysis unavailable. Using basic extraction.',
          data: {
            seoTitle: title.substring(0, 60),
            metaDescription: content.substring(0, 160),
            excerpt: content.substring(0, 200),
            slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            imageDescriptions: images.map((img: { url: string }) => ({
              url: img.url,
              altText: 'Blog image',
              description: 'Blog image',
            })),
            suggestions: {
              missingFields: [],
              recommendations: [],
              improvements: [],
            },
            estimatedReadTime: Math.ceil(content.split(/\s+/).length / 200),
            wordCount: content.split(/\s+/).length,
            keywords: [],
            topics: [],
          },
        });
      }

      const backendData = await backendResponse.json();
      
      // Transform backend response to match frontend expected format
      const analysis = {
        seoTitle: backendData.enhanced_fields?.seo_title || title.substring(0, 60),
        metaDescription: backendData.enhanced_fields?.meta_description || content.substring(0, 160),
        excerpt: existingFields.excerpt || content.substring(0, 200),
        slug: backendData.enhanced_fields?.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        imageDescriptions: images.map((img: { url: string }) => ({
          url: img.url,
          altText: img.url === featuredImageUrl 
            ? (backendData.enhanced_fields?.featured_image_alt || 'Blog image')
            : 'Blog image',
          description: 'Blog image',
        })),
        suggestions: {
          missingFields: [],
          recommendations: [],
          improvements: [],
        },
        estimatedReadTime: Math.ceil(content.split(/\s+/).length / 200),
        wordCount: content.split(/\s+/).length,
        keywords: [],
        topics: [],
      };

      logger.debug('Backend LLM analysis completed', {
        userId: user.id,
        seoTitle: analysis.seoTitle,
        provider: backendData.provider,
        model: backendData.model,
      });

      return NextResponse.json({
        success: true,
        fallback: false,
        data: analysis,
      });
    } catch (backendError: any) {
      logger.error('Backend LLM analysis error', {
        error: backendError.message,
        userId: user.id,
      });
      
      // Return fallback on error
      return NextResponse.json({
        success: true,
        fallback: true,
        message: `Backend LLM analysis failed: ${backendError.message}. Using basic extraction.`,
        data: {
          seoTitle: title.substring(0, 60),
          metaDescription: content.substring(0, 160),
          excerpt: content.substring(0, 200),
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          imageDescriptions: images.map((img: { url: string }) => ({
            url: img.url,
            altText: 'Blog image',
            description: 'Blog image',
          })),
          suggestions: {
            missingFields: [],
            recommendations: [],
            improvements: [],
          },
          estimatedReadTime: Math.ceil(content.split(/\s+/).length / 200),
          wordCount: content.split(/\s+/).length,
          keywords: [],
          topics: [],
        },
      });
    }
  } catch (error) {
    logger.error('Error in LLM analyze-blog route', { error });
    return handleApiError(error);
  }
}

