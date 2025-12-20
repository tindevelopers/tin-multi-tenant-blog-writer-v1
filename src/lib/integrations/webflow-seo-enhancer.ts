/**
 * Webflow SEO Enhancer
 * 
 * Enhances blog posts for SEO before publishing to Webflow.
 * Includes meta tags, Schema.org structured data, image optimization,
 * and internal linking validation.
 */

import { logger } from '@/utils/logger';

export interface SEOMetaTags {
  seoTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
  canonicalUrl?: string;
  focusKeyword?: string;
}

export interface ArticleSchema {
  '@context': 'https://schema.org';
  '@type': 'Article' | 'BlogPosting';
  headline: string;
  description: string;
  author: {
    '@type': 'Person' | 'Organization';
    name: string;
    url?: string;
  };
  datePublished: string;
  dateModified: string;
  image: string[];
  publisher: {
    '@type': 'Organization';
    name: string;
    logo?: {
      '@type': 'ImageObject';
      url: string;
    };
  };
  mainEntityOfPage?: {
    '@type': 'WebPage';
    '@id': string;
  };
  keywords?: string[];
  wordCount?: number;
  articleSection?: string;
}

export interface ImageSEOData {
  src: string;
  alt: string;
  title?: string;
  width?: number;
  height?: number;
}

export interface SEOEnhancementResult {
  metaTags: SEOMetaTags;
  schemaMarkup: ArticleSchema;
  images: ImageSEOData[];
  internalLinks: {
    found: number;
    valid: number;
    suggestions: string[];
  };
  seoScore: number;
  recommendations: string[];
}

export interface SEOEnhancementOptions {
  content: string;
  title: string;
  excerpt?: string;
  keywords: string[];
  siteUrl?: string;
  siteName?: string;
  authorName?: string;
  featuredImage?: string;
  publishDate?: Date;
  modifiedDate?: Date;
  slug?: string;
}

/**
 * Extract images from HTML content
 */
