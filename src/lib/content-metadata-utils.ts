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

