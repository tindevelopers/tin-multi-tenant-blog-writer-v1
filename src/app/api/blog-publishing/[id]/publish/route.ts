/**
 * POST /api/blog-publishing/[id]/publish
 * Actually publish a blog post to the platform (Webflow, WordPress, Shopify)
 * This endpoint performs the actual publishing operation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import { publishBlogToWebflow } from '@/lib/integrations/webflow-publish';
import { logger } from '@/utils/logger';
import { PlatformStatus } from '@/lib/blog-queue-state-machine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: publishingId } = await params;
    const body = await request.json();
    const { is_draft = false } = body; // Default to published mode

    // Get user's org_id
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

    // Get publishing record
    const { data: publishing, error: fetchError } = await supabase
      .from('blog_platform_publishing')
      .select(`
        *,
        post:blog_posts(post_id, title, content, excerpt, metadata, seo_data, status)
      `)
      .eq('publishing_id', publishingId)
      .eq('org_id', userProfile.org_id)
      .single();

    if (fetchError || !publishing) {
      return NextResponse.json(
        { error: 'Publishing record not found' },
        { status: 404 }
      );
    }

    // Update status to publishing
    await supabase
      .from('blog_platform_publishing')
      .update({
        status: 'publishing' as PlatformStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('publishing_id', publishingId);

    try {
      // Platform-specific publishing logic
      if (publishing.platform === 'webflow') {
        // Get Webflow integration
        const dbAdapter = new EnvironmentIntegrationsDB();
        const integrations = await dbAdapter.getIntegrations(userProfile.org_id);
        const webflowIntegration = integrations.find(i => i.type === 'webflow' && i.status === 'active');

        if (!webflowIntegration) {
          throw new Error('Webflow integration not found or not active');
        }

        const config = webflowIntegration.config as Record<string, unknown>;
        const apiKey = config.api_key as string;
        const collectionId = config.collection_id as string;
        const siteId = config.site_id as string | undefined;

        if (!apiKey || !collectionId) {
          throw new Error('Webflow integration is not fully configured');
        }

        // Get blog post data
        const post = publishing.post as any;
        if (!post) {
          throw new Error('Blog post not found');
        }

        // Prepare blog post data
        const blogPostData = {
          title: post.title,
          content: post.content || '',
          excerpt: post.excerpt || '',
          slug: (post.metadata as Record<string, unknown>)?.slug as string | undefined,
          featured_image: (post.metadata as Record<string, unknown>)?.featured_image as string | undefined,
          seo_title: (post.seo_data as Record<string, unknown>)?.meta_title as string | undefined,
          seo_description: (post.seo_data as Record<string, unknown>)?.meta_description as string | undefined,
          published_at: new Date().toISOString(),
        };

        // Publish to Webflow
        const result = await publishBlogToWebflow({
          apiKey,
          collectionId,
          siteId: siteId || '',
          blogPost: blogPostData,
          orgId: userProfile.org_id,
          isDraft: is_draft, // Use the is_draft flag
          publishImmediately: !is_draft, // If not draft, publish immediately
        });

        // Update publishing record with results
        const updateData: Record<string, unknown> = {
          status: 'published' as PlatformStatus,
          platform_post_id: result.itemId,
          platform_url: result.url,
          published_at: new Date().toISOString(),
          is_draft: is_draft,
          platform_draft_status: is_draft ? 'draft' : 'published',
          sync_status: 'in_sync',
          last_synced_at: new Date().toISOString(),
          last_platform_check_at: new Date().toISOString(),
          sync_metadata: {
            platform_item_id: result.itemId,
            platform_url: result.url,
            published: result.published,
            synced_at: new Date().toISOString(),
          },
          error_message: null,
          error_code: null,
        };

        await supabase
          .from('blog_platform_publishing')
          .update(updateData)
          .eq('publishing_id', publishingId);

        return NextResponse.json({
          success: true,
          message: is_draft 
            ? 'Blog post published as draft to Webflow' 
            : 'Blog post published successfully to Webflow',
          result: {
            itemId: result.itemId,
            published: result.published,
            url: result.url,
            is_draft: is_draft,
          },
        });
      } else {
        // WordPress and Shopify publishing (to be implemented)
        throw new Error(`Publishing to ${publishing.platform} is not yet implemented`);
      }
    } catch (error: any) {
      logger.error('Error publishing to platform:', error);

      // Update publishing record with error
      await supabase
        .from('blog_platform_publishing')
        .update({
          status: 'failed' as PlatformStatus,
          error_message: error.message || 'Publishing failed',
          error_code: error.code || 'PUBLISH_ERROR',
          sync_status: 'sync_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('publishing_id', publishingId);

      return NextResponse.json(
        {
          error: 'Failed to publish to platform',
          message: error.message || 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error in POST /api/blog-publishing/[id]/publish:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

