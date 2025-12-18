/**
 * AI Gateway Post-Processor
 * 
 * Uses Vercel AI SDK for post-processing blog content with quality review,
 * artifact detection, and SEO analysis.
 */

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { logger } from '@/utils/logger';
import { checkContentQuality, cleanContent, QualityIssue } from './quality-checker';

// Initialize OpenAI provider for AI Gateway
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface PostProcessingResult {
  cleanedContent: string;
  qualityScore: number;
  issuesFound: QualityIssue[];
  seoSuggestions: string[];
  metaTags: {
    title: string;
    description: string;
    ogTitle?: string;
    ogDescription?: string;
  };
  processingTime: number;
}

export interface PostProcessingOptions {
  content: string;
  title: string;
  keywords: string[];
  targetAudience?: string;
  enableAISuggestions?: boolean;
}

/**
 * Check if AI Gateway is configured and enabled
 */
export function isAIGatewayEnabled(): boolean {
  const enabled = process.env.AI_GATEWAY_ENABLED === 'true';
  const hasKey = !!process.env.OPENAI_API_KEY;
  return enabled && hasKey;
}

/**
 * Generate SEO-optimized meta tags using AI
 */
async function generateMetaTags(
  content: string,
  title: string,
  keywords: string[]
): Promise<PostProcessingResult['metaTags']> {
  if (!process.env.OPENAI_API_KEY) {
    // Fallback to basic extraction
    return {
      title: title.length > 60 ? title.substring(0, 57) + '...' : title,
      description: extractExcerpt(content, 160),
      ogTitle: title,
      ogDescription: extractExcerpt(content, 200),
    };
  }

  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `Generate SEO-optimized meta tags for this blog post.

Title: ${title}
Keywords: ${keywords.join(', ')}
Content Preview: ${content.substring(0, 1000)}

Return a JSON object with:
- title: SEO title (50-60 characters, include primary keyword)
- description: Meta description (150-160 characters, compelling and includes keywords)
- ogTitle: Open Graph title (can be slightly longer)
- ogDescription: Open Graph description (can be more descriptive)

Return ONLY valid JSON, no markdown.`,
    });

    try {
      const parsed = JSON.parse(text);
      return {
        title: parsed.title || title,
        description: parsed.description || extractExcerpt(content, 160),
        ogTitle: parsed.ogTitle || title,
        ogDescription: parsed.ogDescription || extractExcerpt(content, 200),
      };
    } catch {
      logger.warn('Failed to parse AI meta tags response, using fallback');
      return {
        title,
        description: extractExcerpt(content, 160),
        ogTitle: title,
        ogDescription: extractExcerpt(content, 200),
      };
    }
  } catch (error) {
    logger.error('AI meta tag generation failed', { error });
    return {
      title,
      description: extractExcerpt(content, 160),
      ogTitle: title,
      ogDescription: extractExcerpt(content, 200),
    };
  }
}

/**
 * Generate SEO improvement suggestions using AI
 */
async function generateSEOSuggestions(
  content: string,
  title: string,
  keywords: string[]
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    return getBasicSEOSuggestions(content, keywords);
  }

  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `Analyze this blog post for SEO and provide 3-5 specific improvement suggestions.

Title: ${title}
Keywords: ${keywords.join(', ')}
Content Length: ${content.length} characters

Content Preview:
${content.substring(0, 2000)}

Return a JSON array of strings with actionable suggestions. Focus on:
- Keyword usage and density
- Heading structure
- Internal/external linking
- Content comprehensiveness
- Readability

Return ONLY a valid JSON array, no markdown.`,
    });

    try {
      const suggestions = JSON.parse(text);
      if (Array.isArray(suggestions)) {
        return suggestions.slice(0, 5);
      }
    } catch {
      logger.warn('Failed to parse AI SEO suggestions, using fallback');
    }
  } catch (error) {
    logger.error('AI SEO suggestions failed', { error });
  }

  return getBasicSEOSuggestions(content, keywords);
}

/**
 * Basic SEO suggestions without AI
 */
function getBasicSEOSuggestions(content: string, keywords: string[]): string[] {
  const suggestions: string[] = [];
  
  // Check keyword presence
  const contentLower = content.toLowerCase();
  for (const keyword of keywords.slice(0, 3)) {
    const keywordLower = keyword.toLowerCase();
    const count = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
    if (count < 2) {
      suggestions.push(`Consider using "${keyword}" more frequently (currently ${count} times)`);
    }
  }
  
  // Check heading count
  const h2Count = (content.match(/<h2|^##/gm) || []).length;
  if (h2Count < 3) {
    suggestions.push('Add more H2 sections to improve content structure');
  }
  
  // Check for internal links
  const linkCount = (content.match(/<a[^>]*href/gi) || []).length;
  if (linkCount < 2) {
    suggestions.push('Add more internal links to related content');
  }
  
  // Check content length
  const wordCount = content.split(/\s+/).length;
  if (wordCount < 800) {
    suggestions.push(`Content is ${wordCount} words. Consider expanding to 1000+ words for better SEO`);
  }
  
  return suggestions;
}

/**
 * Extract an excerpt from content
 */
function extractExcerpt(content: string, maxLength: number): string {
  // Remove HTML tags
  const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (plainText.length <= maxLength) {
    return plainText;
  }
  
  // Cut at word boundary
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
}

/**
 * Post-process blog content with quality review and SEO optimization
 */
export async function postProcessBlogContent(
  options: PostProcessingOptions
): Promise<PostProcessingResult> {
  const startTime = Date.now();
  const { content, title, keywords, enableAISuggestions = true } = options;
  
  logger.info('Starting post-processing', {
    titleLength: title.length,
    contentLength: content.length,
    keywordCount: keywords.length,
    aiEnabled: isAIGatewayEnabled() && enableAISuggestions,
  });
  
  // Step 1: Quality check and clean content
  const qualityResult = checkContentQuality(content);
  
  // Step 2: Generate SEO suggestions
  let seoSuggestions: string[] = [];
  if (enableAISuggestions && isAIGatewayEnabled()) {
    seoSuggestions = await generateSEOSuggestions(
      qualityResult.cleanedContent,
      title,
      keywords
    );
  } else {
    seoSuggestions = getBasicSEOSuggestions(qualityResult.cleanedContent, keywords);
  }
  
  // Step 3: Generate optimized meta tags
  let metaTags: PostProcessingResult['metaTags'];
  if (enableAISuggestions && isAIGatewayEnabled()) {
    metaTags = await generateMetaTags(qualityResult.cleanedContent, title, keywords);
  } else {
    metaTags = {
      title: title.length > 60 ? title.substring(0, 57) + '...' : title,
      description: extractExcerpt(qualityResult.cleanedContent, 160),
      ogTitle: title,
      ogDescription: extractExcerpt(qualityResult.cleanedContent, 200),
    };
  }
  
  const processingTime = Date.now() - startTime;
  
  logger.info('Post-processing complete', {
    qualityScore: qualityResult.qualityScore,
    issueCount: qualityResult.issues.length,
    suggestionCount: seoSuggestions.length,
    processingTime,
  });
  
  return {
    cleanedContent: qualityResult.cleanedContent,
    qualityScore: qualityResult.qualityScore,
    issuesFound: qualityResult.issues,
    seoSuggestions,
    metaTags,
    processingTime,
  };
}

/**
 * Quick clean content without AI processing
 */
export function quickCleanContent(content: string): string {
  return cleanContent(content);
}
