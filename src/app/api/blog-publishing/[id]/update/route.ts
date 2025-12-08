/**
 * POST /api/blog-publishing/[id]/update
 * Update an existing published blog post on the platform
 * This syncs changes from the local blog post to Webflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import { updateWebflowItem, getWebflowItem } from '@/lib/integrations/webflow-cms-operations';
import { publishWebflowSite } from '@/lib/integrations/webflow-publish';
import { getWebflowCollectionById } from '@/lib/integrations/webflow-api';
import { getWebflowFieldMappings, applyWebflowFieldMappings, autoDetectFieldMappings, getDefaultWebflowFieldMappings } from '@/lib/integrations/webflow-field-mapping';
import { enhanceBlogFields } from '@/lib/integrations/enhance-fields';
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
    const { 
      publish_after_update = true, // Default to publishing changes
      enhance_fields = true, // Default to enhancing fields with AI
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

    // Check permissions
    const allowedRoles = ['admin', 'manager', 'editor', 'system_admin', 'super_admin'];
    if (!userProfile.role || !allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get publishing record with blog post data
    const { data: publishing, error: fetchError } = await supabase
      .from('blog_platform_publishing')
      .select(`
        *,
        post:blog_posts(post_id, title, content, excerpt, metadata, seo_data, status, updated_at)
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

    // Must have platform_post_id
    if (!publishing.platform_post_id) {
      return NextResponse.json(
        { error: 'Cannot update: No platform item ID found. This item may not have been published to the platform.' },
        { status: 400 }
      );
    }

    // Validate: Must be published or unpublished (not pending/failed)
    if (!['published', 'unpublished'].includes(publishing.status)) {
      return NextResponse.json(
        { error: `Cannot update: Current status is ${publishing.status}. Only published or unpublished items can be updated.` },
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

        const post = publishing.post as any;
        if (!post) {
          throw new Error('Blog post not found');
        }

        // Get current Webflow item to check if it exists
        const currentWebflowItem = await getWebflowItem(apiKey, collectionId, publishing.platform_post_id);
        if (!currentWebflowItem) {
          throw new Error('Webflow item not found - it may have been deleted from Webflow');
        }

        // Get collection schema for field mapping
        const collection = await getWebflowCollectionById(apiKey, collectionId);
        const availableFieldSlugs = new Set(collection.fields.map(f => f.slug));
        const fieldTypeMap = new Map<string, string>();
        collection.fields.forEach(f => fieldTypeMap.set(f.slug, f.type));

        // Prepare blog post data
        let blogPostData: {
          title: string;
          content: string;
          excerpt?: string;
          slug?: string;
          featured_image?: string;
          featured_image_alt?: string;
          seo_title?: string;
          seo_description?: string;
          published_at: string;
          tags?: string[];
          categories?: string[];
        } = {
          title: post.title,
          content: post.content || '',
          excerpt: post.excerpt || '',
          slug: (post.metadata as Record<string, unknown>)?.slug as string | undefined,
          featured_image: (post.metadata as Record<string, unknown>)?.featured_image as string | undefined,
          featured_image_alt: (post.metadata as Record<string, unknown>)?.featured_image_alt as string | undefined,
          seo_title: (post.seo_data as Record<string, unknown>)?.meta_title as string | undefined,
          seo_description: (post.seo_data as Record<string, unknown>)?.meta_description as string | undefined,
          published_at: publishing.published_at || new Date().toISOString(),
          tags: (post.metadata as Record<string, unknown>)?.tags as string[] | undefined,
          categories: (post.metadata as Record<string, unknown>)?.categories as string[] | undefined,
        };

        // Enhance fields with AI if requested
        if (enhance_fields) {
          try {
            const enhancedFields = await enhanceBlogFields({
              title: blogPostData.title,
              content: blogPostData.content || blogPostData.excerpt || '',
              featured_image_url: blogPostData.featured_image,
              enhance_seo_title: true,
              enhance_meta_description: true,
              enhance_slug: true,
              enhance_image_alt: !!blogPostData.featured_image,
              keywords: (post.seo_data as Record<string, unknown>)?.keywords as string[] | undefined,
            });

            blogPostData = {
              ...blogPostData,
              slug: enhancedFields.enhanced_fields.slug || blogPostData.slug,
              seo_title: enhancedFields.enhanced_fields.seo_title || blogPostData.seo_title,
              seo_description: enhancedFields.enhanced_fields.meta_description || blogPostData.seo_description,
              featured_image_alt: enhancedFields.enhanced_fields.featured_image_alt || blogPostData.featured_image_alt,
            };

            logger.debug('Fields enhanced successfully', { provider: enhancedFields.provider });
          } catch (enhanceError: any) {
            logger.warn('Field enhancement failed, proceeding with original fields', {
              error: enhanceError.message,
            });
          }
        }

        // Apply field mappings
        const mappings = await getWebflowFieldMappings(userProfile.org_id);
        const useAutoDetect = mappings.length === 0 || 
          mappings.every(m => m.targetField === getDefaultWebflowFieldMappings().find(d => d.blogField === m.blogField)?.targetField);
        
        const finalMappings = useAutoDetect 
          ? autoDetectFieldMappings(Array.from(availableFieldSlugs), fieldTypeMap)
          : mappings;

        const mappedData = applyWebflowFieldMappings(blogPostData, finalMappings);

        // Filter fields to only those that exist in the collection
        const fieldData: Record<string, unknown> = {};
        for (const [fieldSlug, value] of Object.entries(mappedData)) {
          if (availableFieldSlugs.has(fieldSlug)) {
            const fieldType = fieldTypeMap.get(fieldSlug);
            
            if (fieldType === 'ImageRef' && typeof value === 'string') {
              fieldData[fieldSlug] = { url: value };
            } else if (fieldType === 'Date' && typeof value === 'string') {
              fieldData[fieldSlug] = new Date(value).toISOString();
            } else {
              fieldData[fieldSlug] = value;
            }
          }
        }

        logger.info('Updating Webflow item', {
          publishingId,
          itemId: publishing.platform_post_id,
          collectionId,
          fieldCount: Object.keys(fieldData).length,
        });

        // Determine isDraft based on current status
        const isDraft = publishing.status === 'unpublished';

        // Update the item
        const updatedItem = await updateWebflowItem({
          apiKey,
          collectionId,
          itemId: publishing.platform_post_id,
          fieldData,
          isDraft,
        });

        // Publish site if requested and item is not a draft
        let sitePublished = false;
        if (publish_after_update && !isDraft && siteId) {
          try {
            await publishWebflowSite(apiKey, siteId, [updatedItem.id]);
            sitePublished = true;
            logger.info('Site published after updating item', { siteId });
          } catch (publishError: any) {
            logger.warn('Failed to publish site after updating item', {
              error: publishError.message,
              siteId,
            });
          }
        }

        // Update publishing record
        const { data: updatedPublishing, error: updateError } = await supabase
          .from('blog_platform_publishing')
          .update({
            status: isDraft ? 'unpublished' : 'published' as PlatformStatus,
            sync_status: 'in_sync',
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_metadata: {
              ...(publishing.sync_metadata || {}),
              last_updated_at: new Date().toISOString(),
              updated_by: user.id,
              site_published: sitePublished,
            },
            error_message: null,
            error_code: null,
          })
          .eq('publishing_id', publishingId)
          .select()
          .single();

        if (updateError) {
          logger.error('Failed to update publishing record:', updateError);
        }

        return NextResponse.json({
          success: true,
          message: 'Blog post updated successfully on Webflow',
          result: {
            itemId: updatedItem.id,
            isDraft: updatedItem.isDraft,
            lastUpdated: updatedItem.lastUpdated,
            sitePublished,
          },
          publishing: updatedPublishing,
        });
      } else {
        throw new Error(`Updating on ${publishing.platform} is not yet implemented`);
      }
    } catch (error: any) {
      logger.error('Error updating on platform:', error);

      // Update publishing record with error
      await supabase
        .from('blog_platform_publishing')
        .update({
          error_message: `Update failed: ${error.message}`,
          sync_status: 'sync_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('publishing_id', publishingId);

      return NextResponse.json(
        {
          error: 'Failed to update on platform',
          message: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error in POST /api/blog-publishing/[id]/update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

