/**
 * POST /api/blog-publishing/[id]/republish
 * Republish an unpublished blog post (set isDraft: false on Webflow and publish site)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import { updateWebflowItem, getWebflowItem } from '@/lib/integrations/webflow-cms-operations';
import { publishWebflowSite } from '@/lib/integrations/webflow-publish';
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
        post:blog_posts(post_id, title, content, status)
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

    // Validate: Must be unpublished to republish
    if (publishing.status !== 'unpublished') {
      return NextResponse.json(
        { error: `Cannot republish: Current status is ${publishing.status}. Only unpublished items can be republished.` },
        { status: 400 }
      );
    }

    // Must have platform_post_id
    if (!publishing.platform_post_id) {
      return NextResponse.json(
        { error: 'Cannot republish: No platform item ID found. Please use the "Publish" action instead.' },
        { status: 400 }
      );
    }

    try {
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

        // Get current Webflow item
        const currentItem = await getWebflowItem(apiKey, collectionId, publishing.platform_post_id);
        if (!currentItem) {
          throw new Error('Webflow item not found - it may have been deleted. Please use "Publish" to create a new item.');
        }

        logger.info('Republishing Webflow item', {
          publishingId,
          itemId: publishing.platform_post_id,
          collectionId,
        });

        // Update item to set isDraft: false
        const republishedItem = await updateWebflowItem({
          apiKey,
          collectionId,
          itemId: publishing.platform_post_id,
          fieldData: currentItem.fieldData,
          isDraft: false,
        });

        // Publish site to make the item live
        let sitePublished = false;
        if (siteId) {
          try {
            await publishWebflowSite(apiKey, siteId, [republishedItem.id]);
            sitePublished = true;
            logger.info('Site published after republishing item', { siteId });
          } catch (publishError: any) {
            logger.warn('Failed to publish site after republishing item', {
              error: publishError.message,
              siteId,
            });
          }
        }

        // Update publishing record
        const { data: updatedPublishing, error: updateError } = await supabase
          .from('blog_platform_publishing')
          .update({
            status: 'published' as PlatformStatus,
            is_draft: false,
            platform_draft_status: 'published',
            sync_status: 'in_sync',
            last_synced_at: new Date().toISOString(),
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_metadata: {
              ...(publishing.sync_metadata || {}),
              republished_at: new Date().toISOString(),
              republished_by: user.id,
              site_published: sitePublished,
            },
            error_message: null,
            error_code: null,
          })
          .eq('publishing_id', publishingId)
          .select()
          .single();

        if (updateError) {
          logger.error('Failed to update publishing record after republish:', updateError);
        }

        return NextResponse.json({
          success: true,
          message: 'Blog post republished successfully on Webflow',
          result: {
            itemId: republishedItem.id,
            isDraft: republishedItem.isDraft,
            lastPublished: republishedItem.lastPublished,
            sitePublished,
          },
          publishing: updatedPublishing,
        });
      } else {
        throw new Error(`Republishing on ${publishing.platform} is not yet implemented`);
      }
    } catch (error: any) {
      logger.error('Error republishing to platform:', error);

      // Update publishing record with error
      await supabase
        .from('blog_platform_publishing')
        .update({
          error_message: `Republish failed: ${error.message}`,
          sync_status: 'sync_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('publishing_id', publishingId);

      return NextResponse.json(
        {
          error: 'Failed to republish to platform',
          message: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error in POST /api/blog-publishing/[id]/republish:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

