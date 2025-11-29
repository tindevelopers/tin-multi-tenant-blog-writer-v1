/**
 * Content Analysis Service
 * 
 * Analyzes blog content to calculate:
 * - Readability Score (0-100)
 * - SEO Score (0-100)
 * - Quality Score (0-100)
 * - Content metrics (word count, reading time, headings, links, images)
 */

import { calculateWordCountFromContent } from './content-extraction-utils';

export interface ContentAnalysisResult {
  readability_score: number;
  seo_score: number;
  quality_score: number;
  word_count: number;
  reading_time_minutes: number;
  headings_count: number;
  links_count: number;
  images_count: number;
  keyword_density: Record<string, number>;
  missing_keywords: string[];
  recommendations: string[];
  content_structure?: {
    has_title: boolean;
    has_meta_description: boolean;
    has_featured_image: boolean;
    heading_structure: {
      h1: number;
      h2: number;
      h3: number;
      h4: number;
    };
    paragraph_count: number;
    list_count: number;
  };
}

export interface ContentAnalysisOptions {
  content: string;
  title?: string;
  meta_description?: string;
  keywords?: string[];
  target_keyword?: string;
  featured_image?: string;
}

/**
 * Analyze content and calculate scores
 */
export function analyzeContent(options: ContentAnalysisOptions): ContentAnalysisResult {
  const { content, title, meta_description, keywords = [], target_keyword, featured_image } = options;

  // Extract text content (remove HTML)
  const textContent = extractTextFromHTML(content);
  
  // Calculate basic metrics
  const wordCount = calculateWordCountFromContent(content);
  const readingTimeMinutes = calculateReadingTime(wordCount);
  const headingsCount = countHeadings(content);
  const linksCount = countLinks(content);
  const imagesCount = countImages(content);
  
  // Calculate scores
  const readabilityScore = calculateReadabilityScore(textContent, wordCount);
  const seoScore = calculateSEOScore({
    content,
    textContent,
    title,
    meta_description,
    keywords,
    target_keyword,
    featured_image,
    wordCount,
    headingsCount,
    linksCount,
    imagesCount,
  });
  const qualityScore = calculateQualityScore({
    readabilityScore,
    seoScore,
    wordCount,
    headingsCount,
    linksCount,
    imagesCount,
  });

  // Analyze keyword density
  const keywordDensity = calculateKeywordDensity(textContent, keywords, target_keyword);
  
  // Find missing keywords
  const missingKeywords = findMissingKeywords(textContent, keywords, target_keyword);
  
  // Generate recommendations
  const recommendations = generateRecommendations({
    readabilityScore,
    seoScore,
    qualityScore,
    wordCount,
    headingsCount,
    linksCount,
    imagesCount,
    missingKeywords,
    hasTitle: !!title,
    hasMetaDescription: !!meta_description,
    hasFeaturedImage: !!featured_image,
  });

  // Analyze content structure
  const contentStructure = analyzeContentStructure(content, title, meta_description, featured_image);

  return {
    readability_score: Math.round(readabilityScore),
    seo_score: Math.round(seoScore),
    quality_score: Math.round(qualityScore),
    word_count: wordCount,
    reading_time_minutes: readingTimeMinutes,
    headings_count: headingsCount,
    links_count: linksCount,
    images_count: imagesCount,
    keyword_density: keywordDensity,
    missing_keywords: missingKeywords,
    recommendations,
    content_structure: contentStructure,
  };
}

/**
 * Extract plain text from HTML content
 */
