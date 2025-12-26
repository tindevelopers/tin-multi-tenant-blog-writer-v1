/**
 * Unified Content Sanitizer
 * 
 * Single source of truth for removing AI generation artifacts from content.
 * This module consolidates artifact removal patterns that were previously
 * scattered across multiple files (content-sanitizer.ts, content-enhancer.ts,
 * content-extraction-utils.ts).
 * 
 * Use this for ALL content sanitization needs.
 */

import { logger } from '@/utils/logger';

export interface SanitizationResult {
  content: string;
  wasModified: boolean;
  artifactsRemoved: string[];
  stats: {
    preambleRemoved: number;
    metaCommentaryRemoved: number;
    malformedImagesRemoved: number;
    brokenPunctuationFixed: number;
    duplicateKeywordsRemoved: number;
  };
}

export interface ExcerptSanitizationResult {
  excerpt: string;
  wasModified: boolean;
  issues: string[];
}

/**
 * Comprehensive list of AI artifact patterns
 * Organized by category for maintainability
 */
const ARTIFACT_PATTERNS = {
  // Preamble patterns - AI introducing its response
  preamble: [
    /^Here's (?:the |an )?(?:enhanced |revised |updated |comprehensive )?(?:version|content|blog post|article).*?:\s*\n?/gim,
    /^Here is (?:the |an )?(?:enhanced |revised |updated |comprehensive )?(?:version|content|blog post|article).*?:\s*\n?/gim,
    /^I'll provide.*?:\s*\n?/gim,
    /^I will provide.*?:\s*\n?/gim,
    /^I've (?:created|written|prepared).*?:\s*\n?/gim,
    /^Let me (?:provide|create|write|present).*?:\s*\n?/gim,
    /^Addressing the specified.*?:\s*\n?/gim,
    /^Below is (?:the |an )?.*?:\s*\n?/gim,
    /^The following is.*?:\s*\n?/gim,
  ],
  
  // Meta-commentary patterns - AI describing what it did
  metaCommentary: [
    /Enhancements Made:[\s\S]*?(?=\n\n|\n#|$)/gi,
    /Key Enhancements:[\s\S]*?(?=\n\n|\n#|$)/gi,
    /Changes Made:[\s\S]*?(?=\n\n|\n#|$)/gi,
    /Improvements Made:[\s\S]*?(?=\n\n|\n#|$)/gi,
    /Summary of Changes:[\s\S]*?(?=\n\n|\n#|$)/gi,
    /Citations added where appropriate.*?(?=\n|$)/gi,
    /Methodology Note:.*?(?=\n|$)/gi,
    /\*Last updated:.*?\*/gi,
    /The revised content.*?:\s*\n?/gi,
    /readability concerns:.*?(?=\n|$)/gi,
    /enhanced version of the blog post.*?:\s*\n?/gi,
    /\benhanced version\b.*?:/gi,
  ],
  
  // Malformed image placeholders - markdown images without valid URLs
  malformedImages: [
    /!\[[^\]]*\]\(\s*\)/g,  // ![alt]() - empty URL
    /!\[\]\([^)]*\)/g,  // ![](...) - empty alt
    /^!(?:AI|Featured|Modern|Content|Image)\s+[^\n!]{5,50}(?=\s|\n|$)/gim,  // !AI Marketing...
    /^!\s*([A-Z][a-zA-Z\s]{5,40})(?=\n|$)/gm,  // ! Some Title Text
    /!\[?[^\]]*\]?(?!\()/g,  // Incomplete markdown image syntax
  ],
  
  // Broken/truncated text patterns - often from DataForSEO or poor generation
  brokenText: [
    { pattern: /\bf\.\s+(?=\d{4})/gi, replacement: '' },  // "f. 2025" -> "2025"
    { pattern: /\bf\.\s+/gi, replacement: 'for ' },  // "f. example" -> "for example"
    { pattern: /\s+\.\s+(?=[a-z])/gi, replacement: ' ' },  // ". word" -> " word"
    { pattern: /\s+,\s+/g, replacement: ', ' },  // " , " -> ", "
    { pattern: /\.\s*\./g, replacement: '.' },  // ".." -> "."
    { pattern: /,\s*,/g, replacement: ',' },  // ",," -> ","
  ],
  
  // Duplicate keyword patterns - keyword repeated at start
  duplicateKeywords: [
    /^([a-z][a-z\s]{2,40})\s+\1\s+/i,  // "best ai agents best ai agents Here..."
  ],
  
  // Placeholder example patterns - AI using placeholder text
  placeholderExamples: [
    /\b(?:for example|such as|like|for instance)\s+similar cases?\.\.?/gi,
    /\[insert .*?\]/gi,
    /\{.*?placeholder.*?\}/gi,
    /\[TODO:.*?\]/gi,
    /\[PLACEHOLDER\]/gi,
  ],
  
  // Broken HTML artifacts - exposed attributes from malformed tags
  brokenHtml: [
    /["']\s*class=["'][^"']*["']\s*>/gi,
    /["']\s*style=["'][^"']*["']\s*>/gi,
    /\s+class=["'][^"']*["'](?=\s|>|$)/gi,
    /\s+style=["'][^"']*["'](?=\s|>|$)/gi,
    /^[^<]*>/gm,  // Orphaned closing brackets at start of line
  ],
};

/**
 * Sanitize content by removing all known AI artifacts
 * 
 * @param content - The content to sanitize (HTML or mixed markdown/HTML)
 * @param options - Optional configuration
 * @returns SanitizationResult with cleaned content and statistics
 */
export function sanitizeContent(
  content: string,
  options: {
    aggressive?: boolean;  // Enable more aggressive cleaning
    preserveImages?: boolean;  // Don't remove malformed images, just fix them
  } = {}
): SanitizationResult {
  if (!content || typeof content !== 'string') {
    return {
      content: '',
      wasModified: false,
      artifactsRemoved: [],
      stats: {
        preambleRemoved: 0,
        metaCommentaryRemoved: 0,
        malformedImagesRemoved: 0,
        brokenPunctuationFixed: 0,
        duplicateKeywordsRemoved: 0,
      },
    };
  }

  let cleaned = content;
  const artifactsRemoved: string[] = [];
  const stats = {
    preambleRemoved: 0,
    metaCommentaryRemoved: 0,
    malformedImagesRemoved: 0,
    brokenPunctuationFixed: 0,
    duplicateKeywordsRemoved: 0,
  };

  // Step 1: Remove preamble patterns
  for (const pattern of ARTIFACT_PATTERNS.preamble) {
    const matches = cleaned.match(pattern);
    if (matches) {
      stats.preambleRemoved += matches.length;
      artifactsRemoved.push(`preamble: "${matches[0].substring(0, 50)}..."`);
      cleaned = cleaned.replace(pattern, '');
    }
  }

  // Step 2: Remove meta-commentary patterns
  for (const pattern of ARTIFACT_PATTERNS.metaCommentary) {
    const matches = cleaned.match(pattern);
    if (matches) {
      stats.metaCommentaryRemoved += matches.length;
      artifactsRemoved.push(`meta-commentary: "${matches[0].substring(0, 50)}..."`);
      cleaned = cleaned.replace(pattern, '');
    }
  }

  // Step 3: Handle malformed images
  if (!options.preserveImages) {
    for (const pattern of ARTIFACT_PATTERNS.malformedImages) {
      const matches = cleaned.match(pattern);
      if (matches) {
        stats.malformedImagesRemoved += matches.length;
        artifactsRemoved.push(`malformed-image: ${matches.length} removed`);
        cleaned = cleaned.replace(pattern, '');
      }
    }
  }

  // Step 4: Fix broken text patterns
  for (const { pattern, replacement } of ARTIFACT_PATTERNS.brokenText) {
    const matches = cleaned.match(pattern);
    if (matches) {
      stats.brokenPunctuationFixed += matches.length;
      cleaned = cleaned.replace(pattern, replacement);
    }
  }

  // Step 5: Remove duplicate keywords at start
  for (const pattern of ARTIFACT_PATTERNS.duplicateKeywords) {
    const matches = cleaned.match(pattern);
    if (matches) {
      stats.duplicateKeywordsRemoved += matches.length;
      artifactsRemoved.push(`duplicate-keyword: "${matches[0].substring(0, 30)}..."`);
      cleaned = cleaned.replace(pattern, '$1 ');
    }
  }

  // Step 6: Remove placeholder examples
  for (const pattern of ARTIFACT_PATTERNS.placeholderExamples) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Step 7: Clean broken HTML artifacts (if aggressive mode)
  if (options.aggressive) {
    for (const pattern of ARTIFACT_PATTERNS.brokenHtml) {
      cleaned = cleaned.replace(pattern, '');
    }
  }

  // Step 8: Clean up resulting whitespace
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');  // Max 3 newlines
  cleaned = cleaned.replace(/\s{3,}/g, '  ');  // Max 2 spaces
  cleaned = cleaned.trim();

  const wasModified = cleaned !== content;

  if (wasModified && artifactsRemoved.length > 0) {
    logger.info('Content sanitized', {
      artifactsRemoved: artifactsRemoved.length,
      stats,
    });
  }

  return {
    content: cleaned,
    wasModified,
    artifactsRemoved,
    stats,
  };
}

/**
 * Sanitize excerpt/meta description
 * 
 * @param excerpt - The excerpt to clean
 * @param primaryKeyword - Optional primary keyword to check for duplication
 * @returns ExcerptSanitizationResult
 */
export function sanitizeExcerpt(
  excerpt: string,
  primaryKeyword?: string
): ExcerptSanitizationResult {
  if (!excerpt || typeof excerpt !== 'string') {
    return {
      excerpt: '',
      wasModified: false,
      issues: ['Empty excerpt provided'],
    };
  }

  let cleaned = excerpt;
  const issues: string[] = [];
  const original = excerpt;

  // Step 1: Remove keyword prefix if it's just repeated
  if (primaryKeyword) {
    const keywordLower = primaryKeyword.toLowerCase().trim();
    if (cleaned.toLowerCase().startsWith(keywordLower)) {
      cleaned = cleaned.substring(primaryKeyword.length).trim();
      // Capitalize first letter
      if (cleaned) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
      issues.push('Removed duplicate keyword prefix');
    }
  }

  // Step 2: Remove preamble phrases
  const excerptPreambles = [
    /^Here's (?:the |an |a )?.*?:\s*/i,
    /^This (?:article|post|guide|blog) (?:will |explains? |covers? |discusses? ).*?:\s*/i,
    /^In this (?:article|post|guide|blog),?\s*/i,
    /^Learn (?:about |how to ).*?:\s*/i,
    /^Discover .*?:\s*/i,
  ];

  for (const pattern of excerptPreambles) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '');
      issues.push('Removed preamble phrase');
    }
  }

  // Step 3: Fix broken text
  cleaned = cleaned.replace(/\bf\.\s+/gi, 'for ');
  cleaned = cleaned.replace(/\s+\.\s+/g, '. ');
  cleaned = cleaned.replace(/\.\s*\./g, '.');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');

  // Step 4: Remove markdown/HTML artifacts
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');  // [text](url) -> text
  cleaned = cleaned.replace(/<[^>]+>/g, '');  // Remove HTML tags
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');  // **bold** -> bold
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');  // *italic* -> italic

  // Step 5: Ensure proper ending
  cleaned = cleaned.trim();
  if (cleaned && !/[.!?]$/.test(cleaned)) {
    // Find last complete sentence
    const lastSentenceEnd = Math.max(
      cleaned.lastIndexOf('. '),
      cleaned.lastIndexOf('! '),
      cleaned.lastIndexOf('? ')
    );
    
    if (lastSentenceEnd > cleaned.length * 0.5) {
      cleaned = cleaned.substring(0, lastSentenceEnd + 1);
      issues.push('Truncated to last complete sentence');
    } else {
      cleaned = cleaned.replace(/[,;:\s]+$/, '') + '.';
      issues.push('Added period to incomplete ending');
    }
  }

  // Step 6: Enforce length limits for meta description
  if (cleaned.length > 160) {
    const truncated = cleaned.substring(0, 157);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 100) {
      cleaned = truncated.substring(0, lastSpace) + '...';
    } else {
      cleaned = truncated + '...';
    }
    issues.push('Truncated to 160 character limit');
  }

  // Step 7: Check for minimum length
  if (cleaned.length < 50 && cleaned.length > 0) {
    issues.push('Excerpt may be too short (under 50 characters)');
  }

  return {
    excerpt: cleaned.trim(),
    wasModified: cleaned !== original,
    issues,
  };
}

/**
 * Sanitize title
 * 
 * @param title - The title to clean
 * @returns Cleaned title
 */
export function sanitizeTitle(title: string): string {
  if (!title || typeof title !== 'string') {
    return '';
  }

  let cleaned = title;

  // Remove common title artifacts
  cleaned = cleaned.replace(/^#\s+/, '');  // Remove markdown heading
  cleaned = cleaned.replace(/^Title:\s*/i, '');
  cleaned = cleaned.replace(/^\[.*?\]\s*/, '');  // Remove [Category] prefix
  
  // Remove preamble that leaked into title
  cleaned = cleaned.replace(/^Here's .*?:\s*/i, '');
  cleaned = cleaned.replace(/^The Enhanced .*?:\s*/i, '');

  // Clean up whitespace
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  // Remove trailing punctuation that shouldn't be in titles
  cleaned = cleaned.replace(/[.,:;]+$/, '');

  return cleaned;
}

/**
 * Full sanitization pipeline for blog content
 * Sanitizes title, excerpt, and content together
 * 
 * @param data - Object containing title, excerpt, content
 * @param primaryKeyword - Optional primary keyword for excerpt cleaning
 * @returns Fully sanitized object
 */
export function sanitizeBlogData(
  data: {
    title?: string;
    excerpt?: string;
    content?: string;
  },
  primaryKeyword?: string
): {
  title: string;
  excerpt: string;
  content: string;
  sanitizationApplied: boolean;
  summary: string[];
} {
  const summary: string[] = [];

  // Sanitize title
  const title = sanitizeTitle(data.title || '');
  if (title !== data.title) {
    summary.push('Title sanitized');
  }

  // Sanitize excerpt
  const excerptResult = sanitizeExcerpt(data.excerpt || '', primaryKeyword);
  if (excerptResult.wasModified) {
    summary.push(`Excerpt: ${excerptResult.issues.join(', ')}`);
  }

  // Sanitize content
  const contentResult = sanitizeContent(data.content || '');
  if (contentResult.wasModified) {
    summary.push(`Content: ${contentResult.artifactsRemoved.length} artifacts removed`);
  }

  return {
    title,
    excerpt: excerptResult.excerpt,
    content: contentResult.content,
    sanitizationApplied: summary.length > 0,
    summary,
  };
}

export default {
  sanitizeContent,
  sanitizeExcerpt,
  sanitizeTitle,
  sanitizeBlogData,
};

