import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';

/**
 * POST /api/v1/publishing/publish
 * 
 * Publishes a blog post to a CMS platform.
 * 
 * Request body:
 * {
 *   blog_id: string;           // The blog post ID (post_id)
 *   cms_provider?: string;     // Platform: 'webflow' | 'wordpress' | 'shopify'
 *   site_id?: string;          // Site ID for the platform
 *   collection_id?: string;    // Collection ID (for Webflow)
 *   publish?: boolean;         // Whether to publish immediately (default: true)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's org_id and role
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check permissions
    const allowedRoles = ['admin', 'manager', 'editor', 'system_admin', 'super_admin'];
    if (!userProfile.role || !allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { blog_id, cms_provider, site_id, collection_id, publish = true } = body;

    if (!blog_id) {
      return NextResponse.json(
        { error: 'blog_id is required' },
        { status: 400 }
      );
    }

    // Validate platform
    const platform = cms_provider || 'webflow';
    if (!['webflow', 'wordpress', 'shopify'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid cms_provider. Must be webflow, wordpress, or shopify' },
        { status: 400 }
      );
    }

    // Verify blog post exists and belongs to org
    const { data: blogPost, error: postError } = await supabase
      .from('blog_posts')
      .select('post_id, title, status, org_id')
      .eq('post_id', blog_id)
      .eq('org_id', userProfile.org_id)
      .single();

    if (postError || !blogPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Check if publishing record already exists
    const { data: existingPublishing } = await supabase
      .from('blog_platform_publishing')
      .select('publishing_id, status')
      .eq('post_id', blog_id)
      .eq('platform', platform)
      .eq('org_id', userProfile.org_id)
      .single();

    let publishingId: string;

    if (existingPublishing) {
      // Use existing publishing record, but update metadata if provided
      publishingId = existingPublishing.publishing_id;
      
      // Update publish_metadata if site_id or collection_id are provided
      if (site_id || collection_id) {
        const { data: currentPublishing } = await supabase
          .from('blog_platform_publishing')
          .select('publish_metadata')
          .eq('publishing_id', publishingId)
          .single();
        
        const currentMetadata = (currentPublishing?.publish_metadata as Record<string, unknown>) || {};
        const updatedMetadata = {
          ...currentMetadata,
          ...(site_id && { site_id }),
          ...(collection_id && { collection_id }),
        };
        
        await supabase
          .from('blog_platform_publishing')
          .update({ publish_metadata: updatedMetadata })
          .eq('publishing_id', publishingId);
      }
      
      logger.debug('Using existing publishing record', { publishingId });
    } else {
      // Create new publishing record
      const { data: newPublishing, error: createError } = await supabase
        .from('blog_platform_publishing')
        .insert({
          org_id: userProfile.org_id,
          post_id: blog_id,
          platform,
          status: publish ? 'pending' : 'draft',
          published_by: user.id,
          is_draft: !publish,
          sync_status: 'never_synced',
          retry_count: 0,
          publish_metadata: {
            site_id,
            collection_id,
          },
        })
        .select('publishing_id')
        .single();

      if (createError || !newPublishing) {
        logger.error('Failed to create publishing record', { error: createError });
        return NextResponse.json(
          { error: 'Failed to create publishing record', detail: createError?.message },
          { status: 500 }
        );
      }

      publishingId = newPublishing.publishing_id;
      logger.debug('Created new publishing record', { publishingId });
    }

    // If publish is true, trigger the publish endpoint
    if (publish) {
      try {
        // Construct the internal publish endpoint URL
        const baseUrl = request.nextUrl.origin;
        const publishUrl = `${baseUrl}/api/blog-publishing/${publishingId}/publish`;

        const publishResponse = await fetch(publishUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: request.headers.get('Cookie') || '',
          },
          body: JSON.stringify({
            is_draft: false,
          }),
        });

        if (!publishResponse.ok) {
          const errorData = await publishResponse.json().catch(() => ({}));
          logger.error('Publish endpoint failed', {
            status: publishResponse.status,
            error: errorData,
          });

          // Return error but include publishing_id for tracking
          return NextResponse.json(
            {
              success: false,
              cms_provider: platform,
              site_id: site_id || '',
              collection_id: collection_id || undefined,
              error_message: errorData.error || errorData.detail || 'Failed to publish',
              publishing_id: publishingId,
            },
            { status: publishResponse.status }
          );
        }

        const publishResult = await publishResponse.json();

        // Return success response
        return NextResponse.json({
          success: true,
          cms_provider: platform,
          site_id: site_id || '',
          collection_id: collection_id || undefined,
          published_url: publishResult.result?.publishedUrl || publishResult.published_url,
          remote_id: publishResult.result?.itemId || publishResult.remote_id,
          publishing_id: publishingId,
        });
      } catch (publishError: any) {
        logger.error('Error calling publish endpoint', { error: publishError });
        return NextResponse.json(
          {
            success: false,
            cms_provider: platform,
            site_id: site_id || '',
            collection_id: collection_id || undefined,
            error_message: publishError.message || 'Failed to publish',
            publishing_id: publishingId,
          },
          { status: 500 }
        );
      }
    } else {
      // Just created draft, return success
      return NextResponse.json({
        success: true,
        cms_provider: platform,
        site_id: site_id || '',
        collection_id: collection_id || undefined,
        publishing_id: publishingId,
      });
    }
  } catch (error: any) {
    logger.error('Publish blog error', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error', detail: error.message },
      { status: 500 }
    );
  }
}

