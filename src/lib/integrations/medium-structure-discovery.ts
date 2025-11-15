/**
 * Medium Structure Discovery
 * 
 * Fetches publications and posts from Medium API
 * Based on FRONTEND_INTERLINKING_IMPLEMENTATION_GUIDE.md
 */

interface ExistingContent {
  id: string;
  title: string;
  url: string;
  slug: string;
  keywords: string[];
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
 * Discover Medium structure and existing content
 */
export async function discoverMediumStructure(
  accessToken: string,
  userId: string
): Promise<{
  publications: Array<{ id: string; name: string; description: string }>;
  existing_content: ExistingContent[];
}> {
  // 1. Fetch user's publications
  const publicationsResponse = await fetch(
    `https://api.medium.com/v1/users/${userId}/publications`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  if (!publicationsResponse.ok) {
    throw new Error(`Failed to fetch Medium publications: ${publicationsResponse.statusText}`);
  }
  
  const { data: publications } = await publicationsResponse.json();
  
  // 2. Fetch posts from each publication
  const existingContent: ExistingContent[] = [];
  
  for (const publication of publications) {
    try {
      const postsResponse = await fetch(
        `https://api.medium.com/v1/publications/${publication.id}/posts`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      if (!postsResponse.ok) {
        console.warn(`Failed to fetch posts for publication ${publication.id}`);
        continue;
      }
      
      const { data: posts } = await postsResponse.json();
      
      // 3. Transform posts to interlinking format
      for (const post of posts) {
        const keywords = extractKeywords(post.title + ' ' + (post.content || ''));
        
        existingContent.push({
          id: post.id,
          title: post.title,
          url: post.url,
          slug: post.uniqueSlug,
          keywords: keywords,
          published_at: post.publishedAt || new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn(`Error processing publication ${publication.id}:`, error);
      continue;
    }
  }
  
  // Also fetch user's personal posts
  try {
    const userPostsResponse = await fetch(
      `https://api.medium.com/v1/users/${userId}/posts`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    if (userPostsResponse.ok) {
      const { data: userPosts } = await userPostsResponse.json();
      
      for (const post of userPosts) {
        const keywords = extractKeywords(post.title + ' ' + (post.content || ''));
        
        existingContent.push({
          id: post.id,
          title: post.title,
          url: post.url,
          slug: post.uniqueSlug,
          keywords: keywords,
          published_at: post.publishedAt || new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.warn('Error fetching user posts:', error);
  }
  
  return {
    publications: publications,
    existing_content: existingContent
  };
}

