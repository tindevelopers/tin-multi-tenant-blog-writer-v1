/**
 * Content Enhancer
 * Transforms plain text or basic HTML into rich, formatted HTML with images
 */

import { GeneratedImage } from './image-generation';

export interface ContentEnhancementOptions {
  featuredImage?: GeneratedImage | null;
  sectionImages?: Array<{ position: number; image: GeneratedImage }>;
  includeImages?: boolean;
  enhanceFormatting?: boolean;
  addStructure?: boolean;
}

/**
 * Clean excerpt from AI artifacts
 */
export function cleanExcerpt(excerpt: string): string {
  if (!excerpt) return '';
  
  let cleaned = excerpt;
  
  // Remove common artifacts that appear in excerpts (order matters - most specific first)
  cleaned = cleaned.replace(/Here's the enhanced version of the blog post.*?:/gi, '');
  cleaned = cleaned.replace(/Here's the enhanced version.*?:/gi, '');
  cleaned = cleaned.replace(/enhanced version of the blog post.*?:/gi, '');
  cleaned = cleaned.replace(/addressing the specified improvement tasks.*?:/gi, '');
  cleaned = cleaned.replace(/addressing the specified.*?:/gi, '');
  cleaned = cleaned.replace(/readability concerns:.*?/gi, '');
  cleaned = cleaned.replace(/!AI\s+[^!\n]{5,50}/gi, '');
  cleaned = cleaned.replace(/!Featured\s+[^!\n]{5,50}/gi, '');
  cleaned = cleaned.replace(/!AI.*?/gi, '');
  cleaned = cleaned.replace(/!Featured.*?/gi, '');
  
  // Remove topic/keyword prefix if it's just repeated (e.g., "best ai voice agents Here's...")
  cleaned = cleaned.replace(/^([a-z\s]{5,50})\s+(Here's|Here is|Best|Top|Discover|Learn)/i, '$2');
  
  // Clean up broken punctuation
  cleaned = cleaned.replace(/\s+\.\s+/g, '. ');
  cleaned = cleaned.replace(/\s+,\s+/g, ', ');
  
  // Remove markdown artifacts
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]*\)/g, '$1');
  cleaned = cleaned.replace(/!\[?[^\]]*\]?/g, '');
  
  // Trim and clean whitespace
  cleaned = cleaned.trim().replace(/\s{2,}/g, ' ');
  
  // If excerpt is too short or still contains artifacts, return empty to force regeneration
  if (cleaned.length < 50 || cleaned.includes("enhanced version") || cleaned.includes("addressing")) {
    return '';
  }
  
  return cleaned;
}

/**
 * Enhance content to rich HTML with proper formatting and images
 */
export function enhanceContentToRichHTML(
  content: string,
  options: ContentEnhancementOptions = {}
): string {
  const {
    featuredImage,
    sectionImages = [],
    includeImages = true,
    enhanceFormatting = true,
    addStructure = true
  } = options;

  let html = content || '';

  // Step 1: Detect content format
  // Check for HTML tags
  const isHTML = html.includes('<') && html.includes('>');
  // Check for markdown syntax (headers, bold, code, links, lists)
  const hasMarkdownHeaders = /^#{1,6}\s+/m.test(html);
  const hasMarkdownFormatting = /\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[.*?\]\(.*?\)|^[-*+]\s+/m.test(html);
  const isMarkdown = hasMarkdownHeaders || hasMarkdownFormatting;

  // Step 2: Convert markdown to HTML if needed
  // IMPORTANT: Process markdown even if HTML is present (mixed content case)
  // This handles cases where backend returns HTML paragraphs but markdown headers
  if (isMarkdown) {
    html = markdownToHTML(html);
  } else if (!isHTML) {
    // Plain text - convert to HTML paragraphs
    html = plainTextToHTML(html);
  }

  // Step 3: Enhance HTML structure
  if (enhanceFormatting) {
    html = enhanceHTMLFormatting(html);
  }

  // Step 4: Add featured image at the top
  if (includeImages && featuredImage?.image_url) {
    html = prependFeaturedImage(html, featuredImage);
  }

  // Step 5: Embed section images
  if (includeImages && sectionImages.length > 0) {
    html = embedSectionImages(html, sectionImages);
  }

  // Step 6: Add semantic structure
  if (addStructure) {
    html = addSemanticStructure(html);
  }

  // Step 7: Clean up and optimize
  html = optimizeHTML(html);

  return html;
}

