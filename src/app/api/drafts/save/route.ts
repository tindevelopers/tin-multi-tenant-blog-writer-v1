import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import { logger } from '@/utils/logger';
import { parseJsonBody, validateRequiredFields, handleApiError } from '@/lib/api-utils';
import { generateSlug, calculateReadTime, validateBlogFields } from '@/lib/blog-field-validator';

type BlogPostInsert = Database['public']['Tables']['blog_posts']['Insert'];

export async function POST(request: NextRequest) {
  try {
    logger.debug('API route /api/drafts/save called');
    
    // Authenticate user and get their org_id
    const supabase = await createClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's org_id
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();
    
    if (!userProfile?.org_id) {
      logger.warn('User profile not found, using default org_id');
      // Fallback to default org if user profile not found
    }
    const body = await parseJsonBody<{
      title: string;
      content: string;
      excerpt?: string;
      status?: string;
      seo_data?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      featured_image?: {
        image_id?: string;
        image_url?: string;
        alt_text?: string;
        width?: number;
        height?: number;
      };
      // Additional fields for complete blog creation
      slug?: string;
      author_name?: string;
      author_image?: string;
      author_bio?: string;
      thumbnail_image?: string;
      thumbnail_image_alt?: string;
      locale?: string;
      is_featured?: boolean;
      word_count?: number;
      published_at?: string;
    }>(request);
    logger.debug('Request body received', { 
      title: body.title, 
      contentLength: body.content?.length, 
      excerpt: body.excerpt,
      status: body.status 
    });
    
    validateRequiredFields(body, ['title', 'content']);
    
    const { 
      title, 
      content, 
      excerpt, 
      status = 'draft', 
      seo_data, 
      metadata, 
      featured_image,
      slug,
      author_name,
      author_image,
      author_bio,
      thumbnail_image,
      thumbnail_image_alt,
      locale,
      is_featured,
      word_count,
      published_at,
    } = body;

    logger.debug('Saving draft', { title, contentLength: content.length });

    // Extract featured image from content if not provided
    let featuredImageUrl = featured_image?.image_url || null;
    let featuredImageAlt = featured_image?.alt_text || null;
    if (!featuredImageUrl && content) {
      // Try to extract from content HTML
      const imageMatch = String(content).match(/<figure[^>]*class="[^"]*featured[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>/i) ||
                       String(content).match(/<img[^>]+class="[^"]*featured[^"]*"[^>]+src="([^"]+)"[^>]*>/i);
      if (imageMatch) {
        featuredImageUrl = imageMatch[1];
        logger.debug('Extracted featured image from content', { imageUrl: featuredImageUrl });
      }
    }

    // Generate slug if not provided
    const finalSlug = slug || generateSlug(title);

    // Calculate read_time from word_count if available
    const readTime = word_count ? calculateReadTime(word_count) : null;

    // Build comprehensive metadata object with all fields
    const finalMetadata: Record<string, unknown> = {
      ...(metadata || {}),
      // Slug
      slug: finalSlug,
      // Images
      ...(featuredImageUrl ? { featured_image: featuredImageUrl } : {}),
      ...(featured_image ? { 
        featured_image_data: {
          image_id: featured_image.image_id,
          image_url: featured_image.image_url,
          alt_text: featured_image.alt_text,
          width: featured_image.width,
          height: featured_image.height
        }
      } : {}),
      ...(featuredImageAlt ? { featured_image_alt: featuredImageAlt } : {}),
      ...(thumbnail_image ? { thumbnail_image } : {}),
      ...(thumbnail_image_alt ? { thumbnail_image_alt } : {}),
      // Author fields
      ...(author_name ? { author_name } : {}),
      ...(author_image ? { author_image } : {}),
      ...(author_bio ? { author_bio } : {}),
      // Publishing fields
      ...(locale ? { locale } : { locale: 'en' }), // Default to 'en'
      ...(is_featured !== undefined ? { is_featured } : {}),
      ...(readTime ? { read_time: readTime } : {}),
      ...(word_count ? { word_count } : {}),
      ...(published_at ? { published_at } : {}),
    };

    // Build comprehensive SEO data
    const finalSeoData: Record<string, unknown> = {
      ...(seo_data || {}),
      // Ensure meta_title and meta_description are set
      ...(seo_data?.meta_title ? {} : { meta_title: title }), // Default to title if not set
      ...(seo_data?.meta_description ? {} : excerpt ? { meta_description: excerpt } : {}),
    };

    // Validate fields before saving
    const validation = validateBlogFields({
      title,
      content,
      excerpt,
      slug: finalSlug,
      featured_image: featuredImageUrl || undefined,
      featured_image_alt: featuredImageAlt || undefined,
      thumbnail_image: thumbnail_image || undefined,
      thumbnail_image_alt: thumbnail_image_alt || undefined,
      author_name: author_name || undefined,
      author_image: author_image || undefined,
      meta_description: finalSeoData.meta_description as string | undefined,
      locale: locale || 'en',
      word_count: word_count || undefined,
      read_time: readTime || undefined,
    });

    if (!validation.isValid) {
      logger.warn('Blog field validation failed', {
        missingRequired: validation.missingRequired,
        missingRecommended: validation.missingRecommended,
        warnings: validation.warnings,
      });
      // Don't fail, but log warnings
    } else {
      logger.debug('Blog field validation passed', {
        warnings: validation.warnings,
      });
    }

    // Use authenticated user's org_id
    const orgId = userProfile?.org_id || '00000000-0000-0000-0000-000000000001';
    logger.debug('Using org_id', { orgId, userId: user.id });

    const draftData: BlogPostInsert = {
      org_id: orgId,
      created_by: user.id, // Use authenticated user's ID
      title,
      content,
      excerpt: excerpt || '',
      status: status as 'draft' | 'published' | 'scheduled' | 'archived',
      seo_data: finalSeoData as Database['public']['Tables']['blog_posts']['Row']['seo_data'],
      metadata: finalMetadata as Database['public']['Tables']['blog_posts']['Row']['metadata'],
      published_at: published_at || (status === 'published' ? new Date().toISOString() : null),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    logger.debug('Inserting draft data', {
      title: draftData.title,
      contentLength: draftData.content?.length || 0,
      orgId: draftData.org_id,
      created_by: draftData.created_by,
    });

    const { data, error } = await supabase
      .from('blog_posts')
      .insert(draftData)
      .select('post_id, title, content, excerpt, status, org_id, created_at, updated_at')
      .single();

    if (error) {
      logger.error('Database error saving draft', {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        { error: 'Failed to save draft', details: error.message },
        { status: 500 }
      );
    }

    logger.debug('Draft saved successfully', { postId: data?.post_id });
    return NextResponse.json({ 
      success: true, 
      data: {
        ...data,
        post_id: data?.post_id, // Ensure post_id is explicitly included
      }
    });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'drafts-save',
    });
    return handleApiError(error);
  }
}
