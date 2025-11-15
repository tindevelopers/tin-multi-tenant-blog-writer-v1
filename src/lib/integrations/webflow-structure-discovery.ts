/**
 * Webflow Structure Discovery
 * 
 * Fetches collections and items from Webflow API
 * Based on FRONTEND_INTERLINKING_IMPLEMENTATION_GUIDE.md
 */

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

interface ExistingContent {
  id: string;
  title: string;
  url: string;
  slug: string;
  keywords: string[];
  published_at: string;
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
 * Discover Webflow structure and existing content
 */
export async function discoverWebflowStructure(
  apiToken: string,
  siteId: string
): Promise<{
  collections: WebflowCollection[];
  existing_content: ExistingContent[];
}> {
  // 1. Fetch collections
  const collectionsResponse = await fetch(
    `https://api.webflow.com/v2/sites/${siteId}/collections`,
    {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept-Version': '1.0.0'
      }
    }
  );
  
  if (!collectionsResponse.ok) {
    throw new Error(`Failed to fetch Webflow collections: ${collectionsResponse.statusText}`);
  }
  
  const collections: WebflowCollection[] = await collectionsResponse.json();
  
  // 2. For each collection, fetch items
  const existingContent: ExistingContent[] = [];
  
  for (const collection of collections) {
    try {
      const itemsResponse = await fetch(
        `https://api.webflow.com/v2/collections/${collection.id}/items`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Accept-Version': '1.0.0'
          }
        }
      );
      
      if (!itemsResponse.ok) {
        console.warn(`Failed to fetch items for collection ${collection.id}`);
        continue;
      }
      
      const { items } = await itemsResponse.json();
      
      // 3. Transform items to interlinking format
      for (const item of items) {
        const slug = item.fieldData?.slug || 
                    item.fieldData?.name?.toLowerCase().replace(/\s+/g, '-') || 
                    `item-${item.id}`;
        const url = `https://${siteId}.webflow.io/${slug}`;
        
        // Extract keywords from title and content
        const title = item.fieldData?.name || '';
        const content = item.fieldData?.['post-body'] || '';
        const keywords = extractKeywords(title + ' ' + content);
        
        existingContent.push({
          id: item.id,
          title: title,
          url: url,
          slug: slug,
          keywords: keywords,
          published_at: item.publishedAt || item.fieldData?.['post-publish-date'] || new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn(`Error processing collection ${collection.id}:`, error);
      continue;
    }
  }
  
  return {
    collections: collections,
    existing_content: existingContent
  };
}

