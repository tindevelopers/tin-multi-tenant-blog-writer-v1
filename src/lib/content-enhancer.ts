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
  const isHTML = html.includes('<') && html.includes('>');
  const isMarkdown = !isHTML && (html.includes('#') || html.includes('*') || html.includes('`'));

  // Step 2: Convert markdown to HTML if needed
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
 * Convert markdown to HTML
 */
function markdownToHTML(markdown: string): string {
  let html = markdown;

  // Headers (must be at start of line)
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="blog-image" />');

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Blockquotes
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Lists - handle unordered lists
  const unorderedListRegex = /(?:^[\*\-\+] (.+)$\n?)+/gim;
  html = html.replace(unorderedListRegex, (match) => {
    const items = match.split('\n').filter(line => line.trim().match(/^[\*\-\+]/));
    const listItems = items.map(item => `<li>${item.replace(/^[\*\-\+] /, '').trim()}</li>`).join('\n');
    return `<ul>\n${listItems}\n</ul>`;
  });
  
  // Lists - handle ordered lists
  const orderedListRegex = /(?:^\d+\. (.+)$\n?)+/gim;
  html = html.replace(orderedListRegex, (match) => {
    const items = match.split('\n').filter(line => line.trim().match(/^\d+\./));
    const listItems = items.map(item => `<li>${item.replace(/^\d+\. /, '').trim()}</li>`).join('\n');
    return `<ol>\n${listItems}\n</ol>`;
  });

  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr />');

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
    if (trimmed.match(/^<(h[1-6]|ul|ol|pre|blockquote|hr|div|figure|img)/i)) {
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

  return processedLines.join('\n');
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
    return html.replace('</p>', `</p>\n${imageHTML}`, 1);
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
          alt="${image.alt_text || 'Blog image'}"
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

