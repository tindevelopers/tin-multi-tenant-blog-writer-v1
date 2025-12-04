/**
 * Webflow Structure Discovery
 * 
 * Fetches collections (CMS), items, and static pages from Webflow API
 * Based on FRONTEND_INTERLINKING_IMPLEMENTATION_GUIDE.md
 */

import { logger } from '@/utils/logger';
import { getWebflowPublishedDomain } from './webflow-api';

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const pagesResponse = await fetch(
      `https://api.webflow.com/v2/sites/${siteId}/pages`,
      {
        headers: {
          'authorization': `Bearer ${apiToken}`,
          'accept': 'application/json',
        },
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!pagesResponse.ok) {
      const errorText = await pagesResponse.text();
      logger.warn('Failed to fetch Webflow pages', {
        status: pagesResponse.status,
        statusText: pagesResponse.statusText,
        error: errorText,
        siteId,
      });
      return [];
    }
    
    const data = await pagesResponse.json();
    // Webflow API v2 returns pages in a 'pages' array
    const pages = data.pages || data || [];
    logger.debug('Fetched Webflow pages', { count: pages.length, siteId });
    return pages;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      logger.error('Timeout fetching Webflow pages', { siteId, timeout: '30s' });
      throw new Error('Timeout fetching Webflow pages: Request exceeded 30 seconds');
    }
    logger.warn('Error fetching Webflow pages', { error: error.message, siteId });
    return [];
  }
}

/**
 * Discover Webflow structure and existing content (CMS + Static Pages)
 */