/**
 * Clean content from common AI generation artifacts
 */
function cleanAIArtifacts(content: string): string {
  let cleaned = content;
  
  // Remove common AI generation artifacts (more aggressive patterns)
  cleaned = cleaned.replace(/Here's an enhanced version of.*?:/gi, '');
  cleaned = cleaned.replace(/Here's the enhanced version.*?:/gi, '');
  cleaned = cleaned.replace(/enhanced version of the blog post.*?:/gi, '');
  cleaned = cleaned.replace(/addressing the specified.*?:/gi, '');
  cleaned = cleaned.replace(/addressing the specified improvement tasks.*?:/gi, '');
  cleaned = cleaned.replace(/readability concerns:.*?(?=\n|$)/gi, '');
  cleaned = cleaned.replace(/Enhancements Made:[\s\S]*?(?=\n\n|$)/gi, '');
  cleaned = cleaned.replace(/Key Enhancements:[\s\S]*?(?=\n\n|$)/gi, '');
  cleaned = cleaned.replace(/Citations added where appropriate.*?(?=\n|$)/gi, '');
  cleaned = cleaned.replace(/Methodology Note:.*?(?=\n|$)/gi, '');
  cleaned = cleaned.replace(/\*Last updated:.*?\*/gi, '');
  cleaned = cleaned.replace(/The revised content.*?(?=\n|$)/gi, '');
  
  // Remove "enhanced version" text that appears in content (catch all variations)
  cleaned = cleaned.replace(/\benhanced version\b.*?:/gi, '');
  
  // Fix malformed markdown headers at start (like "# voice ai agent Here's..." or "# best ai voice agents Here's...")
  // Extract the topic and make it a proper H1, remove the rest
  cleaned = cleaned.replace(/^#\s*([a-z\s]+?)\s+(Here's|Here is|This is|Learn|Discover|Explore|Have you|Best|Top|Discover)/i, '# $1\n\n$2');
  
  // Remove topic/keyword prefixes that appear before "Here's" or "Best" (e.g., "best ai voice agents Here's...")
  cleaned = cleaned.replace(/^([a-z\s]{5,40})\s+(Here's|Here is|Best|Top|Discover|Learn)/i, '$2');
  
  // Clean up broken punctuation patterns from DataForSEO
  // Fix "." being used instead of "," (e.g., "learn . improve" → "learn, improve")
  cleaned = cleaned.replace(/\s+\.\s+/g, ', ');
  // Fix "f." being used instead of "for" 
  cleaned = cleaned.replace(/\bf\.\s+/gi, 'for ');
  // Fix isolated periods that break words (e.g., "Underst." → "Understand", "Superi." → "Superior")
  cleaned = cleaned.replace(/\b([A-Z][a-z]+)\.\s+/g, '$1 ');
  // Fix isolated periods before lowercase (e.g., "2024 . beyond" → "2024 and beyond")
  cleaned = cleaned.replace(/\s+\.\s+(?=[a-z])/gi, ' and ');
  
  // Clean up exclamation marks used as image placeholders (like "!Featured Voice AI Technology" or "!AI Voice Technology Landscape")
  cleaned = cleaned.replace(/!\s*([A-Z][^!\n]{5,50})(?:\s|$)/g, '');
  cleaned = cleaned.replace(/!AI\s+[^!\n]{5,50}(?:\s|$)/gi, '');
  cleaned = cleaned.replace(/!Featured\s+[^!\n]{5,50}(?:\s|$)/gi, '');
  cleaned = cleaned.replace(/!\[?[^\]]*\]?(?!\()/g, '');
  
  // Fix broken markdown links (like "[Voice AI Agent](/voice-ai-agent)s:")
  cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)([a-z]+)/g, '[$1]($2) $3');
  
  // Clean up broken markdown links without URLs (keep the text)
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]*\)/g, '$1');
  
  // Fix section titles that should be headings (common pattern: "Section Title." or "Section Title:")
  // Convert standalone capitalized phrases ending with period/colon to H2
  cleaned = cleaned.replace(/^([A-Z][^.!?]{10,80})[.:]\s*$/gm, '## $1');
  
  // Remove "Pro Tip:" and similar artifacts at end
  cleaned = cleaned.replace(/Pro Tip:.*?(?=\n|$)/gi, '');
  
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s{3,}/g, ' ');
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');
  
  return cleaned.trim();
}

