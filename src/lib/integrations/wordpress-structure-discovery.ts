/**
 * WordPress Structure Discovery
 * 
 * Fetches post types and posts from WordPress REST API
 * Based on FRONTEND_INTERLINKING_IMPLEMENTATION_GUIDE.md
 */

interface ExistingContent {
  id: string;
  title: string;
  url: string;
  slug: string;
  keywords: string[];
  categories?: string[];
  published_at: string;
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  if (!text) return [];
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Discover WordPress structure and existing content
 */
export async function discoverWordPressStructure(
  baseUrl: string,
  username: string,
  password: string
): Promise<{
  post_types: Array<{ name: string; label: string }>;
  existing_content: ExistingContent[];
}> {
  // Ensure baseUrl doesn't end with slash
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  // 1. Fetch post types
  const postTypesResponse = await fetch(
    `${cleanBaseUrl}/wp-json/wp/v2/types`,
    {
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`
      }
    }
  );
  
  if (!postTypesResponse.ok) {
    throw new Error(`Failed to fetch WordPress post types: ${postTypesResponse.statusText}`);
  }
  
  const postTypes = await postTypesResponse.json();
  
  // 2. Fetch posts for each post type
  const existingContent: ExistingContent[] = [];
  
  for (const [postType, typeInfo] of Object.entries(postTypes)) {
    try {
      const postsResponse = await fetch(
        `${cleanBaseUrl}/wp-json/wp/v2/${postType}?per_page=100&status=publish`,
        {
          headers: {
            'Authorization': `Basic ${btoa(`${username}:${password}`)}`
          }
        }
      );
      
      if (!postsResponse.ok) {
        console.warn(`Failed to fetch posts for post type ${postType}`);
        continue;
      }
      
      const posts = await postsResponse.json();
      
      // 3. Transform posts to interlinking format
      for (const post of posts) {
        const title = post.title?.rendered || '';
        const content = post.content?.rendered || '';
        const link = post.link || '';
        const slug = post.slug || '';
        
        // Extract keywords from title, content, and tags
        const titleKeywords = extractKeywords(title);
        const contentKeywords = extractKeywords(content);
        const tagKeywords = (post.tags || []).map((tag: any) => tag.name || '').filter(Boolean);
        
        const keywords = [...new Set([...titleKeywords, ...contentKeywords, ...tagKeywords])];
        
        existingContent.push({
          id: String(post.id),
          title: title,
          url: link,
          slug: slug,
          keywords: keywords,
          categories: (post.categories || []).map((cat: any) => cat.name || String(cat)).filter(Boolean),
          published_at: post.date || new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn(`Error processing post type ${postType}:`, error);
      continue;
    }
  }
  
  return {
    post_types: Object.values(postTypes).map((type: any) => ({
      name: type.name,
      label: type.name
    })),
    existing_content: existingContent
  };
}

