/**
 * Content Sanitizer
 * Sanitizes HTML content using DOMPurify to prevent XSS attacks
 */

import DOMPurify from 'isomorphic-dompurify';

export interface SanitizeOptions {
  allowImages?: boolean;
  allowLinks?: boolean;
  allowHeadings?: boolean;
  allowLists?: boolean;
  allowCode?: boolean;
  allowTables?: boolean;
}

/**
 * Sanitize HTML content
 */
export function sanitizeHTML(html: string, options: SanitizeOptions = {}): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const {
    allowImages = true,
    allowLinks = true,
    allowHeadings = true,
    allowLists = true,
    allowCode = true,
    allowTables = true,
  } = options;

  // Build allowed tags based on options
  const allowedTags: string[] = ['p', 'br', 'strong', 'em', 'u', 's', 'blockquote', 'hr'];
  
  if (allowHeadings) {
    allowedTags.push('h1', 'h2', 'h3', 'h4', 'h5', 'h6');
  }
  
  if (allowLists) {
    allowedTags.push('ul', 'ol', 'li');
  }
  
  if (allowCode) {
    allowedTags.push('code', 'pre');
  }
  
  if (allowImages) {
    allowedTags.push('img', 'figure', 'figcaption');
  }
  
  if (allowLinks) {
    allowedTags.push('a');
  }
  
  if (allowTables) {
    allowedTags.push('table', 'thead', 'tbody', 'tr', 'th', 'td');
  }

  // Configure DOMPurify
  const config = {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: [
      'href',
      'target',
      'rel',
      'src',
      'alt',
      'title',
      'class',
      'id',
      'data-*',
    ],
    ALLOW_DATA_ATTR: true,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
  };

  // Sanitize the HTML
  const sanitized = DOMPurify.sanitize(html, config);

  return sanitized;
}

/**
 * Extract headings structure from HTML
 */
export function extractHeadings(html: string): Array<{ level: number; text: string; id: string }> {
  if (!html || typeof html !== 'string') {
    return [];
  }

  const headings: Array<{ level: number; text: string; id: string }> = [];
  
  // Match h1-h6 tags
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const text = match[2]
      .replace(/<[^>]+>/g, '') // Remove any nested HTML tags
      .trim();
    
    if (text) {
      // Generate ID from text
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      headings.push({ level, text, id });
    }
  }

  return headings;
}

/**
 * Normalize blog content from API response
 */
export function normalizeBlogContent(data: any): {
  title: string;
 ript: string;
  content: string;
  wordCount: number;
  headings: Array<{ level: number; text: string; id: string }>;
  sanitizedContent: string;
} {
  // Extract title from various possible fields
  const title = 
    data.title || 
    data.generated_title || 
    data.blog_post?.title || 
    data.topic || 
    'Untitled';

  // Extract content from various possible fields
  const rawContent = 
    data.content || 
    data.generated_content || 
    data.blog_post?.content || 
    data.html_content || 
    '';

  // Extract excerpt
  const excerpt = 
    data.excerpt || 
    data.summary || 
    data.blog_post?.excerpt || 
    data.blog_post?.meta_description || 
    data.meta_description || 
    '';

  // Extract word count
  const wordCount = 
    data.word_count || 
    data.blog_post?.word_count || 
    data.metadata?.word_count || 
    0;

  // Sanitize content
  const sanitizedContent = sanitizeHTML(rawContent, {
    allowImages: true,
    allowLinks: true,
    allowHeadings: true,
    allowLists: true,
    allowCode: true,
    allowTables: true,
  });

  // Extract headings structure
  const headings = extractHeadings(sanitizedContent);

  return {
    title,
    excerpt,
    content: rawContent,
    wordCount,
    headings,
    sanitizedContent,
  };
}

