/**
 * Internal Links Preview API
 * 
 * Returns link suggestions WITHOUT inserting them into content.
 * Used by the human review UI to show options before insertion.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { logger } from '@/utils/logger';
import { getWebflowIntegration } from '@/lib/integrations/webflow-hyperlink-service';
import { analyzeInterlinkingEnhanced } from '@/lib/interlinking/enhanced-interlinking-service';

export interface LinkPreviewSuggestion {
  id: string;
  anchorText: string;
  url: string;
  targetTitle: string;
  type: 'cms' | 'static';
  relevanceScore: number;
  context: string;
  reason: string;
}

export interface LinkPreviewResponse {
  success: boolean;
  suggestions: LinkPreviewSuggestion[];
  siteInfo: {
    siteId: string;
    siteName?: string;
    publishedDomain?: string;
    totalPagesAvailable: number;
    lastScanDate?: string;
  } | null;
  error?: string;
}

/**
 * POST /api/internal-links/preview
 * 
 * Get link suggestions for content without inserting them
 */
export async function POST(request: NextRequest): Promise<NextResponse<LinkPreviewResponse>> {
  try {
    const body = await request.json();
    const {
      content,
      title,
      keywords = [],
      org_id,
      site_id,
      max_suggestions = 10,
    } = body;

    if (!content) {
      return NextResponse.json({
        success: false,
        suggestions: [],
        siteInfo: null,
        error: 'Content is required',
      }, { status: 400 });
    }

    // Get org_id from auth if not provided
    let orgId = org_id;
    if (!orgId) {
      const supabase = createServiceClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('org_id')
          .eq('user_id', user.id)
          .single();
        orgId = userProfile?.org_id;
      }
    }

    if (!orgId) {
      return NextResponse.json({
        success: false,
        suggestions: [],
        siteInfo: null,
        error: 'Organization ID is required',
      }, { status: 400 });
    }

    // Get Webflow integration
    const webflowConfig = await getWebflowIntegration(orgId);
    if (!webflowConfig) {
      return NextResponse.json({
        success: false,
        suggestions: [],
        siteInfo: null,
        error: 'No Webflow integration found. Please connect your Webflow site first.',
      }, { status: 404 });
    }

    // Use explicit site_id if provided, otherwise use from integration
    const targetSiteId = site_id || webflowConfig.siteId;

    // Get stored scan data
    const supabase = createServiceClient();
    
    let query = supabase
      .from('webflow_structure_scans')
      .select('existing_content, scan_completed_at, total_content_items, published_domain, site_name')
      .eq('org_id', orgId)
      .eq('status', 'completed')
      .order('scan_completed_at', { ascending: false })
      .limit(1);

    // Filter by site_id if provided
    if (targetSiteId) {
      query = query.eq('site_id', targetSiteId);
    }

    const { data: latestScan, error: scanError } = await query.single();

    if (scanError || !latestScan?.existing_content) {
      return NextResponse.json({
        success: false,
        suggestions: [],
        siteInfo: null,
        error: 'No site scan available. Please scan your Webflow site first.',
      }, { status: 404 });
    }

    let existingContent = latestScan.existing_content as any[];
    const publishedDomain = latestScan.published_domain as string | undefined;

    // Fix URLs to use published domain
    if (publishedDomain) {
      const cleanDomain = publishedDomain.replace(/\/$/, '');
      const stagingPattern = /https?:\/\/[^\/]+\.webflow\.io/;
      
      existingContent = existingContent.map((item: any) => {
        const originalUrl = item.url || '';
        if (stagingPattern.test(originalUrl) || !originalUrl.startsWith('http')) {
          const urlPath = originalUrl.replace(/https?:\/\/[^\/]+/, '');
          const pathToUse = urlPath || `/${item.slug || ''}`;
          return {
            ...item,
            url: `${cleanDomain}${pathToUse.startsWith('/') ? pathToUse : '/' + pathToUse}`,
          };
        }
        return item;
      });
    }

    logger.info('Generating link preview suggestions', {
      orgId,
      siteId: targetSiteId,
      contentLength: content.length,
      existingContentCount: existingContent.length,
    });

    // Use enhanced interlinking service to get suggestions
    const suggestions = await analyzeInterlinkingEnhanced(
      content,
      title || 'Untitled',
      keywords,
      existingContent,
      {
        maxLinks: max_suggestions,
        minRelevanceScore: 0.2, // Lower threshold to show more options
        enableLazyLoading: false, // Don't fetch full content for preview
      }
    );

    // Format suggestions for preview
    const formattedSuggestions: LinkPreviewSuggestion[] = suggestions.map((s, index) => ({
      id: `suggestion-${index}-${Date.now()}`,
      anchorText: s.anchor_text,
      url: s.url,
      targetTitle: existingContent.find(c => c.url === s.url)?.title || s.anchor_text,
      type: s.type,
      relevanceScore: Math.round(s.relevance_score),
      context: s.context || `Link to related content about ${s.anchor_text}`,
      reason: `Relevance: ${Math.round(s.relevance_score)}% - ${s.type === 'cms' ? 'Blog post' : 'Static page'}`,
    }));

    logger.info('Link preview generated', {
      suggestionsCount: formattedSuggestions.length,
      topScore: formattedSuggestions[0]?.relevanceScore || 0,
    });

    return NextResponse.json({
      success: true,
      suggestions: formattedSuggestions,
      siteInfo: {
        siteId: targetSiteId,
        siteName: latestScan.site_name || undefined,
        publishedDomain: publishedDomain || undefined,
        totalPagesAvailable: existingContent.length,
        lastScanDate: latestScan.scan_completed_at,
      },
    });

  } catch (error: any) {
    logger.error('Error generating link preview', { error: error.message });
    return NextResponse.json({
      success: false,
      suggestions: [],
      siteInfo: null,
      error: error.message || 'Failed to generate link preview',
    }, { status: 500 });
  }
}

/**
 * GET /api/internal-links/preview
 * 
 * Get site scan status for link preview availability
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id');
    const orgId = searchParams.get('org_id');

    if (!orgId && !siteId) {
      return NextResponse.json({
        success: false,
        error: 'org_id or site_id is required',
      }, { status: 400 });
    }

    const supabase = createServiceClient();

    let query = supabase
      .from('webflow_structure_scans')
      .select('scan_id, status, scan_completed_at, total_content_items, site_name, published_domain')
      .eq('status', 'completed')
      .order('scan_completed_at', { ascending: false })
      .limit(1);

    if (orgId) {
      query = query.eq('org_id', orgId);
    }
    if (siteId) {
      query = query.eq('site_id', siteId);
    }

    const { data: scan, error } = await query.single();

    if (error || !scan) {
      return NextResponse.json({
        success: true,
        available: false,
        message: 'No scan available for this site',
      });
    }

    return NextResponse.json({
      success: true,
      available: true,
      scan: {
        scanId: scan.scan_id,
        status: scan.status,
        completedAt: scan.scan_completed_at,
        totalPages: scan.total_content_items,
        siteName: scan.site_name,
        publishedDomain: scan.published_domain,
      },
    });

  } catch (error: any) {
    logger.error('Error checking link preview availability', { error: error.message });
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to check availability',
    }, { status: 500 });
  }
}

