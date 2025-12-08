/**
 * Enhanced Interlinking Service
 * 
 * Bridges the gap between stored Webflow scan data and the InterlinkingEngine
 * Provides sophisticated link analysis using stored data without re-crawling
 * 
 * Phase 1: Better analysis of existing stored data
 * Phase 2: Optional lazy-loading of full content for top candidates
 */

import { logger } from '@/utils/logger';
import { InterlinkingEngine, type InterlinkingRequest, type LinkOpportunity } from './interlinking-engine';
import type { IndexedContent } from './content-indexer';
import type { ExistingContent } from '@/lib/integrations/webflow-structure-discovery';
import type { HyperlinkSuggestion } from '@/lib/integrations/webflow-hyperlink-service';

/**
 * Configuration for enhanced interlinking
 */
export interface EnhancedInterlinkingConfig {
  maxLinks?: number;
  enableLazyLoading?: boolean;  // Phase 2: Fetch full content for top candidates
  lazyLoadTopN?: number;        // How many top candidates to fetch full content for
  minRelevanceScore?: number;   // Minimum score to consider (0-1)
  webflowApiToken?: string;     // Required for Phase 2 lazy loading
  webflowSiteId?: string;       // Required for Phase 2 lazy loading
}

/**
 * Convert ExistingContent (from Webflow scan) to IndexedContent (for InterlinkingEngine)
 * This allows us to use the sophisticated engine with our stored data
 */
export function convertToIndexedContent(
  existingContent: ExistingContent[],
  options?: { extractTopicsFromKeywords?: boolean }
): IndexedContent[] {
  const extractTopics = options?.extractTopicsFromKeywords ?? true;
  
  return existingContent.map((item) => {
    // Extract topics from keywords (group related keywords)
    let topics: string[] = [];
    if (extractTopics && item.keywords.length > 0) {
      // Use top keywords as pseudo-topics
      // In the future, this could use LLM for better topic extraction
      topics = item.keywords.slice(0, 3);
    }
    
    // Estimate word count from title (rough estimate for authority scoring)
    // Since we don't have full content, use a default based on type
    const estimatedWordCount = item.type === 'cms' ? 1500 : 500;
    
    const indexed: IndexedContent = {
      id: `scan_${item.id}`,
      pageId: item.id,
      url: item.url,
      title: item.title,
      content: '', // We don't have full content from scan (Phase 2 can populate this)
      excerpt: item.title, // Use title as excerpt placeholder
      keywords: item.keywords,
      topics: topics,
      wordCount: estimatedWordCount,
      metadata: {
        publishedAt: item.published_at,
        type: item.type,
      },
      indexedAt: item.published_at,
      updatedAt: new Date().toISOString(),
    };
    
    return indexed;
  });
}

/**
 * Convert LinkOpportunity (from InterlinkingEngine) to HyperlinkSuggestion (for content insertion)
 */
export function convertToHyperlinkSuggestions(
  opportunities: LinkOpportunity[]
): HyperlinkSuggestion[] {
  return opportunities.map((opp) => ({
    anchor_text: opp.anchorText,
    url: opp.targetPage.url,
    type: (opp.targetPage.metadata?.type as 'cms' | 'static') || 'cms',
    relevance_score: opp.linkValue * 100, // Convert 0-1 to 0-100
    context: opp.context,
  }));
}

/**
 * Enhanced interlinking analysis using InterlinkingEngine
 * 
 * Phase 1: Uses stored scan data with sophisticated analysis
 * Phase 2 (optional): Lazy-loads full content for top candidates
 */