function extractImages(content: string): ImageSEOData[] {
  const images: ImageSEOData[] = [];
  const imgRegex = /<img[^>]+>/gi;
  const matches = content.match(imgRegex) || [];
  
  for (const match of matches) {
    const srcMatch = match.match(/src=["']([^"']+)["']/i);
    const altMatch = match.match(/alt=["']([^"']*)["']/i);
    const titleMatch = match.match(/title=["']([^"']*)["']/i);
    const widthMatch = match.match(/width=["']?(\d+)["']?/i);
    const heightMatch = match.match(/height=["']?(\d+)["']?/i);
    
    if (srcMatch) {
      images.push({
        src: srcMatch[1],
        alt: altMatch?.[1] || '',
        title: titleMatch?.[1],
        width: widthMatch ? parseInt(widthMatch[1]) : undefined,
        height: heightMatch ? parseInt(heightMatch[1]) : undefined,
      });
    }
  }
  
  return images;
}

/**
 * Generate alt text for images
 */
function generateImageAltText(
  imageSrc: string,
  context: string,
  keywords: string[]
): string {
  return `Image related to ${keywords[0] || 'the article content'}`;
}

/**
 * Count and validate internal links
 */
function analyzeInternalLinks(content: string, siteUrl?: string): {
  found: number;
  valid: number;
  suggestions: string[];
} {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  const matches = [...content.matchAll(linkRegex)];
  
  let found = 0;
  let valid = 0;
  const suggestions: string[] = [];
  
  for (const match of matches) {
    const href = match[1];
    
    // Check if internal link
    if (href.startsWith('/') || (siteUrl && href.startsWith(siteUrl))) {
      found++;
      
      // Basic validation
      if (href.length > 1 && !href.includes('undefined') && !href.includes('null')) {
        valid++;
      }
    }
  }
  
  // Suggest improvements
  if (found < 2) {
    suggestions.push('Add more internal links to improve site navigation and SEO');
  }
  
  if (found > 0 && valid < found) {
    suggestions.push(`${found - valid} internal links may be broken or invalid`);
  }
  
  return { found, valid, suggestions };
}

/**
 * Calculate SEO score based on various factors
 */
function calculateSEOScore(
  content: string,
  title: string,
  metaTags: SEOMetaTags,
  images: ImageSEOData[],
  internalLinks: { found: number; valid: number }
): number {
  let score = 100;
  const deductions: { reason: string; points: number }[] = [];
  
  // Title checks
  if (title.length < 30) {
    deductions.push({ reason: 'Title too short', points: 5 });
  }
  if (title.length > 70) {
    deductions.push({ reason: 'Title too long', points: 3 });
  }
  
  // Meta description checks
  if (!metaTags.metaDescription || metaTags.metaDescription.length < 100) {
    deductions.push({ reason: 'Meta description too short', points: 10 });
  }
  if (metaTags.metaDescription && metaTags.metaDescription.length > 170) {
    deductions.push({ reason: 'Meta description too long', points: 3 });
  }
  
  // Content length
  const wordCount = content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  if (wordCount < 300) {
    deductions.push({ reason: 'Content too short', points: 15 });
  } else if (wordCount < 800) {
    deductions.push({ reason: 'Content could be longer', points: 5 });
  }
  
  // Heading structure
  const h2Count = (content.match(/<h2|##/gi) || []).length;
  if (h2Count < 2) {
    deductions.push({ reason: 'Not enough H2 headings', points: 5 });
  }
  
  // Images
  if (images.length === 0) {
    deductions.push({ reason: 'No images found', points: 10 });
  } else {
    const imagesWithoutAlt = images.filter(img => !img.alt || img.alt.length < 5).length;
    if (imagesWithoutAlt > 0) {
      deductions.push({ reason: `${imagesWithoutAlt} images missing alt text`, points: 5 });
    }
  }
  
  // Internal links
  if (internalLinks.found < 2) {
    deductions.push({ reason: 'Not enough internal links', points: 5 });
  }
  
  // Calculate final score
  for (const { points } of deductions) {
    score -= points;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate Schema.org Article structured data
 */
function generateSchemaMarkup(options: SEOEnhancementOptions): ArticleSchema {
  const {
    title,
    excerpt,
    content,
    keywords,
    siteName = 'Blog',
    authorName = 'Author',
    featuredImage,
    publishDate = new Date(),
    modifiedDate = new Date(),
    siteUrl,
    slug,
  } = options;
  
  const images: string[] = [];
  if (featuredImage) {
    images.push(featuredImage);
  }
  
  // Extract additional images from content
  const contentImages = extractImages(content);
  for (const img of contentImages.slice(0, 3)) {
    if (img.src && !images.includes(img.src)) {
      images.push(img.src);
    }
  }
  
  const wordCount = content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  
  const schema: ArticleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title.substring(0, 110),
    description: excerpt || title,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    datePublished: publishDate.toISOString(),
    dateModified: modifiedDate.toISOString(),
    image: images.length > 0 ? images : ['https://via.placeholder.com/1200x630?text=Blog+Post'],
    publisher: {
      '@type': 'Organization',
      name: siteName,
    },
    keywords: keywords.slice(0, 10),
    wordCount,
  };
  
  if (siteUrl && slug) {
    schema.mainEntityOfPage = {
      '@type': 'WebPage',
      '@id': `${siteUrl}/${slug}`,
    };
  }
  
  return schema;
}

/**
 * Generate SEO recommendations
 */
function generateRecommendations(
  content: string,
  metaTags: SEOMetaTags,
  images: ImageSEOData[],
  internalLinks: { found: number; valid: number; suggestions: string[] },
  keywords: string[]
): string[] {
  const recommendations: string[] = [...internalLinks.suggestions];
  
  const contentLower = content.toLowerCase();
  const wordCount = content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  
  // Keyword density check
  if (keywords.length > 0) {
    const primaryKeyword = keywords[0].toLowerCase();
    const keywordCount = (contentLower.match(new RegExp(primaryKeyword, 'g')) || []).length;
    const density = (keywordCount / wordCount) * 100;
    
    if (density < 0.5) {
      recommendations.push(`Primary keyword "${keywords[0]}" appears only ${keywordCount} times. Consider using it more naturally.`);
    } else if (density > 3) {
      recommendations.push(`Primary keyword "${keywords[0]}" may be overused. Consider reducing keyword stuffing.`);
    }
  }
  
  // Image recommendations
  if (images.length === 0) {
    recommendations.push('Add at least one relevant image to improve engagement and SEO');
  }
  
  const imagesNeedingAlt = images.filter(img => !img.alt || img.alt.length < 10);
  if (imagesNeedingAlt.length > 0) {
    recommendations.push(`${imagesNeedingAlt.length} image(s) need better alt text for accessibility and SEO`);
  }
  
  // Content length
  if (wordCount < 1000) {
    recommendations.push(`Consider expanding content to 1000+ words (currently ${wordCount} words) for better SEO ranking`);
  }
  
  // Meta description
  if (metaTags.metaDescription.length < 120) {
    recommendations.push('Meta description is shorter than recommended. Aim for 150-160 characters.');
  }
  
  return recommendations.slice(0, 5);
}

/**
 * Enhance blog content for Webflow SEO
 */
export async function enhanceForWebflowSEO(
  options: SEOEnhancementOptions
): Promise<SEOEnhancementResult> {
  const {
    content,
    title,
    excerpt,
    keywords,
    siteUrl,
    featuredImage,
  } = options;
  
  logger.info('Starting Webflow SEO enhancement', {
    titleLength: title.length,
    contentLength: content.length,
    keywordCount: keywords.length,
  });
  
  // Extract and enhance images
  const images = extractImages(content);
  
  // Generate alt text for images without alt
  for (const image of images) {
    if (!image.alt || image.alt.length < 5) {
      image.alt = generateImageAltText(image.src, content, keywords);
    }
  }
  
  // Generate meta tags
  const metaTags: SEOMetaTags = {
    seoTitle: title.length > 60 ? title.substring(0, 57) + '...' : title,
    metaDescription: excerpt || extractExcerpt(content, 160),
    ogTitle: title,
    ogDescription: excerpt || extractExcerpt(content, 200),
    ogImage: featuredImage || (images.length > 0 ? images[0].src : undefined),
    focusKeyword: keywords[0],
  };
  
  if (siteUrl && options.slug) {
    metaTags.canonicalUrl = `${siteUrl}/${options.slug}`;
  }
  
  // Analyze internal links
  const internalLinks = analyzeInternalLinks(content, siteUrl);
  
  // Generate schema markup
  const schemaMarkup = generateSchemaMarkup(options);
  
  // Calculate SEO score
  const seoScore = calculateSEOScore(content, title, metaTags, images, internalLinks);
  
  // Generate recommendations
  const recommendations = generateRecommendations(content, metaTags, images, internalLinks, keywords);
  
  logger.info('Webflow SEO enhancement complete', {
    seoScore,
    imageCount: images.length,
    internalLinkCount: internalLinks.found,
    recommendationCount: recommendations.length,
  });
  
  return {
    metaTags,
    schemaMarkup,
    images,
    internalLinks,
    seoScore,
    recommendations,
  };
}

/**
 * Extract an excerpt from content
 */
function extractExcerpt(content: string, maxLength: number): string {
  const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (plainText.length <= maxLength) {
    return plainText;
  }
  
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
}

/**
 * Generate Schema.org JSON-LD script tag
 */
export function generateSchemaScript(schema: ArticleSchema): string {
  return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;
}
