/**
 * Site-Aware Interlinking Service
 * 
 * Provides interlinking analysis that respects multi-site publishing.
 * Only suggests links to content on the same target site.
 */

import { logger } from '@/utils/logger';
import { ContentIndexerService, IndexedContent, SiteInfo } from './content-indexer';
import { InterlinkingEngine, InterlinkingRequest, InterlinkingAnalysis, LinkOpportunity } from './interlinking-engine';
import { createServiceClient } from '@/lib/supabase/service';

export interface SiteAwareInterlinkingRequest extends InterlinkingRequest {
  targetSiteId: string;
  targetSiteUrl?: string;
}

export interface SiteAwareInterlinkingResult extends InterlinkingAnalysis {
  targetSiteId: string;
  targetSiteName?: string;
  siteFilterApplied: boolean;
  contentOnTargetSite: number;
}

export class SiteAwareInterlinkingService {
  private orgId: string;
  private supabase;
  private indexer: ContentIndexerService;
  private engine: InterlinkingEngine;

  constructor(orgId: string) {
    this.orgId = orgId;
    this.supabase = createServiceClient();
    this.indexer = new ContentIndexerService(orgId);
    this.engine = new InterlinkingEngine();
  }

  /**
   * Analyze interlinking opportunities for a specific target site
   */
  async analyzeForSite(request: SiteAwareInterlinkingRequest): Promise<SiteAwareInterlinkingResult> {
    try {
      const { targetSiteId, targetSiteUrl, ...baseRequest } = request;

      logger.info('Starting site-aware interlinking analysis', {
        orgId: this.orgId,
        targetSiteId,
        title: request.title,
      });

      // Fetch content only from the target site
      const siteContent = await this.indexer.getContentBySiteId(targetSiteId);

      logger.debug('Fetched site-specific content for interlinking', {
        targetSiteId,
        contentCount: siteContent.length,
      });

      if (siteContent.length === 0) {
        logger.warn('No indexed content found for target site', { targetSiteId });
        
        // Return empty analysis if no content on target site
        return {
          targetSiteId,
          siteFilterApplied: true,
          contentOnTargetSite: 0,
          opportunities: [],
          internalLinks: [],
          externalLinks: [],
          clusterLinks: [],
          totalOpportunities: 0,
          recommendedLinks: 0,
          maxLinks: (request.maxInternalLinks || 5) + (request.maxExternalLinks || 3),
        };
      }

      // Use the standard interlinking engine with filtered content
      const analysis = await this.engine.analyzeInterlinking(baseRequest, siteContent);

      // Enhance results with site context
      const enhancedOpportunities = analysis.opportunities.map(opp => ({
        ...opp,
        targetSiteId,
        targetSiteUrl: targetSiteUrl || opp.targetPage.siteUrl,
      }));

      // Get site name from first content item
      const targetSiteName = siteContent[0]?.siteName;

      logger.info('Site-aware interlinking analysis completed', {
        targetSiteId,
        targetSiteName,
        opportunitiesFound: analysis.totalOpportunities,
        recommendedLinks: analysis.recommendedLinks,
      });

      return {
        ...analysis,
        opportunities: enhancedOpportunities,
        targetSiteId,
        targetSiteName,
        siteFilterApplied: true,
        contentOnTargetSite: siteContent.length,
      };
    } catch (error: any) {
      logger.error('Error in site-aware interlinking analysis', {
        error: error.message,
        targetSiteId: request.targetSiteId,
      });
      throw error;
    }
  }

  /**
   * Get link opportunities that match a specific site URL pattern
   */
  filterOpportunitiesBySiteUrl(
    opportunities: LinkOpportunity[],
    siteUrlPattern: string
  ): LinkOpportunity[] {
    if (!siteUrlPattern) return opportunities;

    // Normalize the pattern (remove trailing slash)
    const normalizedPattern = siteUrlPattern.replace(/\/$/, '').toLowerCase();

    return opportunities.filter(opp => {
      const pageUrl = opp.targetPage.url.toLowerCase();
      return pageUrl.startsWith(normalizedPattern) || 
             pageUrl.includes(normalizedPattern);
    });
  }

  /**
   * Check if an existing link in content points to the correct site
   */
  async validateExistingLink(
    linkUrl: string,
    targetSiteId: string,
    targetSiteUrl?: string
  ): Promise<{
    isValid: boolean;
    issue?: 'broken' | 'wrong_site' | 'not_indexed';
    suggestion?: string;
    correctSiteUrl?: string;
  }> {
    try {
      // Check if URL is external
      if (this.isExternalUrl(linkUrl, targetSiteUrl)) {
        return { isValid: true }; // External links are always valid
      }

      // Look up the linked content in the index
      const indexedContent = await this.findContentByUrl(linkUrl);

      if (!indexedContent) {
        return {
          isValid: false,
          issue: 'not_indexed',
          suggestion: 'This internal link points to content not found in the index',
        };
      }

      // Check if the linked content belongs to the target site
      if (indexedContent.siteId && indexedContent.siteId !== targetSiteId) {
        // Find equivalent content on target site
        const suggestion = await this.findEquivalentOnTargetSite(
          indexedContent,
          targetSiteId
        );

        return {
          isValid: false,
          issue: 'wrong_site',
          suggestion: suggestion
            ? `Replace with: ${suggestion.url}`
            : 'This link points to a different site. Remove or replace it.',
          correctSiteUrl: suggestion?.url,
        };
      }

      return { isValid: true };
    } catch (error: any) {
      logger.error('Error validating existing link', { error: error.message, linkUrl });
      return { isValid: false, issue: 'broken', suggestion: 'Could not validate link' };
    }
  }

