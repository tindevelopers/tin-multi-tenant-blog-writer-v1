/**
 * Content Extraction Utilities
 * Helper functions to extract metadata from HTML content
 */

/**
 * Cleans AI generation artifacts from text
 * Removes placeholder phrases and instruction remnants
 */
function cleanAIArtifacts(text: string): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // Remove common AI placeholder phrases
  const artifactPatterns = [
    // Placeholder examples
    /\b(for example similar cases?\.\.?|such as similar cases?\.\.?|like similar cases?\.\.?|for instance similar cases?\.\.?)/gi,
    // Instruction remnants
    /!Modern\s+/gi,
    /!Content\s+/gi,
    /Here's the enhanced version of the blog post\./gi,
    /addressing the specified tasks\s*\./gi,
    /readability concerns:/gi,
    // Markdown artifacts
    /^#{1,6}\s+/gm,
    // Duplicate keywords at start
    /^([a-z\s]+)\s+\1\s+/i,
    // Incomplete sentences
    /\s+\.\.\s*$/,
    // Multiple spaces
    /\s{2,}/g,
  ];
  
  artifactPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, ' ');
  });
  
  // Remove leading/trailing keywords that are duplicated
  cleaned = cleaned.trim();
  
  // Remove any remaining ".." at end
  cleaned = cleaned.replace(/\.\.+$/, '');
  
  return cleaned.trim();
}

/**
 * Extracts excerpt from HTML content
 * Tries to find the first meaningful paragraph or extracts first 200 characters
 * Automatically cleans AI artifacts
 */
export function extractExcerptFromContent(content: string, maxLength: number = 200): string {
  if (!content) return '';
  
  // Remove HTML tags
  let textContent = content.replace(/<[^>]*>/g, ' ').trim();
  
  // Clean AI artifacts first
  textContent = cleanAIArtifacts(textContent);
  
  // Try to find first paragraph (split by newlines or periods)
  const paragraphs = textContent.split(/\n+/).filter(p => {
    const cleaned = cleanAIArtifacts(p.trim());
    return cleaned.length > 50;
  });
  
  if (paragraphs.length > 0) {
    let firstParagraph = cleanAIArtifacts(paragraphs[0].trim());
    
    // Skip if paragraph starts with artifacts
    if (firstParagraph.match(/^(for example|such as|like|for instance)\s+similar cases/i)) {
      // Try next paragraph
      if (paragraphs.length > 1) {
        firstParagraph = cleanAIArtifacts(paragraphs[1].trim());
      } else {
        // Extract from content skipping the artifact
        const withoutArtifact = textContent.replace(/^(for example|such as|like|for instance)\s+similar cases[^.]*\./i, '').trim();
        firstParagraph = withoutArtifact.substring(0, maxLength).trim();
      }
    }
    
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

