/**
 * POST /api/blog-publishing/[id]/delete-from-platform
 * Delete a blog post from the platform (removes from Webflow CMS)
 * Note: This removes the item from Webflow but keeps the local blog post and publishing record
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import { deleteWebflowItem } from '@/lib/integrations/webflow-cms-operations';
import { publishWebflowSite } from '@/lib/integrations/webflow-publish';
import { logger } from '@/utils/logger';

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
    const body = await request.json().catch(() => ({}));
    const { 
      publish_site_after = true, // Publish site to reflect deletion
      delete_local_record = false, // Also delete the publishing record
    } = body;

    // Get user's org_id
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check permissions - only admins can delete
    const allowedRoles = ['admin', 'manager', 'system_admin', 'super_admin'];
    if (!userProfile.role || !allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins can delete from platform.' },
        { status: 403 }
      );
    }

    // Get publishing record
    const { data: publishing, error: fetchError } = await supabase
      .from('blog_platform_publishing')
      .select(`
        *,
        post:blog_posts(post_id, title)
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

    // Must have platform_post_id to delete
    if (!publishing.platform_post_id) {
      return NextResponse.json(
        { error: 'Cannot delete: No platform item ID found. This item may not have been published to the platform.' },
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

        logger.info('Deleting Webflow item', {
          publishingId,
          itemId: publishing.platform_post_id,
          collectionId,
          postTitle: publishing.post?.title,
        });

        // Delete the item from Webflow
        const deleteResult = await deleteWebflowItem({
          apiKey,
          collectionId,
          itemId: publishing.platform_post_id,
        });

        // Publish site to reflect deletion
        let sitePublished = false;
        if (publish_site_after && siteId) {
          try {
            await publishWebflowSite(apiKey, siteId);
            sitePublished = true;
            logger.info('Site published after deleting item', { siteId });
          } catch (publishError: any) {
            logger.warn('Failed to publish site after deleting item', {
              error: publishError.message,
              siteId,
            });
          }
        }

        if (delete_local_record) {
          // Delete the publishing record entirely
          await supabase
            .from('blog_platform_publishing')
            .delete()
            .eq('publishing_id', publishingId);

          return NextResponse.json({
            success: true,
            message: 'Blog post deleted from Webflow and publishing record removed',
            result: {
              deleted: deleteResult.deleted,
              itemId: deleteResult.itemId,
              sitePublished,
              recordDeleted: true,
            },
          });
        } else {
          // Update publishing record to reflect deletion
          const { data: updatedPublishing, error: updateError } = await supabase
            .from('blog_platform_publishing')
            .update({
              status: 'pending', // Reset to pending - can be published again
              platform_post_id: null, // Clear the platform ID
              platform_url: null,
              sync_status: 'not_synced',
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              sync_metadata: {
                ...(publishing.sync_metadata || {}),
                deleted_from_platform_at: new Date().toISOString(),
                deleted_by: user.id,
                previous_item_id: publishing.platform_post_id,
              },
              error_message: null,
              error_code: null,
            })
            .eq('publishing_id', publishingId)
            .select()
            .single();

          if (updateError) {
            logger.error('Failed to update publishing record after deletion:', updateError);
          }

          return NextResponse.json({
            success: true,
            message: 'Blog post deleted from Webflow. Publishing record preserved - you can republish later.',
            result: {
              deleted: deleteResult.deleted,
              itemId: deleteResult.itemId,
              sitePublished,
              recordDeleted: false,
            },
            publishing: updatedPublishing,
          });
        }
      } else {
        throw new Error(`Deleting from ${publishing.platform} is not yet implemented`);
      }
    } catch (error: any) {
      logger.error('Error deleting from platform:', error);

      // Update publishing record with error
      await supabase
        .from('blog_platform_publishing')
        .update({
          error_message: `Delete failed: ${error.message}`,
          sync_status: 'sync_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('publishing_id', publishingId);

      return NextResponse.json(
        {
          error: 'Failed to delete from platform',
          message: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error in POST /api/blog-publishing/[id]/delete-from-platform:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

