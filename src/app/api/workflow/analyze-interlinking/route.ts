import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { WebsiteCrawlerService } from '@/lib/interlinking/website-crawler';
import { ContentIndexerService } from '@/lib/interlinking/content-indexer';
import { InterlinkingEngine } from '@/lib/interlinking/interlinking-engine';
import { ClusterAnalyzerService } from '@/lib/interlinking/cluster-analyzer';
import { ExternalLinkFinderService } from '@/lib/interlinking/external-link-finder';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/workflow/analyze-interlinking
 * 
 * Phase 4: Advanced interlinking analysis using hybrid approach
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      content,
      title,
      topic,
      keywords,
      max_internal_links,
      max_external_links,
      include_cluster_links,
      webflow_site_id,
      webflow_api_key,
    } = body;

    if (!content || !title) {
      return NextResponse.json(
        { error: 'Content and title are required' },
        { status: 400 }
      );
    }

    logger.info('Phase 4: Starting interlinking analysis', { title });

    // Get organization context
    const supabase = createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let orgId = 'default';
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_org_id')
        .eq('id', user.id)
        .single();
      orgId = profile?.current_org_id || 'default';
    }

    const results: {
      internal_links: Array<{
        url: string;
        anchorText: string;
        relevanceScore: number;
        placement: string;
        reason: string;
      }>;
      external_links: Array<{
        url: string;
        anchorText: string;
        authorityScore: number;
        linkType: string;
        reason: string;
      }>;
      cluster_analysis?: {
        clusters: Array<{
          name: string;
          pillarContent?: string;
          supportingCount: number;
          authorityScore: number;
        }>;
        recommendations: string[];
      };
    } = {
      internal_links: [],
      external_links: [],
    };

    // Get Webflow API key from integration config if not provided
    let apiKey = webflow_api_key;
    let siteId = webflow_site_id;

    if (!apiKey) {
      const { data: integration } = await supabase
        .from('integration_configs')
        .select('api_key, metadata')
        .eq('org_id', orgId)
        .eq('platform', 'webflow')
        .eq('is_active', true)
        .single();

      if (integration) {
        apiKey = integration.api_key;
        siteId = siteId || (integration.metadata as Record<string, any>)?.site_id;
      }
    }

    // Internal links - crawl and analyze website
    if (apiKey && siteId) {
      try {
        logger.debug('Crawling Webflow website for interlinking');
        
        // Initialize services
        const crawler = new WebsiteCrawlerService(apiKey, siteId);
        const indexer = new ContentIndexerService(orgId);
        const interlinkingEngine = new InterlinkingEngine();
        const clusterAnalyzer = new ClusterAnalyzerService();

        // Crawl CMS collections
        const crawledPages = await crawler.crawlCMSCollections(siteId);
        
        if (crawledPages.length > 0) {
          // Index content
          const indexedContent = await indexer.indexContent(crawledPages);

          // Analyze interlinking opportunities
          const interlinkingAnalysis = await interlinkingEngine.analyzeInterlinking(
            {
              content,
              title,
              keywords: keywords || [],
              topics: [topic, ...(keywords || []).slice(0, 3)],
              maxInternalLinks: max_internal_links || 5,
              maxExternalLinks: max_external_links || 3,
            },
            indexedContent
          );

          // Map internal link opportunities
          results.internal_links = interlinkingAnalysis.internalLinks.map(link => ({
            url: link.targetPage.url,
            anchorText: link.anchorText,
            relevanceScore: link.relevanceScore,
            placement: link.placement,
            reason: link.reason,
          }));

          // Include cluster links if requested
          if (include_cluster_links && interlinkingAnalysis.clusterLinks.length > 0) {
            const clusterLinks = interlinkingAnalysis.clusterLinks.map(link => ({
              url: link.targetPage.url,
              anchorText: link.anchorText,
              relevanceScore: link.relevanceScore,
              placement: link.placement,
              reason: link.reason,
            }));

            // Merge with internal links (avoid duplicates)
            const existingUrls = new Set(results.internal_links.map(l => l.url));
            for (const link of clusterLinks) {
              if (!existingUrls.has(link.url)) {
                results.internal_links.push(link);
                existingUrls.add(link.url);
              }
            }
          }

          // Analyze content clusters
          const clusterAnalysis = await clusterAnalyzer.analyzeClusters(indexedContent);
          
          results.cluster_analysis = {
            clusters: clusterAnalysis.clusters.map(cluster => ({
              name: cluster.name,
              pillarContent: cluster.pillarContent?.title,
              supportingCount: cluster.supportingContent.length,
              authorityScore: cluster.authorityScore,
            })),
            recommendations: clusterAnalysis.recommendations,
          };

          logger.info('Internal link analysis completed', {
            internalLinksFound: results.internal_links.length,
            clustersFound: results.cluster_analysis?.clusters.length || 0,
          });
        }
      } catch (crawlError: any) {
        logger.warn('Website crawl failed, continuing with external links only', {
          error: crawlError.message,
        });
      }
    } else {
      logger.debug('No Webflow credentials, skipping internal link analysis');
    }

    // External links - find authority and citation opportunities
    try {
      const externalLinkFinder = new ExternalLinkFinderService();
      
      const externalAnalysis = await externalLinkFinder.findExternalLinks({
        content,
        title,
        keywords: keywords || [],
        topics: [topic, ...(keywords || []).slice(0, 3)],
        maxLinks: max_external_links || 3,
      });

      results.external_links = externalAnalysis.opportunities.map(link => ({
        url: link.url,
        anchorText: link.anchorText,
        authorityScore: link.authorityScore,
        linkType: link.linkType,
        reason: link.reason,
      }));

      logger.info('External link analysis completed', {
        externalLinksFound: results.external_links.length,
      });
    } catch (extError: any) {
      logger.warn('External link analysis failed', { error: extError.message });
    }

    logger.info('Phase 4: Interlinking analysis completed', {
      internalLinks: results.internal_links.length,
      externalLinks: results.external_links.length,
      hasClusters: !!results.cluster_analysis,
    });

    return NextResponse.json(results);

  } catch (error: any) {
    logger.error('Phase 4 error', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Interlinking analysis failed' },
      { status: 500 }
    );
  }
}

