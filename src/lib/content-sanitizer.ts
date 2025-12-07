/**
 * Content Sanitizer
 * Sanitizes HTML content using DOMPurify to prevent XSS attacks
 * Also converts markdown to HTML when needed
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
 * Convert markdown to HTML
 * Handles common markdown patterns: headers, links, bold, italic, lists, etc.
 */
function markdownToHTML(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  let html = markdown;

  // Convert headers (# Header -> <h1>Header</h1>)
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Convert markdown links [text](/url) -> <a href="/url">text</a>
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Convert bold **text** -> <strong>text</strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert italic *text* -> <em>text</em>
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Convert line breaks (double newline -> paragraph)
  html = html.split(/\n\n+/).map(para => {
    const trimmed = para.trim();
    if (!trimmed) return '';
    // Don't wrap if already an HTML tag
    if (trimmed.startsWith('<')) return trimmed;
    return `<p>${trimmed}</p>`;
  }).join('\n');

  // Convert single line breaks to <br>
  html = html.replace(/\n/g, '<br>');

  // Clean up multiple <br> tags
  html = html.replace(/(<br>\s*){3,}/g, '<br><br>');

  // Remove markdown artifacts
  html = html.replace(/!Content Marketing/g, 'Content Marketing');
  html = html.replace(/!Modern\s+/gi, '');
  html = html.replace(/f\. 2025/g, '2025');
  html = html.replace(/Here's the enhanced version of the blog post\. addressing the specified tasks \. readability concerns:/g, '');
  // Remove AI placeholder phrases from content
  html = html.replace(/\b(for example similar cases?\.\.?|such as similar cases?\.\.?|like similar cases?\.\.?|for instance similar cases?\.\.?)/gi, '');
  // Remove duplicate keywords at start
  html = html.replace(/^([a-z\s]+)\s+\1\s+/i, '$1 ');

  return html.trim();
}

/**
 * Detect if content is markdown (contains markdown patterns)
 */
function isMarkdown(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }

  // Check for common markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s+/m,           // Headers
    /\[.*?\]\(.*?\)/,        // Links
    /\*\*.*?\*\*/,           // Bold
    /^\s*[-*+]\s+/m,         // Unordered lists
    /^\s*\d+\.\s+/m,         // Ordered lists
  ];

  return markdownPatterns.some(pattern => pattern.test(content));
}

/**
 * Sanitize HTML content
 */
export function sanitizeHTML(html: string, options: SanitizeOptions = {}): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Convert markdown to HTML if needed
  let processedHTML = html;
  if (isMarkdown(html) && !html.includes('<')) {
    processedHTML = markdownToHTML(html);
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
  const sanitized = DOMPurify.sanitize(processedHTML, config);

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
  excerpt: string;
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
  let excerpt = 
    data.excerpt || 
    data.summary || 
    data.blog_post?.excerpt || 
    data.blog_post?.meta_description || 
    data.meta_description || 
    '';

  // Clean excerpt - remove markdown and HTML artifacts
  if (excerpt) {
    // Remove markdown links
    excerpt = excerpt.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Remove markdown headers
    excerpt = excerpt.replace(/^#{1,6}\s+/gm, '');
    // Remove HTML tags
    excerpt = excerpt.replace(/<[^>]+>/g, '');
    // Remove common artifacts
    excerpt = excerpt.replace(/Here's the enhanced version of the blog post\./g, '');
    excerpt = excerpt.replace(/addressing the specified tasks \./g, '');
    excerpt = excerpt.replace(/readability concerns:/g, '');
    excerpt = excerpt.replace(/f\. 2025/g, '2025');
    // Remove AI placeholder phrases
    excerpt = excerpt.replace(/\b(for example similar cases?\.\.?|such as similar cases?\.\.?|like similar cases?\.\.?|for instance similar cases?\.\.?)/gi, '');
    // Remove leading exclamation marks and artifacts
    excerpt = excerpt.replace(/^!Modern\s+/gi, '');
    excerpt = excerpt.replace(/^!Content\s+/gi, '');
    // Remove duplicate keywords at start (e.g., "call center Call Centers")
    excerpt = excerpt.replace(/^([a-z\s]+)\s+\1\s+/i, '$1 ');
    // Remove incomplete sentences
    excerpt = excerpt.replace(/\s+\.\.\s*$/, '');
    // Clean up multiple spaces
    excerpt = excerpt.replace(/\s{2,}/g, ' ');
    excerpt = excerpt.trim();
  }

  // Extract word count
  const wordCount = 
    data.word_count || 
    data.blog_post?.word_count || 
    data.metadata?.word_count || 
    0;

  // Sanitize content (will convert markdown to HTML if needed)
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

