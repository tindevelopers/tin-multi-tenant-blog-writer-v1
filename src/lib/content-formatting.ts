/**
 * Content Formatting Service
 * Enhances blog content with proper formatting, semantic HTML, and structure
 */

import { logger } from '@/utils/logger';

export interface FormattingOptions {
  fixPunctuation?: boolean;
  addSemanticHTML?: boolean;
  improveTypography?: boolean;
  addStructure?: boolean;
  detectImagePlaceholders?: boolean;
}

export interface ImagePlaceholder {
  type: 'markdown' | 'structured' | 'template';
  description: string;
  position: number;
  context?: string;
  originalText: string;
}

export interface FormattingResult {
  formattedContent: string;
  imagePlaceholders: ImagePlaceholder[];
  wordCount: number;
  headingCount: number;
  paragraphCount: number;
}

/**
 * Detect image placeholders in content
 */
export function detectImagePlaceholders(content: string): ImagePlaceholder[] {
  const placeholders: ImagePlaceholder[] = [];
  
  // Markdown style: !Description or ![alt text](url)
  const markdownPattern = /!\[([^\]]*)\]\(([^)]+)\)|!([^\s\n]+)/g;
  let match;
  let position = 0;
  
  while ((match = markdownPattern.exec(content)) !== null) {
    const description = match[1] || match[3] || 'Image';
    const context = extractContext(content, match.index);
    
    placeholders.push({
      type: 'markdown',
      description: description.trim(),
      position: match.index,
      context,
      originalText: match[0],
    });
  }
  
  // Structured style: [IMAGE:description]
  const structuredPattern = /\[IMAGE:([^\]]+)\]/gi;
  while ((match = structuredPattern.exec(content)) !== null) {
    const context = extractContext(content, match.index);
    
    placeholders.push({
      type: 'structured',
      description: match[1].trim(),
      position: match.index,
      context,
      originalText: match[0],
    });
  }
  
  // Template style: {{image:description}}
  const templatePattern = /\{\{image:([^}]+)\}\}/gi;
  while ((match = templatePattern.exec(content)) !== null) {
    const context = extractContext(content, match.index);
    
    placeholders.push({
      type: 'template',
      description: match[1].trim(),
      position: match.index,
      context,
      originalText: match[0],
    });
  }
  
  // Sort by position
  return placeholders.sort((a, b) => a.position - b.position);
}

/**
 * Extract context around a position (2-3 sentences)
 */
function extractContext(content: string, position: number, charsBefore = 200, charsAfter = 200): string {
  const start = Math.max(0, position - charsBefore);
  const end = Math.min(content.length, position + charsAfter);
  return content.substring(start, end).trim();
}

/**
 * Fix common punctuation issues
 */
export function fixPunctuation(content: string): string {
  let fixed = content;
  
  // Fix periods used as commas: "word. word" -> "word, word" (but not at end of sentences)
  // This is tricky - we'll be conservative and only fix obvious cases
  fixed = fixed.replace(/([a-z])\. ([a-z])/g, (match, p1, p2) => {
    // Only fix if it's clearly wrong (lowercase after period)
    if (p2 === p2.toLowerCase()) {
      return `${p1}, ${p2}`;
    }
    return match;
  });
  
  // Fix multiple spaces
  fixed = fixed.replace(/  +/g, ' ');
  
  // Fix spacing around punctuation
  fixed = fixed.replace(/\s+([.,!?;:])/g, '$1');
  fixed = fixed.replace(/([.,!?;:])([^\s])/g, '$1 $2');
  
  // Fix paragraph breaks (ensure double line breaks)
  fixed = fixed.replace(/\n\n+/g, '\n\n');
  
  return fixed;
}

/**
 * Convert plain text to HTML paragraphs
 */
export function plainTextToHTML(text: string): string {
  // Split by double line breaks for paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  
  return paragraphs
    .map(para => {
      const trimmed = para.trim();
      if (!trimmed) return '';
      
      // Check if it's a heading (starts with #)
      if (trimmed.startsWith('#')) {
        const match = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (match) {
          const level = match[1].length;
          const text = match[2];
          return `<h${level}>${text}</h${level}>`;
        }
      }
      
      // Convert single line breaks to <br>
      const withBreaks = trimmed.replace(/\n/g, '<br>');
      return `<p>${withBreaks}</p>`;
    })
    .join('\n');
}

/**
 * Add semantic HTML structure
 */
