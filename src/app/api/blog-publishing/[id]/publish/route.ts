/**
 * POST /api/blog-publishing/[id]/publish
 * Actually publish a blog post to the platform (Webflow, WordPress, Shopify)
 * This endpoint performs the actual publishing operation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import { publishBlogToWebflow } from '@/lib/integrations/webflow-publish';
import { enhanceBlogFields } from '@/lib/integrations/enhance-fields';
import { LinkValidationService } from '@/lib/interlinking/link-validation-service';
import { enhanceForWebflowSEO } from '@/lib/integrations/webflow-seo-enhancer';
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
        // Get Webflow integration - use site_id from publish_metadata if available
        const dbAdapter = new EnvironmentIntegrationsDB();
        const integrations = await dbAdapter.getIntegrations(userProfile.org_id);
        
        // Get site_id and collection_id from publish_metadata if available
        const publishMetadata = (publishing.publish_metadata as Record<string, unknown>) || {};
        const targetSiteId = publishMetadata.site_id as string | undefined;
        const targetCollectionId = publishMetadata.collection_id as string | undefined;
        
        // Find the integration matching the target site_id, or fallback to first active
        let webflowIntegration = targetSiteId
          ? integrations.find(i => {
              if (i.type !== 'webflow' || i.status !== 'active') return false;
              const config = i.config as Record<string, unknown>;
              const integrationSiteId = config.site_id as string | undefined;
              return integrationSiteId === targetSiteId;
            })
          : integrations.find(i => i.type === 'webflow' && i.status === 'active');
        
        // If no match found with site_id, fallback to first active
        if (!webflowIntegration) {
          webflowIntegration = integrations.find(i => i.type === 'webflow' && i.status === 'active');
        }

        if (!webflowIntegration) {
          throw new Error('Webflow integration not found or not active');
        }

        const config = webflowIntegration.config as Record<string, unknown>;
        const apiKey = config.api_key as string;
        // Use collection_id from publish_metadata if provided, otherwise from integration config
        const collectionId = (targetCollectionId || config.collection_id) as string;
        // Use site_id from publish_metadata if provided, otherwise from integration config
        const siteId = (targetSiteId || config.site_id) as string | undefined;

        if (!apiKey || !collectionId) {
          throw new Error('Webflow integration is not fully configured');
        }
        
        logger.info('Using Webflow integration for publishing', {
          siteId,
          collectionId,
          integrationId: webflowIntegration.integration_id,
          fromMetadata: !!targetSiteId,
        });

        // Get blog post data
        const post = publishing.post as any;
        if (!post) {
          throw new Error('Blog post not found');
        }

        // Validate internal links before publishing (non-blocking warning)
        if (post.content && siteId) {
          try {
            const linkValidator = new LinkValidationService();
            const linkValidation = await linkValidator.validateLinks({
              content: post.content,
              targetSiteId: siteId,
              postId: post.post_id,
              orgId: userProfile.org_id,
              strictMode: false, // Warnings only, don't block publishing
            });

            if (!linkValidation.isValid) {
              logger.warn('Link validation found issues', {
                postId: post.post_id,
                totalLinks: linkValidation.totalLinks,
                brokenLinks: linkValidation.brokenLinks,
                wrongSiteLinks: linkValidation.wrongSiteLinks,
                warnings: linkValidation.warnings,
              });
              
              // Store validation warnings in publishing metadata
              await supabase
                .from('blog_platform_publishing')
                .update({
                  publishing_metadata: {
                    ...(publishing.publishing_metadata || {}),
                    link_validation: {
                      validated_at: new Date().toISOString(),
                      is_valid: linkValidation.isValid,
                      total_links: linkValidation.totalLinks,
                      broken_links: linkValidation.brokenLinks,
                      wrong_site_links: linkValidation.wrongSiteLinks,
                      warnings: linkValidation.warnings.slice(0, 5), // Keep first 5 warnings
                    },
                  },
                })
                .eq('publishing_id', publishingId);
            }
          } catch (validationError: any) {
            // Log but don't block publishing
            logger.warn('Link validation failed, continuing with publish', {
              error: validationError.message,
              postId: post.post_id,
            });
          }
        }

        // SEO Enhancement
        let processedContent = post.content || '';
        let seoEnhancement = null;
        
        if (post.content) {
          try {
            // Extract keywords from post metadata
            const keywords: string[] = [];
            if (post.metadata?.keywords) {
              if (Array.isArray(post.metadata.keywords)) {
                keywords.push(...post.metadata.keywords);
              } else if (typeof post.metadata.keywords === 'string') {
                keywords.push(...post.metadata.keywords.split(',').map((k: string) => k.trim()));
              }
            }
            
            processedContent = post.content;
            
            // Enhance for Webflow SEO
            seoEnhancement = await enhanceForWebflowSEO({
              content: processedContent,
              title: post.title,
              excerpt: post.excerpt,
              keywords,
              featuredImage: (post.metadata as Record<string, unknown>)?.featured_image as string | undefined,
              publishDate: new Date(),
              slug: (post.metadata as Record<string, unknown>)?.slug as string | undefined,
            });
            
            logger.info('Webflow SEO enhancement complete', {
              postId: post.post_id,
              seoScore: seoEnhancement.seoScore,
              recommendations: seoEnhancement.recommendations.length,
            });
            
          } catch (processingError: any) {
            // Log but don't block publishing
            logger.warn('SEO processing failed, continuing with original content', {
              error: processingError.message,
              postId: post.post_id,
            });
            processedContent = post.content;
          }
        }

        // Prepare initial blog post data (using processed content and SEO-enhanced fields)
        const initialBlogPostData: {
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
          schema_markup?: string;
        } = {
          title: post.title,
          content: processedContent, // Use AI-cleaned content
          excerpt: post.excerpt || '',
          slug: (post.metadata as Record<string, unknown>)?.slug as string | undefined,
          featured_image: (post.metadata as Record<string, unknown>)?.featured_image as string | undefined,
          featured_image_alt: (post.metadata as Record<string, unknown>)?.featured_image_alt as string | undefined,
          // Use SEO-enhanced meta tags if available
          seo_title: seoEnhancement?.metaTags.seoTitle || 
                     (post.seo_data as Record<string, unknown>)?.meta_title as string | undefined,
          seo_description: seoEnhancement?.metaTags.metaDescription || 
                          (post.seo_data as Record<string, unknown>)?.meta_description as string | undefined,
          published_at: new Date().toISOString(),
          // Include tags and categories if available in metadata
          tags: (post.metadata as Record<string, unknown>)?.tags as string[] | undefined,
          categories: (post.metadata as Record<string, unknown>)?.categories as string[] | undefined,
          // Include schema markup if generated
          schema_markup: seoEnhancement ? JSON.stringify(seoEnhancement.schemaMarkup) : undefined,
        };

        // Enhance mandatory fields using OpenAI before publishing to Webflow
        let blogPostData = { ...initialBlogPostData };
        try {
          logger.debug('Enhancing mandatory fields before Webflow publishing', {
            title: initialBlogPostData.title,
            hasFeaturedImage: !!initialBlogPostData.featured_image,
          });

          const enhancedFields = await enhanceBlogFields({
            title: initialBlogPostData.title,
            content: initialBlogPostData.content || initialBlogPostData.excerpt || '',
            featured_image_url: initialBlogPostData.featured_image,
            enhance_seo_title: true,
            enhance_meta_description: true,
            enhance_slug: true,
            enhance_image_alt: !!initialBlogPostData.featured_image, // Only enhance alt if image exists
            keywords: (post.seo_data as Record<string, unknown>)?.keywords as string[] | undefined,
            target_audience: (post.metadata as Record<string, unknown>)?.target_audience as string | undefined,
          });

          // Merge enhanced fields with existing data (enhanced fields take priority)
          blogPostData = {
            ...initialBlogPostData,
            slug: enhancedFields.enhanced_fields.slug || initialBlogPostData.slug,
            seo_title: enhancedFields.enhanced_fields.seo_title || initialBlogPostData.seo_title,
            seo_description: enhancedFields.enhanced_fields.meta_description || initialBlogPostData.seo_description,
            // Store enhanced image alt text in metadata for Webflow field mapping
            featured_image_alt: enhancedFields.enhanced_fields.featured_image_alt,
          };

          logger.debug('Successfully enhanced fields', {
            enhancedSeoTitle: !!enhancedFields.enhanced_fields.seo_title,
            enhancedMetaDescription: !!enhancedFields.enhanced_fields.meta_description,
            enhancedSlug: !!enhancedFields.enhanced_fields.slug,
            enhancedImageAlt: !!enhancedFields.enhanced_fields.featured_image_alt,
            provider: enhancedFields.provider,
            model: enhancedFields.model,
          });
        } catch (enhanceError: any) {
          // Log error but continue with original data (non-blocking)
          logger.warn('Field enhancement failed, proceeding with original fields', {
            error: enhanceError.message,
            title: initialBlogPostData.title,
          });
          // Continue with original blogPostData
        }

        logger.debug('Publishing blog to Webflow', {
          collectionId,
          siteId: siteId || 'auto-detect',
          orgId: userProfile.org_id,
          title: blogPostData.title,
          seoTitle: blogPostData.seo_title,
          slug: blogPostData.slug,
          isDraft: is_draft,
          publishImmediately: !is_draft,
        });

        // Publish to Webflow (following the same pattern as test endpoint)
        const result = await publishBlogToWebflow({
          apiKey,
          collectionId,
          siteId: siteId || '', // Will be auto-detected if not provided (same as test)
          blogPost: {
            ...blogPostData,
            featured_image_alt: blogPostData.featured_image_alt,
          },
          orgId: userProfile.org_id,
          isDraft: is_draft, // Use the is_draft flag from request
          publishImmediately: !is_draft, // If not draft, publish immediately (same as test)
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

        // Update publishing record with results and verify the update succeeded
        const { data: updatedPublishing, error: updateError } = await supabase
          .from('blog_platform_publishing')
          .update(updateData)
          .eq('publishing_id', publishingId)
          .select()
          .single();

        if (updateError) {
          logger.error('Failed to update publishing record after successful publish:', {
            publishingId,
            updateError,
            updateData,
          });
          // Even though the update failed, the publish was successful
          // Log the error but don't fail the request
        } else {
          logger.debug('Successfully updated publishing record', {
            publishingId,
            status: updatedPublishing?.status,
            sync_status: updatedPublishing?.sync_status,
          });
        }

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
          publishing: updatedPublishing || null, // Return updated record for UI
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