function extractTextFromHTML(html: string): string {
  if (!html) return '';
  
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Replace block elements with newlines
  text = text.replace(/<\/?(p|div|h[1-6]|li|br|hr)[^>]*>/gi, '\n');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Calculate reading time in minutes (assuming 200 words per minute)
 */
function calculateReadingTime(wordCount: number): number {
  const wordsPerMinute = 200;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Count headings in content
 */
function countHeadings(content: string): number {
  if (!content) return 0;
  const headingMatches = content.match(/<h[1-6][^>]*>/gi);
  return headingMatches ? headingMatches.length : 0;
}

/**
 * Count links in content
 */
function countLinks(content: string): number {
  if (!content) return 0;
  const linkMatches = content.match(/<a[^>]+href=["'][^"']+["'][^>]*>/gi);
  return linkMatches ? linkMatches.length : 0;
}

/**
 * Count images in content
 */
function countImages(content: string): number {
  if (!content) return 0;
  const imageMatches = content.match(/<img[^>]*>/gi);
  return imageMatches ? imageMatches.length : 0;
}

/**
 * Calculate readability score using Flesch Reading Ease algorithm
 * Score range: 0-100 (higher is easier to read)
 */
function calculateReadabilityScore(text: string, wordCount: number): number {
  if (!text || wordCount === 0) return 0;

  // Count sentences (ending with . ! ?)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length || 1;
  
  // Count syllables (approximate: count vowel groups)
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  let syllableCount = 0;
  
  for (const word of words) {
    // Remove silent 'e' at the end
    let wordForSyllCount = word.replace(/e$/, '');
    // Count vowel groups
    const vowelGroups = wordForSyllCount.match(/[aeiouy]+/g);
    syllableCount += vowelGroups ? vowelGroups.length : 1;
  }
  
  // Flesch Reading Ease formula
  // Score = 206.835 - (1.015 × ASL) - (84.6 × ASW)
  // ASL = Average Sentence Length (words per sentence)
  // ASW = Average Syllables per Word
  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;
  
  let fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  
  // Normalize to 0-100 range
  fleschScore = Math.max(0, Math.min(100, fleschScore));
  
  return fleschScore;
}

/**
 * Calculate SEO score based on multiple factors
 */
function calculateSEOScore(params: {
  content: string;
  textContent: string;
  title?: string;
  meta_description?: string;
  keywords: string[];
  target_keyword?: string;
  featured_image?: string;
  wordCount: number;
  headingsCount: number;
  linksCount: number;
  imagesCount: number;
}): number {
  const {
    content,
    textContent,
    title,
    meta_description,
    keywords,
    target_keyword,
    featured_image,
    wordCount,
    headingsCount,
    linksCount,
    imagesCount,
  } = params;

  let score = 0;
  let maxScore = 0;

  // Title optimization (15 points)
  maxScore += 15;
  if (title) {
    const titleLength = title.length;
    if (titleLength >= 30 && titleLength <= 60) {
      score += 15; // Optimal length
    } else if (titleLength >= 20 && titleLength <= 70) {
      score += 10; // Acceptable
    } else {
      score += 5; // Too short or too long
    }
    
    // Check if target keyword is in title
    if (target_keyword && title.toLowerCase().includes(target_keyword.toLowerCase())) {
      score += 5; // Bonus for keyword in title
      maxScore += 5;
    }
  }

  // Meta description (10 points)
  maxScore += 10;
  if (meta_description) {
    const metaLength = meta_description.length;
    if (metaLength >= 120 && metaLength <= 160) {
      score += 10; // Optimal length
    } else if (metaLength >= 100 && metaLength <= 180) {
      score += 7; // Acceptable
    } else {
      score += 3; // Too short or too long
    }
    
    // Check if target keyword is in meta description
    if (target_keyword && meta_description.toLowerCase().includes(target_keyword.toLowerCase())) {
      score += 3; // Bonus for keyword in meta
      maxScore += 3;
    }
  }

  // Content length (15 points)
  maxScore += 15;
  if (wordCount >= 2000) {
    score += 15; // Excellent (comprehensive content)
  } else if (wordCount >= 1000) {
    score += 12; // Good
  } else if (wordCount >= 500) {
    score += 8; // Acceptable
  } else if (wordCount >= 300) {
    score += 5; // Minimum
  } else {
    score += 2; // Too short
  }

  // Heading structure (15 points)
  maxScore += 15;
  const h1Count = (content.match(/<h1[^>]*>/gi) || []).length;
  const h2Count = (content.match(/<h2[^>]*>/gi) || []).length;
  const h3Count = (content.match(/<h3[^>]*>/gi) || []).length;
  
  if (h1Count === 1) score += 5; // Should have exactly one H1
  if (h2Count >= 2) score += 5; // Should have multiple H2s
  if (h3Count >= 1) score += 5; // Should have H3s for structure
  
  // Check if target keyword is in headings
  if (target_keyword) {
    const headingText = content.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi)?.join(' ') || '';
    if (headingText.toLowerCase().includes(target_keyword.toLowerCase())) {
      score += 5; // Bonus for keyword in headings
      maxScore += 5;
    }
  }

  // Keyword usage (15 points)
  maxScore += 15;
  if (target_keyword) {
    const keywordCount = (textContent.toLowerCase().match(new RegExp(target_keyword.toLowerCase(), 'g')) || []).length;
    const keywordDensity = (keywordCount / wordCount) * 100;
    
    if (keywordDensity >= 0.5 && keywordDensity <= 2.5) {
      score += 15; // Optimal density
    } else if (keywordDensity >= 0.3 && keywordDensity <= 3.0) {
      score += 10; // Acceptable
    } else if (keywordDensity > 0 && keywordDensity < 0.3) {
      score += 5; // Too low
    } else {
      score += 2; // Too high (keyword stuffing)
    }
  } else {
    score += 5; // No target keyword specified
  }

  // Internal/External links (10 points)
  maxScore += 10;
  if (linksCount >= 3) {
    score += 10; // Good linking
  } else if (linksCount >= 1) {
    score += 6; // Some links
  } else {
    score += 2; // No links
  }

  // Images with alt text (10 points)
  maxScore += 10;
  if (imagesCount > 0) {
    const imagesWithAlt = (content.match(/<img[^>]+alt=["'][^"']+["'][^>]*>/gi) || []).length;
    const altTextRatio = imagesWithAlt / imagesCount;
    
    if (altTextRatio === 1) {
      score += 10; // All images have alt text
    } else if (altTextRatio >= 0.7) {
      score += 7; // Most images have alt text
    } else {
      score += 3; // Few images have alt text
    }
  } else {
    score += 2; // No images (not necessarily bad)
  }

  // Featured image (5 points)
  maxScore += 5;
  if (featured_image) {
    score += 5;
  }

  // Normalize to 0-100
  return (score / maxScore) * 100;
}

/**
 * Calculate overall quality score
 */
function calculateQualityScore(params: {
  readabilityScore: number;
  seoScore: number;
  wordCount: number;
  headingsCount: number;
  linksCount: number;
  imagesCount: number;
}): number {
  const { readabilityScore, seoScore, wordCount, headingsCount, linksCount, imagesCount } = params;

  // Base score is average of readability and SEO
  let qualityScore = (readabilityScore + seoScore) / 2;

  // Adjustments based on content structure
  const structureScore = Math.min(100, (
    (headingsCount >= 3 ? 20 : headingsCount * 6.67) +
    (linksCount >= 2 ? 20 : linksCount * 10) +
    (imagesCount >= 1 ? 20 : 0) +
    (wordCount >= 1000 ? 40 : wordCount / 25)
  ));

  // Weighted average: 60% content quality, 40% structure
  qualityScore = (qualityScore * 0.6) + (structureScore * 0.4);

  return Math.max(0, Math.min(100, qualityScore));
}

/**
 * Calculate keyword density for each keyword
 */
function calculateKeywordDensity(text: string, keywords: string[], targetKeyword?: string): Record<string, number> {
  const density: Record<string, number> = {};
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  
  if (wordCount === 0) return density;

  const allKeywords = targetKeyword ? [targetKeyword, ...keywords] : keywords;
  const lowerText = text.toLowerCase();

  for (const keyword of allKeywords) {
    if (!keyword) continue;
    const keywordLower = keyword.toLowerCase();
    const matches = (lowerText.match(new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    density[keyword] = (matches / wordCount) * 100;
  }

  return density;
}

/**
 * Find keywords that are missing from content
 */
function findMissingKeywords(text: string, keywords: string[], targetKeyword?: string): string[] {
  const missing: string[] = [];
  const lowerText = text.toLowerCase();

  const allKeywords = targetKeyword ? [targetKeyword, ...keywords] : keywords;

  for (const keyword of allKeywords) {
    if (!keyword) continue;
    const keywordLower = keyword.toLowerCase();
    if (!lowerText.includes(keywordLower)) {
      missing.push(keyword);
    }
  }

  return missing;
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(params: {
  readabilityScore: number;
  seoScore: number;
  qualityScore: number;
  wordCount: number;
  headingsCount: number;
  linksCount: number;
  imagesCount: number;
  missingKeywords: string[];
  hasTitle: boolean;
  hasMetaDescription: boolean;
  hasFeaturedImage: boolean;
}): string[] {
  const recommendations: string[] = [];

  // Readability recommendations
  if (params.readabilityScore < 60) {
    recommendations.push('Improve readability by using shorter sentences and simpler words');
  }
  if (params.readabilityScore < 40) {
    recommendations.push('Content is difficult to read. Consider breaking up long paragraphs');
  }

  // SEO recommendations
  if (!params.hasTitle) {
    recommendations.push('Add a title optimized for SEO (30-60 characters)');
  }
  if (!params.hasMetaDescription) {
    recommendations.push('Add a meta description (120-160 characters)');
  }
  if (!params.hasFeaturedImage) {
    recommendations.push('Add a featured image to improve engagement');
  }
  if (params.headingsCount < 3) {
    recommendations.push('Add more headings (H2, H3) to improve content structure');
  }
  if (params.linksCount < 2) {
    recommendations.push('Add internal and external links to improve SEO');
  }
  if (params.imagesCount === 0) {
    recommendations.push('Add images to break up text and improve engagement');
  }

  // Content length recommendations
  if (params.wordCount < 500) {
    recommendations.push('Content is too short. Aim for at least 500 words for better SEO');
  } else if (params.wordCount < 1000) {
    recommendations.push('Consider expanding content to 1000+ words for better ranking potential');
  }

  // Keyword recommendations
  if (params.missingKeywords.length > 0) {
    recommendations.push(`Include these keywords: ${params.missingKeywords.slice(0, 3).join(', ')}`);
  }

  // Quality recommendations
  if (params.qualityScore < 60) {
    recommendations.push('Overall content quality needs improvement. Review SEO and readability scores');
  }

  return recommendations;
}

/**
 * Analyze content structure
 */
function analyzeContentStructure(
  content: string,
  title?: string,
  metaDescription?: string,
  featuredImage?: string
): ContentAnalysisResult['content_structure'] {
  const h1Count = (content.match(/<h1[^>]*>/gi) || []).length;
  const h2Count = (content.match(/<h2[^>]*>/gi) || []).length;
  const h3Count = (content.match(/<h3[^>]*>/gi) || []).length;
  const h4Count = (content.match(/<h4[^>]*>/gi) || []).length;
  const paragraphCount = (content.match(/<p[^>]*>/gi) || []).length;
  const listCount = (content.match(/<(ul|ol)[^>]*>/gi) || []).length;

  return {
    has_title: !!title,
    has_meta_description: !!metaDescription,
    has_featured_image: !!featuredImage,
    heading_structure: {
      h1: h1Count,
      h2: h2Count,
      h3: h3Count,
      h4: h4Count,
    },
    paragraph_count: paragraphCount,
    list_count: listCount,
  };
}

