/**
 * Website Crawl API
 * 
 * Crawls a connected Webflow site and indexes content for interlinking
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { WebsiteCrawlerService } from '@/lib/interlinking/website-crawler';
import { ContentIndexerService } from '@/lib/interlinking/content-indexer';
import { logger } from '@/utils/logger';

/**
 * POST /api/interlinking/crawl
 * Start a website crawl
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const body = await request.json();
    const { integrationId, forceRefresh = false } = body;

    // Get Webflow integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('org_id', userOrg.org_id)
      .eq('platform', 'webflow')
      .eq('status', 'connected')
      .maybeSingle();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'No connected Webflow integration found' },
        { status: 400 }
      );
    }

    const apiKey = integration.credentials?.api_key;
    const siteId = integration.site_id;

    if (!apiKey || !siteId) {
      return NextResponse.json(
        { error: 'Webflow API key or site ID not configured' },
        { status: 400 }
      );
    }

    // Check if we have a recent crawl (within 24 hours)
    if (!forceRefresh) {
      const serviceClient = createServiceClient();
      const { data: recentCrawl } = await serviceClient
        .from('website_crawl_history')
        .select('*')
        .eq('org_id', userOrg.org_id)
        .eq('status', 'completed')
        .gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (recentCrawl) {
        return NextResponse.json({
          success: true,
          message: 'Using recent crawl data',
          crawlId: recentCrawl.id,
          pagesIndexed: recentCrawl.pages_indexed,
          lastCrawled: recentCrawl.completed_at,
          cached: true,
        });
      }
    }

    // Create crawl history record
    const serviceClient = createServiceClient();
    const { data: crawlRecord, error: crawlError } = await serviceClient
      .from('website_crawl_history')
      .insert({
        org_id: userOrg.org_id,
        integration_id: integration.id,
        platform: 'webflow',
        site_id: siteId,
        status: 'crawling',
        config: { forceRefresh },
      })
      .select()
      .single();

    if (crawlError) {
      logger.error('Failed to create crawl record', { error: crawlError });
      return NextResponse.json(
        { error: 'Failed to start crawl' },
        { status: 500 }
      );
    }

    logger.info('Starting website crawl', {
      orgId: userOrg.org_id,
      siteId,
      crawlId: crawlRecord.id,
    });

    // Start crawl (async)
    const crawlPromise = (async () => {
      try {
        // Crawl website
        const crawler = new WebsiteCrawlerService(apiKey, siteId);
        const crawledContent = await crawler.crawlWebsite(siteId);

        // Update crawl status
        await serviceClient
          .from('website_crawl_history')
          .update({
            status: 'indexing',
            pages_crawled: crawledContent.pages.length,
            collections_found: crawledContent.collections.length,
          })
          .eq('id', crawlRecord.id);

        // Index content
        const indexer = new ContentIndexerService(userOrg.org_id);
        const indexedContent = await indexer.indexContent(crawledContent.pages);

        // Update crawl as completed
        await serviceClient
          .from('website_crawl_history')
          .update({
            status: 'completed',
            pages_indexed: indexedContent.length,
            completed_at: new Date().toISOString(),
          })
          .eq('id', crawlRecord.id);

        logger.info('Website crawl completed', {
          crawlId: crawlRecord.id,
          pagesCrawled: crawledContent.pages.length,
          pagesIndexed: indexedContent.length,
        });
      } catch (error: any) {
        logger.error('Website crawl failed', {
          crawlId: crawlRecord.id,
          error: error.message,
        });

        await serviceClient
          .from('website_crawl_history')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', crawlRecord.id);
      }
    })();

    // Don't await - let it run in background
    crawlPromise.catch(console.error);

    return NextResponse.json({
      success: true,
      message: 'Crawl started',
      crawlId: crawlRecord.id,
      status: 'crawling',
    });
  } catch (error: any) {
    logger.error('Failed to start crawl', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to start crawl' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/interlinking/crawl?id=xxx
 * Get crawl status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const crawlId = searchParams.get('id');

    const serviceClient = createServiceClient();

    if (crawlId) {
      // Get specific crawl
      const { data: crawl, error } = await serviceClient
        .from('website_crawl_history')
        .select('*')
        .eq('id', crawlId)
        .eq('org_id', userOrg.org_id)
        .single();

      if (error || !crawl) {
        return NextResponse.json(
          { error: 'Crawl not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ crawl });
    }

    // Get all crawls for this org
    const { data: crawls, error } = await serviceClient
      .from('website_crawl_history')
      .select('*')
      .eq('org_id', userOrg.org_id)
      .order('started_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return NextResponse.json({ crawls: crawls || [] });
  } catch (error: any) {
    logger.error('Failed to get crawl status', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to get crawl status' },
      { status: 500 }
    );
  }
}