/**
 * Convert markdown to HTML
 * Handles both pure markdown and mixed HTML+markdown content
 */
function markdownToHTML(markdown: string): string {
  // First clean AI artifacts
  let html = cleanAIArtifacts(markdown);

  // PRE-PROCESSING: Extract markdown headers from inside HTML tags (mixed content fix)
  // Handle cases like: <p># Title</p> or <p>## Section</p>
  html = html.replace(/<p[^>]*>\s*(#{1,6})\s+([^<]+)<\/p>/gi, (match, hashes, content) => {
    const level = hashes.length;
    return `<h${level}>${content.trim()}</h${level}>`;
  });
  
  // Also handle markdown headers that appear after HTML elements on their own line
  // e.g., "</p>\n# Title" or "</p>\n\n## Section"
  html = html.replace(/(<\/[^>]+>)\s*\n+(#{1,6})\s+(.+?)(?=\n|$)/gi, (match, closingTag, hashes, content) => {
    const level = hashes.length;
    return `${closingTag}\n<h${level}>${content.trim()}</h${level}>`;
  });

  // Headers (must be at start of line) - process longer patterns first
  html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
  html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Handle inline markdown headers that weren't caught (after other elements)
  html = html.replace(/>\s*#{6}\s+([^<]+)/gi, '><h6>$1</h6>');
  html = html.replace(/>\s*#{5}\s+([^<]+)/gi, '><h5>$1</h5>');
  html = html.replace(/>\s*#{4}\s+([^<]+)/gi, '><h4>$1</h4>');
  html = html.replace(/>\s*#{3}\s+([^<]+)/gi, '><h3>$1</h3>');
  html = html.replace(/>\s*#{2}\s+([^<]+)/gi, '><h2>$1</h2>');
  html = html.replace(/>\s*#\s+([^<]+)/gi, '><h1>$1</h1>');
  
  // Ensure we have exactly ONE H1 (the title)
  // If multiple H1s exist, convert extras to H2
  const h1Matches = html.match(/<h1[^>]*>.*?<\/h1>/gi);
  if (h1Matches && h1Matches.length > 1) {
    // Keep first H1, convert rest to H2
    let h1Count = 0;
    html = html.replace(/<h1([^>]*)>(.*?)<\/h1>/gi, (match, attrs, content) => {
      h1Count++;
      if (h1Count === 1) {
        return `<h1${attrs}>${content}</h1>`;
      }
      return `<h2${attrs}>${content}</h2>`;
    });
  }

  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Only apply italic if not part of a list marker
  html = html.replace(/(?<!\*)\*([^\*\n]+?)\*(?!\*)/g, '<em>$1</em>');

  // Links (only those with valid URLs)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Images with valid URLs
  html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, '<figure><img src="$2" alt="$1" class="blog-image" /></figure>');

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Blockquotes (handle multiple lines)
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br/>');

  // Lists - handle unordered lists (improved regex)
  html = html.replace(/(?:^[-\*\+] .+\n?)+/gim, (match) => {
    const items = match.split('\n').filter(line => line.trim().match(/^[-\*\+]/));
    if (items.length === 0) return match;
    const listItems = items.map(item => {
      const content = item.replace(/^[-\*\+]\s*/, '').trim();
      return content ? `<li>${content}</li>` : '';
    }).filter(Boolean).join('\n');
    return listItems ? `<ul>\n${listItems}\n</ul>` : '';
  });
  
  // Lists - handle ordered lists
  html = html.replace(/(?:^\d+\.\s+.+\n?)+/gim, (match) => {
    const items = match.split('\n').filter(line => line.trim().match(/^\d+\./));
    if (items.length === 0) return match;
    const listItems = items.map(item => {
      const content = item.replace(/^\d+\.\s*/, '').trim();
      return content ? `<li>${content}</li>` : '';
    }).filter(Boolean).join('\n');
    return listItems ? `<ol>\n${listItems}\n</ol>` : '';
  });

  // Horizontal rules
  html = html.replace(/^[-_*]{3,}$/gim, '<hr />');

  // Key Takeaways / Important sections - convert to callout
  html = html.replace(/<h([234])>(Key Takeaways?|Important|Note|Tip|Warning):?<\/h\1>\s*<ul>/gi, 
    '<div class="blog-callout blog-callout-key"><h$1>$2</h$1><ul>');
  
  // Paragraphs (wrap non-block elements)
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let currentParagraph: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentParagraph.length > 0) {
        processedLines.push(`<p>${currentParagraph.join(' ')}</p>`);
        currentParagraph = [];
      }
      continue;
    }

    // If it's a block element, close paragraph and add block
    if (trimmed.match(/^<(h[1-6]|ul|ol|pre|blockquote|hr|div|figure|img|article|section)/i)) {
      if (currentParagraph.length > 0) {
        processedLines.push(`<p>${currentParagraph.join(' ')}</p>`);
        currentParagraph = [];
      }
      processedLines.push(trimmed);
    } else if (trimmed.match(/<\/?(h[1-6]|ul|ol|pre|blockquote|hr|div|figure|article|section)/i)) {
      // Closing block tags
      if (currentParagraph.length > 0) {
        processedLines.push(`<p>${currentParagraph.join(' ')}</p>`);
        currentParagraph = [];
      }
      processedLines.push(trimmed);
    } else {
      currentParagraph.push(trimmed);
    }
  }

  if (currentParagraph.length > 0) {
    processedLines.push(`<p>${currentParagraph.join(' ')}</p>`);
  }

  // Validate and improve heading structure for SEO
  let result = processedLines.join('\n');
  result = validateAndImproveHeadings(result);
  
  return result;
}

/**
 * Validate and improve heading structure for SEO
 * Ensures proper H1/H2/H3 hierarchy with SEO-friendly keyword opportunities
 */
function validateAndImproveHeadings(html: string): string {
  let enhanced = html;
  
  // Count existing headings
  const h1Count = (enhanced.match(/<h1[^>]*>/gi) || []).length;
  const h2Count = (enhanced.match(/<h2[^>]*>/gi) || []).length;
  const h3Count = (enhanced.match(/<h3[^>]*>/gi) || []).length;
  
  // Log warning if heading structure is weak
  if (h1Count === 0 && h2Count === 0) {
    console.warn('[content-enhancer] No headings detected in content. Attempting to auto-detect section headers.');
    
    // Try to detect potential section headers from content patterns
    // Pattern 1: Short bold paragraphs that could be headers (under 100 chars, all bold)
    enhanced = enhanced.replace(/<p[^>]*>\s*<strong>([^<]{10,80})<\/strong>\s*<\/p>/gi, (match, content) => {
      // Don't convert if it looks like a sentence (has period at end)
      if (content.trim().endsWith('.') || content.trim().endsWith('?')) {
        return match;
      }
      return `<h2>${content.trim()}</h2>`;
    });
    
    // Pattern 2: Short paragraphs followed by lists (likely section headers)
    enhanced = enhanced.replace(/<p[^>]*>([^<]{10,60})<\/p>\s*(<ul|<ol)/gi, (match, content, listTag) => {
      // Only convert if it doesn't have sentence-ending punctuation
      if (content.trim().match(/[.?!]$/)) {
        return match;
      }
      return `<h3>${content.trim()}</h3>\n${listTag}`;
    });
    
    // Pattern 3: Capitalized short lines (potential headers)
    enhanced = enhanced.replace(/<p[^>]*>([A-Z][^<.!?]{8,50})<\/p>/g, (match, content) => {
      // Check if mostly uppercase words (title case)
      const words = content.trim().split(/\s+/);
      const capitalizedWords = words.filter((w: string) => /^[A-Z]/.test(w)).length;
      if (capitalizedWords >= words.length * 0.6 && words.length >= 2 && words.length <= 8) {
        return `<h2>${content.trim()}</h2>`;
      }
      return match;
    });
  }
  
  // Ensure we have at least some H2s for SEO (minimum 3 recommended)
  const updatedH2Count = (enhanced.match(/<h2[^>]*>/gi) || []).length;
  if (updatedH2Count < 3) {
    console.warn(`[content-enhancer] Only ${updatedH2Count} H2 headings found. SEO best practice recommends at least 3-4 H2 sections.`);
  }
  
  return enhanced;
}

/**
 * Convert plain text to HTML paragraphs
 */
function plainTextToHTML(text: string): string {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  return paragraphs.map(p => `<p>${p.trim()}</p>`).join('\n');
}

/**
 * Enhance HTML formatting with proper styling
 */
function enhanceHTMLFormatting(html: string): string {
  // Ensure headings have proper classes
  html = html.replace(/<h1>/g, '<h1 class="blog-heading blog-heading-1">');
  html = html.replace(/<h2>/g, '<h2 class="blog-heading blog-heading-2">');
  html = html.replace(/<h3>/g, '<h3 class="blog-heading blog-heading-3">');
  html = html.replace(/<h4>/g, '<h4 class="blog-heading blog-heading-4">');

  // Enhance paragraphs
  html = html.replace(/<p>/g, '<p class="blog-paragraph">');

  // Enhance lists
  html = html.replace(/<ul>/g, '<ul class="blog-list blog-list-unordered">');
  html = html.replace(/<ol>/g, '<ol class="blog-list blog-list-ordered">');
  html = html.replace(/<li>/g, '<li class="blog-list-item">');

  // Enhance blockquotes
  html = html.replace(/<blockquote>/g, '<blockquote class="blog-blockquote">');

  // Enhance code blocks
  html = html.replace(/<pre>/g, '<pre class="blog-code-block">');
  html = html.replace(/<code>/g, '<code class="blog-code">');

  // Ensure images have proper styling
  html = html.replace(/<img([^>]*)>/gi, (match, attrs) => {
    if (!attrs.includes('class=')) {
      return `<img${attrs} class="blog-image" />`;
    } else if (!attrs.includes('blog-image')) {
      return match.replace(/class="([^"]*)"/, 'class="$1 blog-image"');
    }
    return match;
  });

  // Ensure links open in new tab
  html = html.replace(/<a([^>]*)>/gi, (match, attrs) => {
    if (!attrs.includes('target=')) {
      return `<a${attrs} target="_blank" rel="noopener noreferrer">`;
    }
    return match;
  });

  return html;
}

/**
 * Prepend featured image to content
 */
function prependFeaturedImage(html: string, image: GeneratedImage): string {
  if (!image.image_url) return html;

  const imageHTML = `
    <figure class="blog-featured-image">
      <img 
        src="${image.image_url}" 
        alt="Featured image"
        class="blog-image blog-featured"
        loading="eager"
      />
    </figure>
  `;

  // Insert after first paragraph or at the beginning
  if (html.includes('</p>')) {
    return html.replace('</p>', `</p>\n${imageHTML}`);
  } else {
    return imageHTML + '\n' + html;
  }
}

/**
 * Embed section images at appropriate positions
 */
function embedSectionImages(
  html: string,
  images: Array<{ position: number; image: GeneratedImage }>
): string {
  if (images.length === 0) return html;

  // Calculate approximate word positions in HTML
  const words = html.split(/\s+/);
  let enhancedHTML = html;

  // Sort images by position (reverse to insert from end)
  const sortedImages = [...images].sort((a, b) => b.position - a.position);

  for (const { position, image } of sortedImages) {
    if (!image.image_url) continue;

    const imageHTML = `
      <figure class="blog-section-image">
        <img 
          src="${image.image_url}" 
          alt="Blog image"
          class="blog-image blog-section"
          loading="lazy"
        />
      </figure>
    `;

    // Find insertion point (after paragraph near word position)
    const wordCount = Math.min(position, words.length);
    const insertionPoint = findInsertionPoint(enhancedHTML, wordCount);
    
    if (insertionPoint > -1) {
      enhancedHTML = enhancedHTML.slice(0, insertionPoint) + 
                     imageHTML + '\n' + 
                     enhancedHTML.slice(insertionPoint);
    }
  }

  return enhancedHTML;
}

/**
 * Find best insertion point for image (after paragraph)
 */
function findInsertionPoint(html: string, targetWordCount: number): number {
  const words = html.split(/\s+/);
  let currentWordCount = 0;
  let lastParagraphEnd = -1;

  // Find paragraphs and track word count
  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;

  while ((match = paragraphRegex.exec(html)) !== null) {
    const paragraphWords = match[1].split(/\s+/).length;
    currentWordCount += paragraphWords;
    
    if (currentWordCount >= targetWordCount * 0.8) {
      return match.index + match[0].length;
    }
    
    lastParagraphEnd = match.index + match[0].length;
  }

  // If no paragraph found, insert at last paragraph end or beginning
  return lastParagraphEnd > -1 ? lastParagraphEnd : 0;
}

/**
 * Add semantic HTML structure
 */
function addSemanticStructure(html: string): string {
  // Wrap in article if not already wrapped
  if (!html.includes('<article') && !html.includes('<main')) {
    html = `<article class="blog-content">${html}</article>`;
  }

  return html;
}

/**
 * Optimize HTML for display
 */
function optimizeHTML(html: string): string {
  // Remove empty paragraphs
  html = html.replace(/<p[^>]*>\s*<\/p>/gi, '');

  // Remove multiple consecutive line breaks
  html = html.replace(/\n{3,}/g, '\n\n');

  // Ensure proper spacing around block elements
  html = html.replace(/(<\/h[1-6]>)\s*(<p)/gi, '$1\n\n$2');
  html = html.replace(/(<\/p>)\s*(<h[1-6])/gi, '$1\n\n$2');

  // Clean up whitespace
  html = html.trim();

  return html;
}

/**
 * Extract sections from content for image placement
 */
export function extractSections(html: string): Array<{ title: string; wordPosition: number }> {
  const sections: Array<{ title: string; wordPosition: number }> = [];
  const words = html.split(/\s+/);
  let currentWordCount = 0;

  // Find all headings
  const headingRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi;
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const title = match[1].replace(/<[^>]+>/g, '').trim();
    const headingWords = match[0].split(/\s+/).length;
    currentWordCount += headingWords;
    
    sections.push({
      title,
      wordPosition: currentWordCount
    });
  }

  return sections;
}

