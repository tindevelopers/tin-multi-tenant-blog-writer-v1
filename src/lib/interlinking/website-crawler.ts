/**
 * Website Crawler Service
 * Phase 4.1: Core Interlinking System - Webflow API integration and basic crawler
 * 
 * Crawls Webflow CMS collections and static pages to build a content index
 */

import { logger } from '@/utils/logger';
import { getWebflowSites, getWebflowCollections, getWebflowCollectionById, type WebflowCollection } from '@/lib/integrations/webflow-api';

export interface CrawledPage {
  id: string;
  url: string;
  title: string;
  content: string;
  excerpt?: string;
  metadata: {
    type: 'cms' | 'static' | 'external';
    collectionId?: string;
    collectionName?: string;
    publishedAt?: string;
    updatedAt?: string;
    slug?: string;
    tags?: string[];
    categories?: string[];
    author?: string;
  };
  keywords: string[];
  topics: string[];
  wordCount: number;
}

export interface CrawledContent {
  pages: CrawledPage[];
  collections: {
    id: string;
    name: string;
    slug: string;
    itemCount: number;
  }[];
  totalPages: number;
  crawledAt: string;
}

export class WebsiteCrawlerService {
  private apiKey: string;
  private siteId?: string;

  constructor(apiKey: string, siteId?: string) {
    this.apiKey = apiKey;
    this.siteId = siteId;
  }

  /**
   * Crawl all Webflow CMS collections
   */
  async crawlCMSCollections(siteId?: string): Promise<CrawledPage[]> {
    const targetSiteId = siteId || this.siteId;
    if (!targetSiteId) {
      throw new Error('Site ID is required for crawling CMS collections');
    }

    try {
      logger.debug('Starting CMS collection crawl', { siteId: targetSiteId });

      // Get all collections
      const collections = await getWebflowCollections(this.apiKey, targetSiteId);
      logger.debug(`Found ${collections.length} collections`, { collections: collections.map(c => c.displayName) });

      const crawledPages: CrawledPage[] = [];

      // Crawl each collection
      for (const collection of collections) {
        try {
          const pages = await this.crawlCollection(collection);
          crawledPages.push(...pages);
        } catch (error: any) {
          logger.warn(`Failed to crawl collection ${collection.displayName}`, {
            collectionId: collection.id,
            error: error.message,
          });
          // Continue with other collections
        }
      }

      logger.info(`Crawled ${crawledPages.length} CMS pages from ${collections.length} collections`);
      return crawledPages;
    } catch (error: any) {
      logger.error('Error crawling CMS collections', { error: error.message });
      throw error;
    }
  }

