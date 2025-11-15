import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { Database } from '@/types/database';
import { logger } from '@/utils/logger';
import { parseJsonBody, validateRequiredFields, handleApiError } from '@/lib/api-utils';

type BlogPostInsert = Database['public']['Tables']['blog_posts']['Insert'];

export async function POST(request: NextRequest) {
  try {
    logger.debug('API route /api/drafts/save called');
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
    }>(request);
    logger.debug('Request body received', { 
      title: body.title, 
      contentLength: body.content?.length, 
      excerpt: body.excerpt,
      status: body.status 
    });
    
    validateRequiredFields(body, ['title', 'content']);
    
    const { title, content, excerpt, status = 'draft', seo_data, metadata, featured_image } = body;

    logger.debug('Saving draft', { title, contentLength: content.length });

    // Extract featured image from content if not provided
    let featuredImageUrl = featured_image?.image_url || null;
    if (!featuredImageUrl && content) {
      // Try to extract from content HTML
      const imageMatch = String(content).match(/<figure[^>]*class="[^"]*featured[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>/i) ||
                       String(content).match(/<img[^>]+class="[^"]*featured[^"]*"[^>]+src="([^"]+)"[^>]*>/i);
      if (imageMatch) {
        featuredImageUrl = imageMatch[1];
        logger.debug('Extracted featured image from content', { imageUrl: featuredImageUrl });
      }
    }

    // Build metadata object
    const finalMetadata: Record<string, unknown> = {
      ...(metadata || {}),
      ...(featuredImageUrl ? { featured_image: featuredImageUrl } : {}),
      ...(featured_image ? { 
        featured_image_data: {
          image_id: featured_image.image_id,
          image_url: featured_image.image_url,
          alt_text: featured_image.alt_text,
          width: featured_image.width,
          height: featured_image.height
        }
      } : {})
    };

    // Use service client for server-side operations
    const supabase = createServiceClient();
    
    // Use default system values
    const orgId = '00000000-0000-0000-0000-000000000001';
    const userId = '00000000-0000-0000-0000-000000000002';
    logger.debug('Using system defaults', { orgId, userId });

    const draftData: BlogPostInsert = {
      org_id: orgId,
      // created_by: userId, // Leave null for system-created posts
      title,
      content,
      excerpt: excerpt || '',
      status: status as 'draft' | 'published' | 'scheduled' | 'archived',
      seo_data: (seo_data || {}) as Database['public']['Tables']['blog_posts']['Row']['seo_data'],
      metadata: finalMetadata as Database['public']['Tables']['blog_posts']['Row']['metadata'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    logger.debug('Inserting draft data', {
      title: draftData.title,
      contentLength: draftData.content?.length || 0,
      orgId: draftData.org_id,
    });

    const { data, error } = await supabase
      .from('blog_posts')
      .insert(draftData)
      .select()
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

    logger.debug('Draft saved successfully', { postId: data?.id });
    return NextResponse.json({ success: true, data });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'drafts-save',
    });
    return handleApiError(error);
  }
}
