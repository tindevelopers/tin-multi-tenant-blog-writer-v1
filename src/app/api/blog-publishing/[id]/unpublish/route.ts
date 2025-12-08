/**
 * POST /api/blog-publishing/[id]/unpublish
 * Unpublish a blog post from the platform (set to draft on Webflow)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import { unpublishWebflowItem } from '@/lib/integrations/webflow-cms-operations';
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

    // Validate: Must be published to unpublish
    if (publishing.status !== 'published') {
      return NextResponse.json(
        { error: `Cannot unpublish: Current status is ${publishing.status}. Only published items can be unpublished.` },
        { status: 400 }
      );
    }

    // Must have platform_post_id
    if (!publishing.platform_post_id) {
      return NextResponse.json(
        { error: 'Cannot unpublish: No platform item ID found. This item may not have been published to the platform.' },
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

        // Unpublish item (set to draft)
        logger.info('Unpublishing Webflow item', {
          publishingId,
          itemId: publishing.platform_post_id,
          collectionId,
        });

        const unpublishedItem = await unpublishWebflowItem({
          apiKey,
          collectionId,
          itemId: publishing.platform_post_id,
        });

        // Publish site to reflect the change
        if (siteId) {
          try {
            await publishWebflowSite(apiKey, siteId);
            logger.info('Site published after unpublishing item', { siteId });
          } catch (publishError: any) {
            logger.warn('Failed to publish site after unpublishing item', {
              error: publishError.message,
              siteId,
            });
            // Continue - item is unpublished, just site publish failed
          }
        }

        // Update publishing record
        const { data: updatedPublishing, error: updateError } = await supabase
          .from('blog_platform_publishing')
          .update({
            status: 'unpublished' as PlatformStatus,
            is_draft: true,
            platform_draft_status: 'draft',
            sync_status: 'in_sync',
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_metadata: {
              ...(publishing.sync_metadata || {}),
              unpublished_at: new Date().toISOString(),
              unpublished_by: user.id,
            },
          })
          .eq('publishing_id', publishingId)
          .select()
          .single();

        if (updateError) {
          logger.error('Failed to update publishing record after unpublish:', updateError);
        }

        return NextResponse.json({
          success: true,
          message: 'Blog post unpublished successfully (set to draft on Webflow)',
          result: {
            itemId: unpublishedItem.id,
            isDraft: unpublishedItem.isDraft,
          },
          publishing: updatedPublishing,
        });
      } else {
        throw new Error(`Unpublishing from ${publishing.platform} is not yet implemented`);
      }
    } catch (error: any) {
      logger.error('Error unpublishing from platform:', error);

      // Update publishing record with error
      await supabase
        .from('blog_platform_publishing')
        .update({
          error_message: `Unpublish failed: ${error.message}`,
          sync_status: 'sync_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('publishing_id', publishingId);

      return NextResponse.json(
        {
          error: 'Failed to unpublish from platform',
          message: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error in POST /api/blog-publishing/[id]/unpublish:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