  /**
   * Find content in the index by URL
   */
  private async findContentByUrl(url: string): Promise<IndexedContent | null> {
    try {
      const { data, error } = await this.supabase
        .from('content_index')
        .select('*')
        .eq('org_id', this.orgId)
        .eq('url', url)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) return null;

      return {
        id: data.id,
        pageId: data.page_id,
        url: data.url,
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        keywords: data.keywords || [],
        topics: data.topics || [],
        wordCount: data.word_count || 0,
        metadata: data.metadata || {},
        siteId: data.site_id,
        siteName: data.site_name,
        siteUrl: data.site_url,
        indexedAt: data.indexed_at,
        updatedAt: data.updated_at,
      };
    } catch (error: any) {
      logger.error('Error finding content by URL', { error: error.message, url });
      return null;
    }
  }

  /**
   * Find similar content on the target site (for replacement suggestions)
   */
  private async findEquivalentOnTargetSite(
    originalContent: IndexedContent,
    targetSiteId: string
  ): Promise<IndexedContent | null> {
    try {
      // Search by title similarity or keyword overlap
      const { data, error } = await this.supabase
        .from('content_index')
        .select('*')
        .eq('org_id', this.orgId)
        .eq('site_id', targetSiteId)
        .or(`title.ilike.%${originalContent.title.split(' ').slice(0, 3).join('%')}%`)
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        // Try keyword-based search
        const keywords = originalContent.keywords.slice(0, 2);
        if (keywords.length > 0) {
          const { data: keywordData } = await this.supabase
            .from('content_index')
            .select('*')
            .eq('org_id', this.orgId)
            .eq('site_id', targetSiteId)
            .contains('keywords', keywords)
            .limit(1);

          if (keywordData && keywordData.length > 0) {
            return this.mapRowToIndexedContent(keywordData[0]);
          }
        }
        return null;
      }

      return this.mapRowToIndexedContent(data[0]);
    } catch (error: any) {
      logger.error('Error finding equivalent content', { error: error.message });
      return null;
    }
  }

  /**
   * Check if a URL is external (not belonging to the organization's sites)
   */
  private isExternalUrl(url: string, targetSiteUrl?: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // If we have a target site URL, check against it
      if (targetSiteUrl) {
        const targetObj = new URL(targetSiteUrl);
        return urlObj.hostname !== targetObj.hostname;
      }

      // Check against common external patterns
      const externalPatterns = [
        'wikipedia.org',
        'youtube.com',
        'twitter.com',
        'linkedin.com',
        'facebook.com',
        'github.com',
      ];

      return externalPatterns.some(pattern => urlObj.hostname.includes(pattern));
    } catch {
      // If URL parsing fails, assume it's a relative URL (internal)
      return false;
    }
  }

  private mapRowToIndexedContent(row: any): IndexedContent {
    return {
      id: row.id,
      pageId: row.page_id,
      url: row.url,
      title: row.title,
      content: row.content,
      excerpt: row.excerpt,
      keywords: row.keywords || [],
      topics: row.topics || [],
      wordCount: row.word_count || 0,
      metadata: row.metadata || {},
      siteId: row.site_id,
      siteName: row.site_name,
      siteUrl: row.site_url,
      indexedAt: row.indexed_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get statistics about indexed content per site
   */
  async getSiteContentStats(): Promise<Array<{
    siteId: string;
    siteName: string | null;
    siteUrl: string | null;
    contentCount: number;
    lastUpdated: string | null;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('content_index')
        .select('site_id, site_name, site_url, updated_at')
        .eq('org_id', this.orgId)
        .not('site_id', 'is', null);

      if (error) throw error;

      // Group by site
      const siteMap = new Map<string, {
        siteName: string | null;
        siteUrl: string | null;
        contentCount: number;
        lastUpdated: string | null;
      }>();

      for (const row of data || []) {
        const existing = siteMap.get(row.site_id);
        if (existing) {
          existing.contentCount++;
          if (row.updated_at > (existing.lastUpdated || '')) {
            existing.lastUpdated = row.updated_at;
          }
        } else {
          siteMap.set(row.site_id, {
            siteName: row.site_name,
            siteUrl: row.site_url,
            contentCount: 1,
            lastUpdated: row.updated_at,
          });
        }
      }

      return Array.from(siteMap.entries()).map(([siteId, info]) => ({
        siteId,
        ...info,
      }));
    } catch (error: any) {
      logger.error('Error getting site content stats', { error: error.message });
      return [];
    }
  }
}