export async function discoverWebflowStructure(
  apiToken: string,
  siteId: string,
  customDomain?: string // Optional: user-configured custom domain
): Promise<{
  collections: WebflowCollection[];
  static_pages: WebflowPage[];
  existing_content: ExistingContent[];
  published_domain: string;
}> {
  const existingContent: ExistingContent[] = [];
  
  // Get the published domain for URL construction
  let publishedDomain = customDomain;
  if (!publishedDomain) {
    const fetchedDomain = await getWebflowPublishedDomain(apiToken, siteId);
    publishedDomain = fetchedDomain || undefined;
  }
  // Fallback to staging domain if all else fails
  if (!publishedDomain) {
    publishedDomain = `https://${siteId}.webflow.io`;
  }
  // Ensure no trailing slash
  publishedDomain = publishedDomain.replace(/\/$/, '');
  
  logger.info('Using published domain for URLs', { publishedDomain, siteId });
  
  // 1. Fetch CMS collections
  let collections: WebflowCollection[] = [];
  const collectionsController = new AbortController();
  const collectionsTimeoutId = setTimeout(() => collectionsController.abort(), 30000); // 30 second timeout
  
  try {
    logger.debug('Fetching Webflow collections', { siteId });
    const collectionsResponse = await fetch(
      `https://api.webflow.com/v2/sites/${siteId}/collections`,
      {
        headers: {
          'authorization': `Bearer ${apiToken}`,
          'accept': 'application/json',
        },
        signal: collectionsController.signal,
      }
    );
    
    clearTimeout(collectionsTimeoutId);
    
    if (collectionsResponse.ok) {
      const data = await collectionsResponse.json();
      collections = data.collections || data || [];
      logger.info('Fetched Webflow collections', { count: collections.length, siteId });
    } else {
      const errorText = await collectionsResponse.text();
      logger.warn('Failed to fetch Webflow collections', {
        status: collectionsResponse.status,
        statusText: collectionsResponse.statusText,
        error: errorText,
        siteId,
      });
    }
  } catch (error: any) {
    clearTimeout(collectionsTimeoutId);
    if (error.name === 'AbortError') {
      logger.error('Timeout fetching Webflow collections', { siteId, timeout: '30s' });
      throw new Error('Timeout fetching Webflow collections: Request exceeded 30 seconds');
    }
    logger.warn('Error fetching Webflow collections', { error: error.message, siteId });
  }
  
  // 2. For each collection, fetch CMS items (with pagination support)
  for (const collection of collections) {
    try {
      logger.info(`Fetching items for collection: ${collection.name} (${collection.id})`, { 
        collectionId: collection.id,
        collectionName: collection.name,
        siteId 
      });
      
      let allItems: WebflowItem[] = [];
      let offset = 0;
      const limit = 100; // Webflow API v2 default limit
      let hasMore = true;
      
      // Fetch items with pagination
      // Try without pagination first, then with pagination if needed
      while (hasMore) {
        // Build URL - try with pagination params, but Webflow API v2 might not need them
        const url = offset === 0 
          ? `https://api.webflow.com/v2/collections/${collection.id}/items`
          : `https://api.webflow.com/v2/collections/${collection.id}/items?offset=${offset}&limit=${limit}`;
        
        const itemsController = new AbortController();
        const itemsTimeoutId = setTimeout(() => itemsController.abort(), 30000); // 30 second timeout per request
        
        let itemsResponse: Response;
        try {
          itemsResponse = await fetch(
            url,
            {
              headers: {
                'authorization': `Bearer ${apiToken}`,
                'accept': 'application/json',
              },
              signal: itemsController.signal,
            }
          );
          clearTimeout(itemsTimeoutId);
        } catch (fetchError: any) {
          clearTimeout(itemsTimeoutId);
          if (fetchError.name === 'AbortError') {
            logger.error(`Timeout fetching items for collection ${collection.id}`, { 
              collectionId: collection.id,
              collectionName: collection.name,
              offset,
              timeout: '30s'
            });
            throw new Error(`Timeout fetching items for collection ${collection.name}: Request exceeded 30 seconds`);
          }
          throw fetchError;
        }
        
        if (!itemsResponse.ok) {
          const errorText = await itemsResponse.text();
          logger.warn(`Failed to fetch items for collection ${collection.id}`, {
            status: itemsResponse.status,
            statusText: itemsResponse.statusText,
            error: errorText,
            collectionId: collection.id,
            collectionName: collection.name,
            offset,
          });
          break; // Stop pagination on error
        }
        
        const data = await itemsResponse.json();
        
        // Log full response structure for debugging (first batch only)
        if (offset === 0) {
          logger.info(`API response structure for collection ${collection.id}`, {
            collectionName: collection.name,
            responseType: Array.isArray(data) ? 'array' : typeof data,
            responseKeys: Array.isArray(data) ? `array[${data.length}]` : Object.keys(data),
            sampleResponse: JSON.stringify(data).substring(0, 500), // First 500 chars
          });
        }
        
        // Handle different response formats:
        // - { items: [...] } (nested)
        // - { data: { items: [...] } } (double nested)
        // - [...] (direct array)
        let items: WebflowItem[] = [];
        if (Array.isArray(data)) {
          items = data;
        } else if (data.items && Array.isArray(data.items)) {
          items = data.items;
        } else if (data.data && Array.isArray(data.data)) {
          items = data.data;
        } else if (data.data && data.data.items && Array.isArray(data.data.items)) {
          items = data.data.items;
        } else {
          // Log unexpected format
          logger.warn(`Unexpected response format for collection ${collection.id}`, {
            collectionName: collection.name,
            responseKeys: Object.keys(data),
            responseType: typeof data,
          });
        }
        
        logger.debug(`Fetched items batch for collection ${collection.id}`, { 
          collectionName: collection.name,
          batchSize: items.length,
          offset,
          responseKeys: Object.keys(data),
        });
        
        allItems = allItems.concat(items);
        
        // Check if there are more items to fetch
        // Webflow API v2 might return pagination info in different formats
        const total = data.total || data.pagination?.total || (data.data?.pagination?.total);
        const currentCount = allItems.length;
        
        if (items.length < limit || (total && currentCount >= total)) {
          hasMore = false;
        } else {
          offset += limit;
        }
        
        // Safety limit to prevent infinite loops
        if (offset > 10000) {
          logger.warn(`Pagination limit reached for collection ${collection.id}`, {
            collectionName: collection.name,
            totalItems: allItems.length,
          });
          break;
        }
      }
      
      logger.info(`Fetched all items for collection ${collection.id}`, { 
        collectionName: collection.name,
        totalItemCount: allItems.length 
      });
      
      // Transform CMS items to interlinking format
      for (const item of allItems) {
        // Safely extract slug - handle unknown types
        let slug: string = `item-${item.id}`;
        const slugField = item.fieldData?.slug;
        if (typeof slugField === 'string' && slugField) {
          slug = slugField;
        } else {
          const nameField = item.fieldData?.name;
          if (typeof nameField === 'string' && nameField) {
            slug = nameField.toLowerCase().replace(/\s+/g, '-');
          }
        }
        
        // Build URL using the published domain
        const url = `${publishedDomain}/${slug}`;
        
        // Extract keywords from title and content
        // Handle unknown types from fieldData index signature
        const titleValue = item.fieldData?.name || item.fieldData?.title;
        const titleStr: string = typeof titleValue === 'string' ? titleValue : '';
        const contentValue = item.fieldData?.['post-body'] || item.fieldData?.content;
        const contentStr: string = typeof contentValue === 'string' ? contentValue : '';
        const keywords = extractKeywords(titleStr + ' ' + contentStr);
        
        // Ensure title is always a string
        const finalTitle: string = titleStr || slug;
        
        existingContent.push({
          id: item.id,
          title: finalTitle,
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
    
    // Safely extract slug - handle potential non-string values
    let slug: string = `page-${page.id}`;
    if (typeof page.slug === 'string' && page.slug) {
      slug = page.slug;
    } else if (typeof page.displayName === 'string' && page.displayName) {
      slug = page.displayName.toLowerCase().replace(/\s+/g, '-');
    }
    // Build URL using the published domain
    const url = `${publishedDomain}/${slug}`;
    
    // Extract keywords from page display name
    const titleValue = page.displayName;
    const title: string = typeof titleValue === 'string' ? titleValue : slug;
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
    publishedDomain,
  });
  
  return {
    collections: collections,
    static_pages: staticPages,
    existing_content: existingContent,
    published_domain: publishedDomain,
  };
}

