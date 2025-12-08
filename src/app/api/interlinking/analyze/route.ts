/**
 * Interlinking Analysis API
 * 
 * Analyzes content and generates interlinking suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { ContentIndexerService } from '@/lib/interlinking/content-indexer';
import { InterlinkingEngine } from '@/lib/interlinking/interlinking-engine';
import { ExternalLinkFinderService, ExternalLinkOpportunity } from '@/lib/interlinking/external-link-finder';
import { logger } from '@/utils/logger';

/**
 * POST /api/interlinking/analyze
 * Analyze content and get interlinking suggestions
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
    const {
      content,
      title,
      keywords = [],
      topics = [],
      postId,
      maxInternalLinks = 5,
      maxExternalLinks = 3,
      includeExternal = true,
    } = body;

    if (!content || !title) {
      return NextResponse.json(
        { error: 'Content and title are required' },
        { status: 400 }
      );
    }

    logger.info('Analyzing content for interlinking', {
      orgId: userOrg.org_id,
      titleLength: title.length,
      contentLength: content.length,
      keywordsCount: keywords.length,
    });

    // Get indexed content
    const indexer = new ContentIndexerService(userOrg.org_id);
    const indexedContent = await indexer.getAllIndexedContent();

    if (indexedContent.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No indexed content available. Please crawl your website first.',
        suggestions: {
          internal: [],
          external: [],
          cluster: [],
        },
        metadata: {
          indexedContentCount: 0,
          analysisComplete: false,
        },
      });
    }

    // Extract topics if not provided
    const extractedTopics = topics.length > 0 ? topics : extractTopicsFromContent(content, title);

    // Analyze internal linking opportunities
    const interlinkingEngine = new InterlinkingEngine();
    const analysis = await interlinkingEngine.analyzeInterlinking(
      {
        content,
        title,
        keywords,
        topics: extractedTopics,
        maxInternalLinks,
        maxExternalLinks,
      },
      indexedContent
    );

    // Find external linking opportunities
    let externalAnalysis: {
      opportunities: ExternalLinkOpportunity[];
      authorityLinks: ExternalLinkOpportunity[];
      citationLinks: ExternalLinkOpportunity[];
      resourceLinks: ExternalLinkOpportunity[];
      totalOpportunities: number;
    } = { opportunities: [], authorityLinks: [], citationLinks: [], resourceLinks: [], totalOpportunities: 0 };
    
    if (includeExternal) {
      const externalLinkFinder = new ExternalLinkFinderService();
      externalAnalysis = await externalLinkFinder.findExternalLinks({
        content,
        title,
        keywords,
        topics: extractedTopics,
        maxLinks: maxExternalLinks,
      });
    }

    // Save suggestions to database if postId provided
    if (postId) {
      const serviceClient = createServiceClient();
      
      // Delete existing suggestions for this post
      await serviceClient
        .from('interlinking_suggestions')
        .delete()
        .eq('source_post_id', postId);

      // Insert new suggestions
      const suggestions = [
        ...analysis.internalLinks.map(link => ({
          org_id: userOrg.org_id,
          source_post_id: postId,
          target_content_id: link.targetPage.id,
          target_url: link.targetPage.url,
          anchor_text: link.anchorText,
          placement: link.placement,
          link_type: 'internal',
          relevance_score: Math.round(link.relevanceScore * 100),
          authority_score: Math.round(link.authorityScore * 100),
          link_value: Math.round(link.linkValue * 100),
          reason: link.reason,
          context: link.context,
        })),
        ...analysis.clusterLinks.map(link => ({
          org_id: userOrg.org_id,
          source_post_id: postId,
          target_content_id: link.targetPage.id,
          target_url: link.targetPage.url,
          anchor_text: link.anchorText,
          placement: link.placement,
          link_type: 'cluster',
          relevance_score: Math.round(link.relevanceScore * 100),
          authority_score: Math.round(link.authorityScore * 100),
          link_value: Math.round(link.linkValue * 100),
          reason: link.reason,
          context: link.context,
        })),
        ...externalAnalysis.opportunities.map(link => ({
          org_id: userOrg.org_id,
          source_post_id: postId,
          target_url: link.url,
          anchor_text: link.anchorText,
          placement: 'body',
          link_type: 'external',
          relevance_score: Math.round(link.relevanceScore * 100),
          authority_score: Math.round(link.authorityScore * 100),
          link_value: Math.round((link.relevanceScore + link.authorityScore) / 2 * 100),
          reason: link.reason,
          context: link.context,
        })),
      ];

      if (suggestions.length > 0) {
        await serviceClient
          .from('interlinking_suggestions')
          .insert(suggestions);
      }
    }

    // Format response
    const response = {
      success: true,
      suggestions: {
        internal: analysis.internalLinks.map(link => ({
          targetUrl: link.targetPage.url,
          targetTitle: link.targetPage.title,
          anchorText: link.anchorText,
          placement: link.placement,
          relevanceScore: Math.round(link.relevanceScore * 100),
          authorityScore: Math.round(link.authorityScore * 100),
          linkValue: Math.round(link.linkValue * 100),
          reason: link.reason,
          context: link.context,
        })),
        external: externalAnalysis.opportunities.map(link => ({
          targetUrl: link.url,
          targetTitle: link.title,
          domain: link.domain,
          anchorText: link.anchorText,
          linkType: link.linkType,
          relevanceScore: Math.round(link.relevanceScore * 100),
          authorityScore: Math.round(link.authorityScore * 100),
          reason: link.reason,
          context: link.context,
        })),
        cluster: analysis.clusterLinks.map(link => ({
          targetUrl: link.targetPage.url,
          targetTitle: link.targetPage.title,
          anchorText: link.anchorText,
          placement: link.placement,
          relevanceScore: Math.round(link.relevanceScore * 100),
          reason: link.reason,
        })),
      },
      metadata: {
        indexedContentCount: indexedContent.length,
        totalInternalOpportunities: analysis.internalLinks.length,
        totalExternalOpportunities: externalAnalysis.totalOpportunities,
        totalClusterOpportunities: analysis.clusterLinks.length,
        recommendedLinks: analysis.recommendedLinks,
        analysisComplete: true,
      },
    };

    logger.info('Interlinking analysis completed', {
      orgId: userOrg.org_id,
      internalLinks: analysis.internalLinks.length,
      externalLinks: externalAnalysis.totalOpportunities,
      clusterLinks: analysis.clusterLinks.length,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Failed to analyze interlinking', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to analyze interlinking' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/interlinking/analyze?postId=xxx
 * Get saved interlinking suggestions for a post
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const { data: suggestions, error } = await serviceClient
      .from('interlinking_suggestions')
      .select('*')
      .eq('source_post_id', postId)
      .eq('org_id', userOrg.org_id)
      .order('link_value', { ascending: false });

    if (error) {
      throw error;
    }

    // Group by type
    const grouped = {
      internal: suggestions?.filter(s => s.link_type === 'internal') || [],
      external: suggestions?.filter(s => s.link_type === 'external') || [],
      cluster: suggestions?.filter(s => s.link_type === 'cluster') || [],
    };

    return NextResponse.json({
      success: true,
      suggestions: grouped,
      total: suggestions?.length || 0,
    });
  } catch (error: any) {
    logger.error('Failed to get interlinking suggestions', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}

// Helper function to extract topics from content
function extractTopicsFromContent(content: string, title: string): string[] {
  const text = `${title} ${content}`.toLowerCase();
  
  // Remove HTML tags
  const cleanText = text.replace(/<[^>]+>/g, ' ');
  
  // Extract words
  const words = cleanText.split(/\s+/).filter(w => w.length > 3);
  
  // Count word frequency
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    const cleaned = word.replace(/[^a-z0-9]/g, '');
    if (cleaned.length > 3) {
      wordCounts.set(cleaned, (wordCounts.get(cleaned) || 0) + 1);
    }
  }
  
  // Return top topics
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