  /**
   * Crawl a specific collection
   */
  private async crawlCollection(collection: WebflowCollection): Promise<CrawledPage[]> {
    try {
      logger.debug(`Crawling collection: ${collection.displayName}`, { collectionId: collection.id });

      // Fetch items from collection
      const itemsResponse = await fetch(
        `https://api.webflow.com/v2/collections/${collection.id}/items?limit=100`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      if (!itemsResponse.ok) {
        const errorText = await itemsResponse.text();
        throw new Error(`Failed to fetch items: ${itemsResponse.status} - ${errorText}`);
      }

      const itemsData = await itemsResponse.json();
      const items = itemsData.items || [];

      logger.debug(`Found ${items.length} items in collection ${collection.displayName}`);

      const pages: CrawledPage[] = [];

      for (const item of items) {
        try {
          const page = this.parseCMSItem(item, collection);
          if (page) {
            pages.push(page);
          }
        } catch (error: any) {
          logger.warn(`Failed to parse item ${item.id}`, { error: error.message });
          // Continue with other items
        }
      }

      return pages;
    } catch (error: any) {
      logger.error(`Error crawling collection ${collection.displayName}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Parse a CMS item into a CrawledPage
   */
  private parseCMSItem(item: any, collection: WebflowCollection): CrawledPage | null {
    try {
      const fieldData = item.fieldData || {};
      
      // Extract common fields (these vary by collection)
      const title = fieldData.name || fieldData.title || fieldData['post-title'] || 'Untitled';
      const content = fieldData.content || fieldData.body || fieldData['post-body'] || fieldData['main-content'] || '';
      const excerpt = fieldData.excerpt || fieldData.summary || fieldData['post-summary'] || '';
      const slug = fieldData.slug || item.slug || '';
      const publishedAt = fieldData['publish-date'] || fieldData['published-date'] || item.publishedOn || item.lastPublished;
      const updatedAt = item.lastUpdated || item.publishedOn || publishedAt;

      // Extract tags/categories if available
      const tags = Array.isArray(fieldData.tags) ? fieldData.tags : [];
      const categories = Array.isArray(fieldData.categories) ? fieldData.categories : [];

      // Build URL (Webflow pattern: https://site-slug.webflow.io/collection-slug/item-slug)
      const url = slug ? `/${collection.slug}/${slug}` : `/${collection.slug}/${item.id}`;

      // Extract text content for analysis
      const textContent = this.extractTextFromHTML(content);
      const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;

      // Extract keywords and topics (basic extraction, will be enhanced by AI)
      const keywords = this.extractKeywords(textContent, title);
      const topics = this.extractTopics(textContent, title);

      return {
        id: item.id,
        url,
        title,
        content: textContent,
        excerpt: excerpt || this.generateExcerpt(textContent),
        metadata: {
          type: 'cms',
          collectionId: collection.id,
          collectionName: collection.displayName,
          publishedAt,
          updatedAt,
          slug,
          tags,
          categories,
          author: fieldData.author || fieldData['author-name'],
        },
        keywords,
        topics,
        wordCount,
      };
    } catch (error: any) {
      logger.error('Error parsing CMS item', { error: error.message, itemId: item.id });
      return null;
    }
  }

  /**
   * Extract text from HTML content
   */
  private extractTextFromHTML(html: string): string {
    if (!html) return '';
    
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');
    
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  /**
   * Extract keywords from content (basic extraction)
   */
  private extractKeywords(content: string, title: string): string[] {
    const text = `${title} ${content}`.toLowerCase();
    const words = text.split(/\s+/).filter(w => w.length > 3);
    
    // Count word frequency
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      const cleaned = word.replace(/[^a-z0-9]/g, '');
      if (cleaned.length > 3) {
        wordCounts.set(cleaned, (wordCounts.get(cleaned) || 0) + 1);
      }
    }
    
    // Get top keywords
    const sorted = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    return sorted;
  }

  /**
   * Extract topics from content (basic extraction)
   */
  private extractTopics(content: string, title: string): string[] {
    // This is a basic implementation - will be enhanced by AI analysis
    const topics: string[] = [];
    
    // Extract from title
    const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    topics.push(...titleWords.slice(0, 3));
    
    return topics;
  }

  /**
   * Generate excerpt from content
   */
  private generateExcerpt(content: string, maxLength: number = 200): string {
    const text = content.trim();
    if (text.length <= maxLength) return text;
    
    // Try to cut at sentence boundary
    const truncated = text.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastExclamation = truncated.lastIndexOf('!');
    const lastQuestion = truncated.lastIndexOf('?');
    
    const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
    if (lastSentenceEnd > maxLength * 0.7) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }
    
    return truncated + '...';
  }

  /**
   * Crawl static pages (placeholder for future implementation)
   * Note: Webflow API v2 doesn't provide direct access to static pages
   * This would require web scraping or sitemap parsing
   */
  async crawlStaticPages(siteId?: string): Promise<CrawledPage[]> {
    // TODO: Implement static page crawling via sitemap or web scraping
    logger.debug('Static page crawling not yet implemented');
    return [];
  }

  /**
   * Full website crawl
   */
  async crawlWebsite(siteId?: string): Promise<CrawledContent> {
    const targetSiteId = siteId || this.siteId;
    if (!targetSiteId) {
      throw new Error('Site ID is required for crawling website');
    }

    try {
      logger.info('Starting full website crawl', { siteId: targetSiteId });

      // Crawl CMS collections
      const cmsPages = await this.crawlCMSCollections(targetSiteId);

      // Crawl static pages (future implementation)
      const staticPages = await this.crawlStaticPages(targetSiteId);

      // Get collections metadata
      const collections = await getWebflowCollections(this.apiKey, targetSiteId);
      const collectionsMetadata = collections.map(c => ({
        id: c.id,
        name: c.displayName,
        slug: c.slug,
        itemCount: c.itemCount || 0,
      }));

      const allPages = [...cmsPages, ...staticPages];

      logger.info(`Website crawl completed: ${allPages.length} pages`, {
        cmsPages: cmsPages.length,
        staticPages: staticPages.length,
        collections: collections.length,
      });

      return {
        pages: allPages,
        collections: collectionsMetadata,
        totalPages: allPages.length,
        crawledAt: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Error crawling website', { error: error.message });
      throw error;
    }
  }
}

