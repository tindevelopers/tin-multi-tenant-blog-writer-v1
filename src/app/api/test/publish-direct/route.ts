/**
 * POST /api/test/publish-direct
 * Test endpoint to publish a blog directly to Webflow with enhanced fields
 * Uses server-side authentication, so no auth token needed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { logger } from '@/utils/logger';
import { publishBlogToWebflow } from '@/lib/integrations/webflow-publish';
import { enhanceBlogFields } from '@/lib/integrations/enhance-fields';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';

export async function POST(request: NextRequest) {
  try {
    logger.info('🧪 Direct publishing test endpoint called');

    // Get request body
    const body = await request.json().catch(() => ({}));
    const {
      title = 'Test Blog: Direct Publishing with Enhanced Fields',
      content = `
        <h1>Test Blog: Direct Publishing with Enhanced Fields</h1>
        <p>This is a test blog post published directly to Webflow to verify that enhanced fields (SEO title, meta description, slug, featured image alt text) are correctly generated via OpenAI and published.</p>
        <h2>What We're Testing</h2>
        <ul>
          <li>OpenAI field enhancement (SEO title, meta description, slug, alt text)</li>
          <li>Webflow ImageRef field formatting</li>
          <li>Site publishing after item creation</li>
          <li>Field mapping to Webflow collection</li>
        </ul>
        <p>This content is designed to test the complete publishing workflow.</p>
      `,
      excerpt = 'Test blog post to verify enhanced fields publishing workflow with OpenAI field enhancement.',
      featured_image = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200',
      collection_id = '6928d5ea7146ca3510367bcc',
      site_id,
      org_id = '00000000-0000-0000-0000-000000000001', // Default org
    } = body;

    logger.info('Test parameters:', {
      title,
      collection_id,
      site_id: site_id || 'auto-detect',
      org_id,
      has_featured_image: !!featured_image,
    });

    // Get Webflow integration
    const dbAdapter = new EnvironmentIntegrationsDB();
    const integrations = await dbAdapter.getIntegrations(org_id);
    const webflowIntegration = integrations.find(i => i.type === 'webflow' && i.status === 'active');

    if (!webflowIntegration) {
      return NextResponse.json(
        { error: 'Webflow integration not found. Please configure it first.' },
        { status: 404 }
      );
    }

    const config = webflowIntegration.config as Record<string, unknown>;
    const apiKey = config.api_key as string;
    const defaultCollectionId = (config.collection_id as string) || collection_id;
    const defaultSiteId = (config.site_id as string) || site_id;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Webflow API key not found in integration config' },
        { status: 400 }
      );
    }

    logger.info('Webflow integration found', {
      integration_id: webflowIntegration.integration_id,
      collection_id: defaultCollectionId,
      site_id: defaultSiteId || 'auto-detect',
    });

    // Step 1: Enhance fields using OpenAI
    logger.info('Step 1: Enhancing fields with OpenAI...');
    let enhancedFields;
    try {
      enhancedFields = await enhanceBlogFields({
        title,
        content: content || excerpt,
        featured_image_url: featured_image,
        enhance_seo_title: true,
        enhance_meta_description: true,
        enhance_slug: true,
        enhance_image_alt: !!featured_image,
        keywords: ['test', 'blog', 'webflow', 'publishing', 'enhanced fields'],
        target_audience: 'developers and content creators',
      });

      logger.info('✅ Fields enhanced successfully', {
        seo_title: enhancedFields.enhanced_fields.seo_title,
        meta_description: enhancedFields.enhanced_fields.meta_description?.substring(0, 50) + '...',
        slug: enhancedFields.enhanced_fields.slug,
        featured_image_alt: enhancedFields.enhanced_fields.featured_image_alt,
        provider: enhancedFields.provider,
        model: enhancedFields.model,
      });
    } catch (enhanceError: any) {
      logger.warn('⚠️ Field enhancement failed, using defaults', {
        error: enhanceError.message,
      });
      // Use defaults if enhancement fails
      enhancedFields = {
        enhanced_fields: {
          seo_title: title,
          meta_description: excerpt,
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          featured_image_alt: 'Blog featured image',
        },
        provider: 'none',
        model: 'none',
      };
    }

    // Step 2: Publish to Webflow
    logger.info('Step 2: Publishing to Webflow...');
    const result = await publishBlogToWebflow({
      apiKey,
      collectionId: defaultCollectionId,
      siteId: defaultSiteId || '',
      blogPost: {
        title,
        content,
        excerpt,
        slug: enhancedFields.enhanced_fields.slug,
        featured_image: featured_image,
        featured_image_alt: enhancedFields.enhanced_fields.featured_image_alt,
        seo_title: enhancedFields.enhanced_fields.seo_title,
        seo_description: enhancedFields.enhanced_fields.meta_description,
        published_at: new Date().toISOString(),
      },
      orgId: org_id,
      isDraft: false,
      publishImmediately: true,
    });

    logger.info('✅ Publishing completed', {
      itemId: result.itemId,
      published: result.published,
      url: result.url,
    });

    return NextResponse.json({
      success: true,
      message: 'Blog published successfully to Webflow',
      enhanced_fields: {
        seo_title: enhancedFields.enhanced_fields.seo_title,
        meta_description: enhancedFields.enhanced_fields.meta_description,
        slug: enhancedFields.enhanced_fields.slug,
        featured_image_alt: enhancedFields.enhanced_fields.featured_image_alt,
        provider: enhancedFields.provider,
        model: enhancedFields.model,
      },
      webflow_result: {
        itemId: result.itemId,
        published: result.published,
        url: result.url,
      },
    });
  } catch (error: any) {
    logger.error('❌ Error in direct publishing test:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to publish blog',
        message: error.message || 'Unknown error',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