export function addSemanticStructure(html: string): string {
  // Wrap in article tag if not already wrapped
  if (!html.includes('<article')) {
    html = `<article class="blog-post">${html}</article>`;
  }
  
  // Add section wrappers around major sections (between H2 headings)
  const sections = html.split(/(<h2[^>]*>.*?<\/h2>)/i);
  if (sections.length > 1) {
    let structured = sections[0]; // Content before first H2
    
    for (let i = 1; i < sections.length; i += 2) {
      const heading = sections[i];
      const content = sections[i + 1] || '';
      
      structured += `<section class="blog-section">${heading}${content}</section>`;
    }
    
    html = structured;
  }
  
  return html;
}

/**
 * Enhance HTML formatting
 */
export function enhanceHTMLFormatting(html: string): string {
  // Ensure proper heading hierarchy
  // Convert any H4+ to H3 if there's no H2 before it
  
  // Add proper spacing classes
  html = html.replace(/<h1([^>]*)>/g, '<h1$1 class="text-4xl font-bold mb-4 mt-8">');
  html = html.replace(/<h2([^>]*)>/g, '<h2$1 class="text-3xl font-semibold mb-3 mt-6">');
  html = html.replace(/<h3([^>]*)>/g, '<h3$1 class="text-2xl font-semibold mb-2 mt-4">');
  html = html.replace(/<p([^>]*)>/g, '<p$1 class="mb-4 leading-relaxed">');
  
  // Add proper list styling
  html = html.replace(/<ul([^>]*)>/g, '<ul$1 class="list-disc list-inside mb-4 space-y-2">');
  html = html.replace(/<ol([^>]*)>/g, '<ol$1 class="list-decimal list-inside mb-4 space-y-2">');
  html = html.replace(/<li([^>]*)>/g, '<li$1 class="ml-4">');
  
  // Add blockquote styling
  html = html.replace(/<blockquote([^>]*)>/g, '<blockquote$1 class="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-700 dark:text-gray-300">');
  
  return html;
}

/**
 * Format content with all enhancements
 */
export function formatContent(
  content: string,
  options: FormattingOptions = {}
): FormattingResult {
  const {
    fixPunctuation: shouldFixPunctuation = true,
    addSemanticHTML = true,
    improveTypography = true,
    addStructure = true,
    detectImagePlaceholders: shouldDetectPlaceholders = true,
  } = options;
  
  let formatted = content;
  const imagePlaceholders: ImagePlaceholder[] = [];
  
  // Step 1: Detect image placeholders
  if (shouldDetectPlaceholders) {
    imagePlaceholders.push(...detectImagePlaceholders(formatted));
  }
  
  // Step 2: Fix punctuation
  if (shouldFixPunctuation) {
    formatted = fixPunctuation(formatted);
  }
  
  // Step 3: Convert to HTML if needed
  const isHTML = formatted.includes('<') && formatted.includes('>');
  const isMarkdown = !isHTML && (formatted.includes('#') || formatted.includes('*'));
  
  if (!isHTML && !isMarkdown) {
    formatted = plainTextToHTML(formatted);
  } else if (isMarkdown) {
    // Basic markdown to HTML conversion
    formatted = formatted
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, '<p>$1</p>');
  }
  
  // Step 4: Enhance HTML formatting
  if (improveTypography) {
    formatted = enhanceHTMLFormatting(formatted);
  }
  
  // Step 5: Add semantic structure
  if (addStructure && addSemanticHTML) {
    formatted = addSemanticStructure(formatted);
  }
  
  // Step 6: Calculate metrics
  const wordCount = formatted.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(w => w).length;
  const headingCount = (formatted.match(/<h[1-6][^>]*>/gi) || []).length;
  const paragraphCount = (formatted.match(/<p[^>]*>/gi) || []).length;
  
  return {
    formattedContent: formatted,
    imagePlaceholders,
    wordCount,
    headingCount,
    paragraphCount,
  };
}

/**
 * Generate image prompt from placeholder and context
 */
export function generateImagePrompt(
  placeholder: ImagePlaceholder,
  topic?: string,
  keywords?: string[]
): string {
  let prompt = placeholder.description;
  
  // Enhance with context if available
  if (placeholder.context) {
    // Extract key nouns/adjectives from context
    const contextWords = placeholder.context
      .split(/\s+/)
      .filter(w => w.length > 4)
      .slice(0, 5)
      .join(', ');
    
    if (contextWords) {
      prompt = `${prompt}, ${contextWords}`;
    }
  }
  
  // Add topic/keywords if provided
  if (topic) {
    prompt = `${prompt}, related to ${topic}`;
  }
  
  if (keywords && keywords.length > 0) {
    prompt = `${prompt}, ${keywords.slice(0, 3).join(', ')}`;
  }
  
  // Add quality descriptors
  prompt = `${prompt}, professional photography, high quality, well-lit`;
  
  return prompt.trim();
}

