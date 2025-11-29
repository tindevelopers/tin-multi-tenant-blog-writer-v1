import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentIntegrationsDB } from '@/lib/integrations/database/environment-integrations-db';
import { publishBlogToWebflow } from '@/lib/integrations/webflow-publish';
import { logger } from '@/utils/logger';

/**
 * POST /api/test/webflow-publish
 * Test endpoint to create a sample blog post and publish it to Webflow
 */
export async function POST(request: NextRequest) {
  try {
    // Check for Bearer token in Authorization header (for API testing)
    const authHeader = request.headers.get('authorization');
    let supabase = await createClient(request);
    
    // If Bearer token provided, create a client with that token
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const tokenClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
      await tokenClient.auth.setSession({
        access_token: token,
        refresh_token: token,
      });
      supabase = tokenClient as any;
    }
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          hint: 'Please log in via the browser or provide a Bearer token in the Authorization header'
        },
        { status: 401 }
      );
    }

    // Get user's org_id
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const orgId = userProfile.org_id;

    // Get Webflow integrations for this org
    const dbAdapter = new EnvironmentIntegrationsDB();
    const integrations = await dbAdapter.getIntegrations(orgId);
    const webflowIntegrations = integrations.filter(i => i.type === 'webflow');

    if (webflowIntegrations.length === 0) {
      return NextResponse.json(
        {
          error: 'No Webflow integrations found',
          message: 'Please configure a Webflow integration first via the admin panel',
        },
        { status: 404 }
      );
    }

    const integration = webflowIntegrations[0];
    const config = integration.config as Record<string, unknown>;
    const apiKey = config.api_key as string | undefined;
    const siteId = config.site_id as string | undefined;
    const collectionId = config.collection_id as string | undefined;

    if (!apiKey || !collectionId) {
      return NextResponse.json(
        {
          error: 'Webflow integration is not fully configured',
          required: {
            apiKey: !!apiKey,
            siteId: !!siteId,
            collectionId: !!collectionId,
          },
        },
        { status: 400 }
      );
    }

    // Create a sample blog post
    const sampleBlogPost = {
      title: `Test Blog Post - ${new Date().toLocaleDateString()}`,
      content: `
        <h2>Introduction</h2>
        <p>This is a test blog post created automatically by the Blog Writer API integration system.</p>
        
        <h2>Features</h2>
        <p>This post demonstrates:</p>
        <ul>
          <li>Automatic blog post creation</li>
          <li>Webflow CMS integration</li>
          <li>Field mapping capabilities</li>
          <li>Direct publishing to Webflow</li>
        </ul>
        
        <h2>Conclusion</h2>
        <p>If you're seeing this post in your Webflow CMS, the integration is working correctly!</p>
        
        <p><em>Created at: ${new Date().toISOString()}</em></p>
      `,
      excerpt: 'A test blog post created automatically to verify Webflow CMS integration functionality.',
      slug: `test-blog-post-${Date.now()}`,
      seo_title: `Test Blog Post - ${new Date().toLocaleDateString()}`,
      seo_description: 'A test blog post created automatically to verify Webflow CMS integration functionality.',
      published_at: new Date().toISOString(),
      tags: ['test', 'integration', 'webflow'],
      categories: ['Technology'],
    };

    logger.debug('Publishing sample blog to Webflow', {
      collectionId,
      siteId,
      orgId,
      title: sampleBlogPost.title,
    });

    // Publish to Webflow
    const result = await publishBlogToWebflow({
      apiKey,
      collectionId,
      siteId: siteId || '', // Will be auto-detected if not provided
      blogPost: sampleBlogPost,
      orgId,
      isDraft: false,
      publishImmediately: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully published to Webflow!',
      result: {
        itemId: result.itemId,
        published: result.published,
        url: result.url,
      },
      blogPost: {
        title: sampleBlogPost.title,
        slug: sampleBlogPost.slug,
      },
    });
  } catch (error) {
    logger.error('Error publishing to Webflow:', error);
    return NextResponse.json(
      {
        error: 'Failed to publish to Webflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

