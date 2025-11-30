/**
 * Webflow Structure Discovery
 * 
 * Fetches collections (CMS), items, and static pages from Webflow API
 * Based on FRONTEND_INTERLINKING_IMPLEMENTATION_GUIDE.md
 */

import { logger } from '@/utils/logger';

interface WebflowCollection {
  id: string;
  name: string;
  slug: string;
  fields: Array<{
    id: string;
    name: string;
    type: string;
    slug: string;
  }>;
}

interface WebflowItem {
  id: string;
  fieldData: {
    name?: string;
    slug?: string;
    'post-summary'?: string;
    'post-body'?: string;
    'post-author'?: string;
    'post-publish-date'?: string;
    [key: string]: unknown;
  };
  publishedAt?: string;
}

interface WebflowPage {
  id: string;
  displayName: string;
  slug: string;
  lastPublished?: string;
  isDraft?: boolean;
  parentId?: string;
  siteId: string;
}

export interface ExistingContent {
  id: string;
  title: string;
  url: string;
  slug: string;
  keywords: string[];
  published_at: string;
  type: 'cms' | 'static'; // NEW: Distinguish CMS vs static pages
}

/**
 * Extract keywords from text (simple extraction)
 */
function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  if (!text) return [];
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  // Count word frequency
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // Return top keywords
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Fetch static pages from Webflow
 */
async function fetchWebflowPages(
  apiToken: string,
  siteId: string
): Promise<WebflowPage[]> {
  try {
    const pagesResponse = await fetch(
      `https://api.webflow.com/v2/sites/${siteId}/pages`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept-Version': '1.0.0',
          'accept': 'application/json',
        }
      }
    );
    
    if (!pagesResponse.ok) {
      logger.warn('Failed to fetch Webflow pages', {
        status: pagesResponse.status,
        statusText: pagesResponse.statusText,
      });
      return [];
    }
    
    const data = await pagesResponse.json();
    // Webflow API v2 returns pages in a 'pages' array
    return data.pages || data || [];
  } catch (error: any) {
    logger.warn('Error fetching Webflow pages', { error: error.message });
    return [];
  }
}

/**
 * Discover Webflow structure and existing content (CMS + Static Pages)
 */
export async function discoverWebflowStructure(
  apiToken: string,
  siteId: string
): Promise<{
  collections: WebflowCollection[];
  static_pages: WebflowPage[];
  existing_content: ExistingContent[];
}> {
  const existingContent: ExistingContent[] = [];
  
  // 1. Fetch CMS collections
  let collections: WebflowCollection[] = [];
  try {
    const collectionsResponse = await fetch(
      `https://api.webflow.com/v2/sites/${siteId}/collections`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept-Version': '1.0.0',
          'accept': 'application/json',
        }
      }
    );
    
    if (collectionsResponse.ok) {
      const data = await collectionsResponse.json();
      collections = data.collections || data || [];
    } else {
      logger.warn('Failed to fetch Webflow collections', {
        status: collectionsResponse.status,
        statusText: collectionsResponse.statusText,
      });
    }
  } catch (error: any) {
    logger.warn('Error fetching Webflow collections', { error: error.message });
  }
  
  // 2. For each collection, fetch CMS items
  for (const collection of collections) {
    try {
      const itemsResponse = await fetch(
        `https://api.webflow.com/v2/collections/${collection.id}/items`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Accept-Version': '1.0.0',
            'accept': 'application/json',
          }
        }
      );
      
      if (!itemsResponse.ok) {
        logger.warn(`Failed to fetch items for collection ${collection.id}`);
        continue;
      }
      
      const data = await itemsResponse.json();
      const items = data.items || [];
      
      // Transform CMS items to interlinking format
      for (const item of items) {
        const slug = item.fieldData?.slug || 
                    item.fieldData?.name?.toLowerCase().replace(/\s+/g, '-') || 
                    `item-${item.id}`;
        
        // Build URL - try to get site domain from siteId or use default pattern
        const url = `https://${siteId}.webflow.io/${slug}`;
        
        // Extract keywords from title and content
        const title = item.fieldData?.name || item.fieldData?.title || '';
        const content = item.fieldData?.['post-body'] || item.fieldData?.content || '';
        const keywords = extractKeywords(title + ' ' + content);
        
        existingContent.push({
          id: item.id,
          title: title || slug,
          url: url,
          slug: slug,
          keywords: keywords,
          published_at: item.publishedAt || item.fieldData?.['post-publish-date'] || new Date().toISOString(),
          type: 'cms',
        });
      }
    } catch (error: any) {
      logger.warn(`Error processing collection ${collection.id}`, { error: error.message });
      continue;
    }
  }
  
  // 3. Fetch static pages
  const staticPages = await fetchWebflowPages(apiToken, siteId);
  
  // Transform static pages to interlinking format
  for (const page of staticPages) {
    // Skip draft pages and system pages
    if (page.isDraft || page.slug === '404' || page.slug === 'sitemap') {
      continue;
    }
    
    const slug = page.slug || page.displayName?.toLowerCase().replace(/\s+/g, '-') || `page-${page.id}`;
    const url = `https://${siteId}.webflow.io/${slug}`;
    
    // Extract keywords from page display name
    const title = page.displayName || slug;
    const keywords = extractKeywords(title);
    
    existingContent.push({
      id: page.id,
      title: title,
      url: url,
      slug: slug,
      keywords: keywords,
      published_at: page.lastPublished || new Date().toISOString(),
      type: 'static',
    });
  }
  
  logger.info('Webflow structure discovery completed', {
    collectionsCount: collections.length,
    staticPagesCount: staticPages.length,
    totalContentItems: existingContent.length,
    cmsItems: existingContent.filter(c => c.type === 'cms').length,
    staticItems: existingContent.filter(c => c.type === 'static').length,
  });
  
  return {
    collections: collections,
    static_pages: staticPages,
    existing_content: existingContent
  };
}