export async function analyzeInterlinkingEnhanced(
  content: string,
  title: string,
  keywords: string[],
  existingContent: ExistingContent[],
  config: EnhancedInterlinkingConfig = {}
): Promise<HyperlinkSuggestion[]> {
  const {
    maxLinks = 5,
    enableLazyLoading = false,
    lazyLoadTopN = 10,
    minRelevanceScore = 0.3,
  } = config;
  
  try {
    logger.info('Starting enhanced interlinking analysis', {
      contentLength: content.length,
      title,
      keywordsCount: keywords.length,
      existingContentCount: existingContent.length,
      enableLazyLoading,
    });
    
    // Phase 1: Convert stored content to IndexedContent format
    const indexedContent = convertToIndexedContent(existingContent);
    
    logger.debug('Converted existing content to indexed format', {
      indexedCount: indexedContent.length,
    });
    
    // Create the interlinking engine
    const engine = new InterlinkingEngine();
    
    // Extract topics from keywords for the request
    // Group keywords into broader topics
    const topics = extractTopicsFromKeywords(keywords);
    
    // Build the interlinking request
    const request: InterlinkingRequest = {
      content,
      title,
      keywords,
      topics,
      maxInternalLinks: maxLinks,
      maxExternalLinks: 0, // We're only doing internal links
    };
    
    // Run the interlinking analysis
    const analysis = await engine.analyzeInterlinking(request, indexedContent);
    
    logger.info('InterlinkingEngine analysis completed', {
      totalOpportunities: analysis.totalOpportunities,
      internalLinks: analysis.internalLinks.length,
      clusterLinks: analysis.clusterLinks.length,
      recommendedLinks: analysis.recommendedLinks,
    });
    
    // Get the top opportunities
    let topOpportunities = analysis.opportunities
      .filter(opp => opp.linkValue >= minRelevanceScore)
      .slice(0, maxLinks);
    
    // Phase 2: Optional lazy-loading for richer analysis
    if (enableLazyLoading && config.webflowApiToken && config.webflowSiteId) {
      topOpportunities = await enrichTopCandidates(
        topOpportunities,
        content,
        title,
        keywords,
        config.webflowApiToken,
        config.webflowSiteId,
        lazyLoadTopN
      );
    }
    
    // Convert to HyperlinkSuggestion format
    const suggestions = convertToHyperlinkSuggestions(topOpportunities);
    
    logger.info('Enhanced interlinking analysis complete', {
      suggestionsCount: suggestions.length,
      topRelevanceScore: suggestions[0]?.relevance_score || 0,
      cmsLinks: suggestions.filter(s => s.type === 'cms').length,
      staticLinks: suggestions.filter(s => s.type === 'static').length,
    });
    
    return suggestions;
  } catch (error: any) {
    logger.error('Enhanced interlinking analysis failed', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Extract broader topics from keywords
 * Groups related keywords into topic clusters
 */
function extractTopicsFromKeywords(keywords: string[]): string[] {
  if (keywords.length === 0) return [];
  
  // Simple extraction: use unique significant keywords as topics
  // In a more sophisticated version, this could use NLP/LLM for topic modeling
  const topics: string[] = [];
  const seen = new Set<string>();
  
  for (const keyword of keywords) {
    // Normalize keyword
    const normalized = keyword.toLowerCase().trim();
    
    // Skip very short keywords
    if (normalized.length < 4) continue;
    
    // Skip duplicates
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    
    // Add as a topic
    topics.push(normalized);
    
    // Limit to 5 topics
    if (topics.length >= 5) break;
  }
  
  return topics;
}

/**
 * Phase 2: Enrich top candidates with full content from Webflow API
 * Only fetches content for the most promising candidates
 */
async function enrichTopCandidates(
  opportunities: LinkOpportunity[],
  articleContent: string,
  articleTitle: string,
  articleKeywords: string[],
  apiToken: string,
  siteId: string,
  topN: number
): Promise<LinkOpportunity[]> {
  // Only enrich the top N candidates
  const candidatesToEnrich = opportunities.slice(0, topN);
  
  if (candidatesToEnrich.length === 0) {
    return opportunities;
  }
  
  logger.info('Phase 2: Enriching top candidates with full content', {
    candidatesCount: candidatesToEnrich.length,
    siteId,
  });
  
  try {
    // Fetch full content for each candidate
    const enrichedOpportunities: LinkOpportunity[] = [];
    
    for (const opp of candidatesToEnrich) {
      try {
        // Extract item ID and collection info from the opportunity
        const pageId = opp.targetPage.pageId;
        const collectionId = opp.targetPage.metadata?.collectionId;
        
        // Only fetch if we have a collection ID (CMS item)
        if (collectionId && opp.targetPage.metadata?.type === 'cms') {
          const fullContent = await fetchWebflowItemContent(apiToken, collectionId, pageId);
          
          if (fullContent) {
            // Update the opportunity with richer data
            opp.targetPage.content = fullContent.content || '';
            opp.targetPage.wordCount = fullContent.wordCount || opp.targetPage.wordCount;
            
            // Re-calculate relevance with full content
            const enhancedScore = calculateEnhancedRelevance(
              articleContent,
              articleTitle,
              articleKeywords,
              fullContent.content || '',
              opp.targetPage.title,
              opp.targetPage.keywords
            );
            
            // Update link value if enhanced score is better
            if (enhancedScore > opp.linkValue) {
              opp.relevanceScore = enhancedScore;
              opp.linkValue = enhancedScore * 0.6 + opp.authorityScore * 0.4;
              opp.reason = `${opp.reason}; Enhanced with full content analysis`;
            }
          }
        }
        
        enrichedOpportunities.push(opp);
      } catch (error: any) {
        logger.warn('Failed to enrich candidate, using original', {
          pageId: opp.targetPage.pageId,
          error: error.message,
        });
        enrichedOpportunities.push(opp);
      }
    }
    
    // Re-sort by updated link value
    enrichedOpportunities.sort((a, b) => b.linkValue - a.linkValue);
    
    // Combine with remaining opportunities (those not enriched)
    const remainingOpportunities = opportunities.slice(topN);
    
    logger.info('Phase 2: Enrichment complete', {
      enrichedCount: enrichedOpportunities.length,
      totalCount: enrichedOpportunities.length + remainingOpportunities.length,
    });
    
    return [...enrichedOpportunities, ...remainingOpportunities];
  } catch (error: any) {
    logger.error('Phase 2 enrichment failed, returning original opportunities', {
      error: error.message,
    });
    return opportunities;
  }
}

/**
 * Fetch full content for a Webflow CMS item
 */
async function fetchWebflowItemContent(
  apiToken: string,
  collectionId: string,
  itemId: string
): Promise<{ content: string; wordCount: number } | null> {
  try {
    const response = await fetch(
      `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}`,
      {
        headers: {
          'authorization': `Bearer ${apiToken}`,
          'accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      logger.debug('Failed to fetch Webflow item', {
        collectionId,
        itemId,
        status: response.status,
      });
      return null;
    }
    
    const item = await response.json();
    const fieldData = item.fieldData || {};
    
    // Extract content from common field names
    const content = 
      fieldData['post-body'] || 
      fieldData['content'] || 
      fieldData['body'] || 
      fieldData['article-body'] ||
      fieldData['post-content'] ||
      '';
    
    // Strip HTML and calculate word count
    const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = plainText.split(/\s+/).length;
    
    return {
      content: plainText.substring(0, 1000), // Limit to first 1000 chars
      wordCount,
    };
  } catch (error: any) {
    logger.debug('Error fetching Webflow item content', {
      collectionId,
      itemId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Calculate enhanced relevance score using full content
 */
function calculateEnhancedRelevance(
  articleContent: string,
  articleTitle: string,
  articleKeywords: string[],
  targetContent: string,
  targetTitle: string,
  targetKeywords: string[]
): number {
  let score = 0;
  
  // Keyword overlap (40% weight)
  const keywordOverlap = calculateOverlap(articleKeywords, targetKeywords);
  score += keywordOverlap * 0.4;
  
  // Title word overlap (20% weight)
  const articleTitleWords = articleTitle.toLowerCase().split(/\s+/);
  const targetTitleWords = targetTitle.toLowerCase().split(/\s+/);
  const titleOverlap = calculateOverlap(articleTitleWords, targetTitleWords);
  score += titleOverlap * 0.2;
  
  // Content similarity (40% weight) - now we have actual content!
  const articleWords = articleContent.toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 100);
  const targetWords = targetContent.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 100);
  const contentOverlap = calculateOverlap(articleWords, targetWords);
  score += contentOverlap * 0.4;
  
  return Math.min(1, score);
}

/**
 * Calculate Jaccard similarity between two arrays
 */
function calculateOverlap(arr1: string[], arr2: string[]): number {
  if (arr1.length === 0 || arr2.length === 0) return 0;
  
  const set1 = new Set(arr1.map(s => s.toLowerCase()));
  const set2 = new Set(arr2.map(s => s.toLowerCase()));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

export { InterlinkingEngine };

