/**
 * Content Extraction Utilities
 * Helper functions to extract metadata from HTML content
 */

/**
 * Extracts excerpt from HTML content
 * Tries to find the first meaningful paragraph or extracts first 200 characters
 */
export function extractExcerptFromContent(content: string, maxLength: number = 200): string {
  if (!content) return '';
  
  // Remove HTML tags
  const textContent = content.replace(/<[^>]*>/g, ' ').trim();
  
  // Try to find first paragraph (split by newlines or periods)
  const paragraphs = textContent.split(/\n+/).filter(p => p.trim().length > 50);
  if (paragraphs.length > 0) {
    const firstParagraph = paragraphs[0].trim();
    if (firstParagraph.length <= maxLength) {
      return firstParagraph;
    }
    return firstParagraph.substring(0, maxLength - 3) + '...';
  }
  
  // Fallback: extract first maxLength characters
  if (textContent.length <= maxLength) {
    return textContent;
  }
  return textContent.substring(0, maxLength - 3) + '...';
}

/**
 * Extracts featured image URL from HTML content
 * Looks for img tags with class="featured" or the first img tag
 */
export function extractFeaturedImageFromContent(content: string): { url: string; alt: string } | null {
  if (!content) return null;
  
  // Try to find featured image (with class="featured" or similar)
  const featuredImageMatch = content.match(/<img[^>]*class="[^"]*featured[^"]*"[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*>/i) ||
                             content.match(/<figure[^>]*class="[^"]*featured[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*>/i);
  
  if (featuredImageMatch) {
    return {
      url: featuredImageMatch[1] || featuredImageMatch[2] || '',
      alt: featuredImageMatch[2] || featuredImageMatch[3] || '',
    };
  }
  
  // Fallback: find first img tag
  const firstImageMatch = content.match(/<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*>/i);
  if (firstImageMatch) {
    return {
      url: firstImageMatch[1],
      alt: firstImageMatch[2] || '',
    };
  }
  
  return null;
}

/**
 * Calculates word count from HTML content
 */
export function calculateWordCountFromContent(content: string): number {
  if (!content) return 0;
  
  // Remove HTML tags and get text content
  const textContent = content.replace(/<[^>]*>/g, ' ').trim();
  
  // Split by whitespace and filter out empty strings
  const words = textContent.split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

