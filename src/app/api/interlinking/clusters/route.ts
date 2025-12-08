/**
 * Content Clusters API
 * 
 * Analyzes and manages content clusters for topical authority
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { ContentIndexerService } from '@/lib/interlinking/content-indexer';
import { ClusterAnalyzerService } from '@/lib/interlinking/cluster-analyzer';
import { logger } from '@/utils/logger';

/**
 * POST /api/interlinking/clusters
 * Analyze content and identify clusters
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
    const { refresh = false } = body;

    logger.info('Analyzing content clusters', {
      orgId: userOrg.org_id,
      refresh,
    });

    // Get indexed content
    const indexer = new ContentIndexerService(userOrg.org_id);
    const indexedContent = await indexer.getAllIndexedContent();

    if (indexedContent.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No indexed content available. Please crawl your website first.',
        clusters: [],
        analysis: {
          totalClusters: 0,
          pillarContentCount: 0,
          supportingContentCount: 0,
          longTailContentCount: 0,
          averageAuthorityScore: 0,
          recommendations: ['Crawl your website to build content index'],
        },
      });
    }

    // Analyze clusters
    const clusterAnalyzer = new ClusterAnalyzerService();
    const analysis = await clusterAnalyzer.analyzeClusters(indexedContent);

    // Save clusters to database
    const serviceClient = createServiceClient();

    // Clear existing clusters
    if (refresh) {
      await serviceClient
        .from('content_cluster_members')
        .delete()
        .in('cluster_id', 
          analysis.clusters.map(c => c.id)
        );

      await serviceClient
        .from('content_clusters')
        .delete()
        .eq('org_id', userOrg.org_id);
    }

    // Insert new clusters
    for (const cluster of analysis.clusters) {
      const { data: savedCluster, error: clusterError } = await serviceClient
        .from('content_clusters')
        .upsert({
          id: cluster.id,
          org_id: userOrg.org_id,
          name: cluster.name,
          pillar_content_id: cluster.pillarContent?.id || null,
          topics: cluster.topics,
          keywords: cluster.keywords,
          authority_score: Math.round(cluster.authorityScore * 100),
          total_content: cluster.totalContent,
          internal_links: cluster.internalLinks,
          content_gaps: cluster.contentGaps,
        })
        .select()
        .single();

      if (clusterError) {
        logger.warn('Failed to save cluster', { 
          clusterId: cluster.id, 
          error: clusterError.message 
        });
        continue;
      }

      // Save cluster members
      const members = [
        ...(cluster.pillarContent ? [{
          cluster_id: cluster.id,
          content_id: cluster.pillarContent.id,
          role: 'pillar',
          relevance_score: 100,
        }] : []),
        ...cluster.supportingContent.map((content, index) => ({
          cluster_id: cluster.id,
          content_id: content.id,
          role: 'supporting',
          relevance_score: 80 - (index * 5),
        })),
        ...cluster.longTailContent.map((content, index) => ({
          cluster_id: cluster.id,
          content_id: content.id,
          role: 'long_tail',
          relevance_score: 60 - (index * 5),
        })),
      ];

      if (members.length > 0) {
        await serviceClient
          .from('content_cluster_members')
          .upsert(members, { onConflict: 'cluster_id,content_id' });
      }
    }

    // Format response
    const response = {
      success: true,
      clusters: analysis.clusters.map(cluster => ({
        id: cluster.id,
        name: cluster.name,
        pillarContent: cluster.pillarContent ? {
          id: cluster.pillarContent.id,
          title: cluster.pillarContent.title,
          url: cluster.pillarContent.url,
          wordCount: cluster.pillarContent.wordCount,
        } : null,
        supportingContentCount: cluster.supportingContent.length,
        longTailContentCount: cluster.longTailContent.length,
        topics: cluster.topics,
        keywords: cluster.keywords.slice(0, 5),
        authorityScore: Math.round(cluster.authorityScore * 100),
        totalContent: cluster.totalContent,
        contentGaps: cluster.contentGaps,
      })),
      analysis: {
        totalClusters: analysis.totalClusters,
        pillarContentCount: analysis.pillarContentCount,
        supportingContentCount: analysis.supportingContentCount,
        longTailContentCount: analysis.longTailContentCount,
        averageAuthorityScore: Math.round(analysis.averageAuthorityScore * 100),
        recommendations: analysis.recommendations,
      },
      indexedContentCount: indexedContent.length,
    };

    logger.info('Cluster analysis completed', {
      orgId: userOrg.org_id,
      totalClusters: analysis.totalClusters,
      indexedContent: indexedContent.length,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Failed to analyze clusters', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to analyze clusters' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/interlinking/clusters
 * Get saved content clusters
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const clusterId = searchParams.get('id');

    const serviceClient = createServiceClient();

    if (clusterId) {
      // Get specific cluster with members
      const { data: cluster, error: clusterError } = await serviceClient
        .from('content_clusters')
        .select(`
          *,
          members:content_cluster_members(
            *,
            content:content_index(*)
          )
        `)
        .eq('id', clusterId)
        .eq('org_id', userOrg.org_id)
        .single();

      if (clusterError || !cluster) {
        return NextResponse.json(
          { error: 'Cluster not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        cluster,
      });
    }

    // Get all clusters
    const { data: clusters, error } = await serviceClient
      .from('content_clusters')
      .select(`
        *,
        members:content_cluster_members(count)
      `)
      .eq('org_id', userOrg.org_id)
      .order('authority_score', { ascending: false });

    if (error) {
      throw error;
    }

    // Calculate summary stats
    const totalClusters = clusters?.length || 0;
    const avgAuthority = clusters?.reduce((sum, c) => sum + (c.authority_score || 0), 0) / totalClusters || 0;
    const totalContent = clusters?.reduce((sum, c) => sum + (c.total_content || 0), 0) || 0;
    const totalGaps = clusters?.reduce((sum, c) => sum + (c.content_gaps?.length || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      clusters: clusters || [],
      summary: {
        totalClusters,
        averageAuthorityScore: Math.round(avgAuthority),
        totalContent,
        totalContentGaps: totalGaps,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get clusters', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to get clusters' },
      { status: 500 }
    );
  }
}

