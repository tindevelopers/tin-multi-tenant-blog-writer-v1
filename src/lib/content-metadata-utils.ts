/**
 * Content Metadata Utilities
 * 
 * Utilities for extracting and displaying content metadata from API responses
 * Based on FRONTEND_DEPLOYMENT_GUIDE.md v1.3.0
 */

export interface HeadingMetadata {
  level: number;
  text: string;
  id: string;
}

export interface ImageMetadata {
  url: string;
  alt: string;
  type: 'featured' | 'section';
}

export interface LinkMetadata {
  url: string;
  text: string;
  type: 'internal' | 'external';
}

export interface CodeBlockMetadata {
  language: string;
  code: string;
}

export interface ContentMetadata {
  headings: HeadingMetadata[];
  images: ImageMetadata[];
  links: LinkMetadata[];
  code_blocks: CodeBlockMetadata[];
  word_count: number;
  reading_time_minutes: number;
}

export interface TOCItem {
  level: number;
  text: string;
  id: string;
  anchor: string;
}

/**
 * Generate Table of Contents from content metadata headings
 */
export function generateTOC(contentMetadata: ContentMetadata | null | undefined): TOCItem[] {
  if (!contentMetadata || !contentMetadata.headings || !Array.isArray(contentMetadata.headings)) {
    return [];
  }

  return contentMetadata.headings.map(heading => ({
    level: heading.level,
    text: heading.text,
    id: heading.id,
    anchor: `#${heading.id}`
  }));
}

/**
 * Extract images from content metadata
 */
export function extractImages(contentMetadata: ContentMetadata | null | undefined): ImageMetadata[] {
  if (!contentMetadata || !contentMetadata.images || !Array.isArray(contentMetadata.images)) {
    return [];
  }

  return contentMetadata.images;
}

/**
 * Extract links from content metadata
 */
export function extractLinks(contentMetadata: ContentMetadata | null | undefined): LinkMetadata[] {
  if (!contentMetadata || !contentMetadata.links || !Array.isArray(contentMetadata.links)) {
    return [];
  }

  return contentMetadata.links;
}

/**
 * Extract code blocks from content metadata
 */
export function extractCodeBlocks(contentMetadata: ContentMetadata | null | undefined): CodeBlockMetadata[] {
  if (!contentMetadata || !contentMetadata.code_blocks || !Array.isArray(contentMetadata.code_blocks)) {
    return [];
  }

  return contentMetadata.code_blocks;
}

/**
 * Validate URL
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate and categorize links
 */
export interface ValidatedLink extends LinkMetadata {
  isValid: boolean;
  isInternal: boolean;
  domain?: string;
}

export function validateLinks(links: LinkMetadata[]): ValidatedLink[] {
  return links.map(link => {
    const isValid = validateURL(link.url);
    const isInternal = link.type === 'internal';
    let domain: string | undefined;
    
    if (isValid) {
      try {
        const url = new URL(link.url);
        domain = url.hostname;
      } catch {
        // Ignore
      }
    }

    return {
      ...link,
      isValid,
      isInternal,
      domain
    };
  });
}

/**
 * Get reading time display string
 */
export function getReadingTimeDisplay(contentMetadata: ContentMetadata | null | undefined): string {
  if (!contentMetadata || !contentMetadata.reading_time_minutes) {
    return 'Reading time not available';
  }

  const minutes = contentMetadata.reading_time_minutes;
  if (minutes < 1) {
    return 'Less than 1 minute';
  } else if (minutes === 1) {
    return '1 minute';
  } else {
    return `${Math.round(minutes)} minutes`;
  }
}

/**
 * Get word count display string
 */
export function getWordCountDisplay(contentMetadata: ContentMetadata | null | undefined): string {
  if (!contentMetadata || !contentMetadata.word_count) {
    return 'Word count not available';
  }

  const count = contentMetadata.word_count;
  if (count < 1000) {
    return `${count} words`;
  } else {
    return `${(count / 1000).toFixed(1)}k words`;
  }
}

/**
 * Group headings by level for hierarchical display
 */
export function groupHeadingsByLevel(headings: HeadingMetadata[]): Record<number, HeadingMetadata[]> {
  const grouped: Record<number, HeadingMetadata[]> = {};
  
  headings.forEach(heading => {
    if (!grouped[heading.level]) {
      grouped[heading.level] = [];
    }
    grouped[heading.level].push(heading);
  });

  return grouped;
}

/**
 * Get featured image from content metadata
 */
export function getFeaturedImage(contentMetadata: ContentMetadata | null | undefined): ImageMetadata | null {
  if (!contentMetadata || !contentMetadata.images) {
    return null;
  }

  const featured = contentMetadata.images.find(img => img.type === 'featured');
  return featured || null;
}

/**
 * Get section images from content metadata
 */
export function getSectionImages(contentMetadata: ContentMetadata | null | undefined): ImageMetadata[] {
  if (!contentMetadata || !contentMetadata.images) {
    return [];
  }

  return contentMetadata.images.filter(img => img.type === 'section');
}

/**
 * Extract content metadata from HTML content
 */
export function extractContentMetadata(htmlContent: string): ContentMetadata {
  const headings: HeadingMetadata[] = [];
  const images: ImageMetadata[] = [];
  const links: LinkMetadata[] = [];
  const code_blocks: CodeBlockMetadata[] = [];

  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Extract headings
  const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headingElements.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    const text = heading.textContent || '';
    const id = heading.id || `heading-${index}`;
    
    headings.push({
      level,
      text: text.trim(),
      id
    });
  });

  // Extract images
  const imageElements = doc.querySelectorAll('img');
  imageElements.forEach((img, index) => {
    const url = img.getAttribute('src') || '';
    const alt = img.getAttribute('alt') || '';
    const isFeatured = img.closest('figure.featured-image') !== null || 
                       img.classList.contains('featured-image') ||
                       index === 0; // First image is featured by default
    
    if (url) {
      images.push({
        url,
        alt: alt.trim() || `Image ${index + 1}`,
        type: isFeatured ? 'featured' : 'section'
      });
    }
  });

  // Extract links
  const linkElements = doc.querySelectorAll('a[href]');
  linkElements.forEach((link) => {
    const url = link.getAttribute('href') || '';
    const text = link.textContent || '';
    // Check if link is internal (relative paths, anchors, or same domain)
    const isInternal = url.startsWith('/') || 
                       url.startsWith('#') || 
                       !url.includes('://') ||
                       (typeof window !== 'undefined' && url.includes(window.location.hostname));
    
    if (url) {
      links.push({
        url,
        text: text.trim() || url,
        type: isInternal ? 'internal' : 'external'
      });
    }
  });

  // Extract code blocks
  const codeElements = doc.querySelectorAll('pre code, code');
  codeElements.forEach((code) => {
    const language = code.className.replace('language-', '') || 'text';
    const codeText = code.textContent || '';
    
    if (codeText.trim()) {
      code_blocks.push({
        language,
        code: codeText
      });
    }
  });

  // Calculate word count (approximate)
  const textContent = doc.body.textContent || '';
  const word_count = textContent.split(/\s+/).filter(word => word.length > 0).length;

  // Calculate reading time (average 200 words per minute)
  const reading_time_minutes = Math.ceil(word_count / 200);

  return {
    headings,
    images,
    links,
    code_blocks,
    word_count,
    reading_time_minutes
  };
}

