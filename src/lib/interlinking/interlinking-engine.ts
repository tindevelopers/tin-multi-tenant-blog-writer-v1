/**
 * Interlinking Engine
 * Phase 4.3: Interlinking Engine - Relevance scoring and link opportunity detection
 * 
 * Analyzes content and generates interlinking suggestions
 */

import { logger } from '@/utils/logger';
import type { IndexedContent } from './content-indexer';

export interface LinkOpportunity {
  targetPage: IndexedContent;
  anchorText: string;
  placement: 'introduction' | 'body' | 'conclusion';
  relevanceScore: number;
  authorityScore: number;
  linkValue: number;
  context: string; // Surrounding text for the link
  reason: string; // Why this link is relevant
}

export interface InterlinkingAnalysis {
  opportunities: LinkOpportunity[];
  internalLinks: LinkOpportunity[];
  externalLinks: LinkOpportunity[];
  clusterLinks: LinkOpportunity[];
  totalOpportunities: number;
  recommendedLinks: number;
  maxLinks: number;
}

export interface InterlinkingRequest {
  content: string;
  title: string;
  keywords: string[];
  topics: string[];
  existingLinks?: Array<{ url: string; anchorText: string }>;
  maxInternalLinks?: number;
  maxExternalLinks?: number;
}

export class InterlinkingEngine {
  /**
   * Analyze content and generate interlinking opportunities
   */
  async analyzeInterlinking(
    request: InterlinkingRequest,
    indexedContent: IndexedContent[]
  ): Promise<InterlinkingAnalysis> {
    try {
      logger.debug('Analyzing interlinking opportunities', {
        title: request.title,
        keywordsCount: request.keywords.length,
        topicsCount: request.topics.length,
        indexedContentCount: indexedContent.length,
      });

      const maxInternal = request.maxInternalLinks || 5;
      const maxExternal = request.maxExternalLinks || 3;

      // Find internal link opportunities
      const internalOpportunities = this.findInternalLinks(
        request,
        indexedContent,
        maxInternal
      );

      // Find cluster link opportunities (pillar/supporting content)
      const clusterOpportunities = this.findClusterLinks(
        request,
        indexedContent,
        maxInternal
      );

      // Find external link opportunities (placeholder for future implementation)
      const externalOpportunities: LinkOpportunity[] = [];

      // Combine and deduplicate opportunities
      const allOpportunities = [
        ...internalOpportunities,
        ...clusterOpportunities,
        ...externalOpportunities,
      ];

      // Remove duplicates and sort by link value
      const uniqueOpportunities = this.deduplicateOpportunities(allOpportunities);
      const sortedOpportunities = uniqueOpportunities.sort(
        (a, b) => b.linkValue - a.linkValue
      );

      // Separate by type
      const internalLinks = sortedOpportunities.filter(
        opp => opp.targetPage.metadata.type === 'cms' || opp.targetPage.metadata.type === 'static'
      );
      const externalLinks = sortedOpportunities.filter(
        opp => opp.targetPage.metadata.type === 'external'
      );
      const clusterLinks = clusterOpportunities;

      // Calculate recommended links (top N by link value)
      const recommendedLinks = Math.min(
        maxInternal + maxExternal,
        sortedOpportunities.length
      );

      logger.info('Interlinking analysis completed', {
        totalOpportunities: sortedOpportunities.length,
        internalLinks: internalLinks.length,
        externalLinks: externalLinks.length,
        clusterLinks: clusterLinks.length,
        recommendedLinks,
      });

      return {
        opportunities: sortedOpportunities,
        internalLinks,
        externalLinks,
        clusterLinks,
        totalOpportunities: sortedOpportunities.length,
        recommendedLinks,
        maxLinks: maxInternal + maxExternal,
      };
    } catch (error: any) {
      logger.error('Error analyzing interlinking', { error: error.message });
      throw error;
    }
  }

  /**
   * Find internal link opportunities
   */
  private findInternalLinks(
    request: InterlinkingRequest,
    indexedContent: IndexedContent[],
    maxLinks: number
  ): LinkOpportunity[] {
    const opportunities: LinkOpportunity[] = [];

    // Score each indexed content for relevance
    for (const indexed of indexedContent) {
      // Skip if it's the same page (would need pageId comparison)
      // For now, skip if title matches exactly
      if (indexed.title.toLowerCase() === request.title.toLowerCase()) {
        continue;
      }

      // Calculate relevance score
      const relevanceScore = this.calculateRelevanceScore(request, indexed);
      
      // Only consider highly relevant content
      if (relevanceScore < 0.3) {
        continue;
      }

      // Calculate authority score
      const authorityScore = this.calculateAuthorityScore(indexed);

      // Calculate link value
      const linkValue = this.calculateLinkValue(relevanceScore, authorityScore);

      // Generate anchor text
      const anchorText = this.generateAnchorText(request, indexed);

      // Determine placement
      const placement = this.determinePlacement(request, indexed);

      // Generate context
      const context = this.generateContext(request, indexed);

      // Generate reason
      const reason = this.generateReason(request, indexed, relevanceScore);

      opportunities.push({
        targetPage: indexed,
        anchorText,
        placement,
        relevanceScore,
        authorityScore,
        linkValue,
        context,
        reason,
      });
    }

    // Sort by link value and take top N
    return opportunities
      .sort((a, b) => b.linkValue - a.linkValue)
      .slice(0, maxLinks);
  }

  /**
   * Find cluster link opportunities (pillar/supporting content)
   */
  private findClusterLinks(
    request: InterlinkingRequest,
    indexedContent: IndexedContent[],
    maxLinks: number
  ): LinkOpportunity[] {
    const opportunities: LinkOpportunity[] = [];

    // Find content in the same cluster (same topics/keywords)
    const clusterContent = indexedContent.filter(indexed => {
      // Check topic overlap
      const topicOverlap = request.topics.some(topic =>
        indexed.topics.some(it => it.toLowerCase() === topic.toLowerCase())
      );

      // Check keyword overlap
      const keywordOverlap = request.keywords.some(keyword =>
        indexed.keywords.some(ik => ik.toLowerCase() === keyword.toLowerCase())
      );

      return topicOverlap || keywordOverlap;
    });

    // Score and generate opportunities
    for (const indexed of clusterContent) {
      if (indexed.title.toLowerCase() === request.title.toLowerCase()) {
        continue;
      }

      const relevanceScore = this.calculateRelevanceScore(request, indexed);
      if (relevanceScore < 0.4) {
        continue;
      }

      const authorityScore = this.calculateAuthorityScore(indexed);
      const linkValue = this.calculateLinkValue(relevanceScore, authorityScore);

      opportunities.push({
        targetPage: indexed,
        anchorText: this.generateAnchorText(request, indexed),
        placement: this.determinePlacement(request, indexed),
        relevanceScore,
        authorityScore,
        linkValue,
        context: this.generateContext(request, indexed),
        reason: `Related content in the same topic cluster: ${indexed.topics.join(', ')}`,
      });
    }

    return opportunities
      .sort((a, b) => b.linkValue - a.linkValue)
      .slice(0, maxLinks);
  }

  /**
   * Calculate relevance score between request and indexed content
   */
  private calculateRelevanceScore(
    request: InterlinkingRequest,
    indexed: IndexedContent
  ): number {
    let score = 0;

    // Keyword overlap (40% weight)
    const keywordOverlap = this.calculateOverlap(request.keywords, indexed.keywords);
    score += keywordOverlap * 0.4;

    // Topic overlap (30% weight)
    const topicOverlap = this.calculateOverlap(request.topics, indexed.topics);
    score += topicOverlap * 0.3;

    // Title similarity (20% weight)
    const titleSimilarity = this.calculateStringSimilarity(request.title, indexed.title);
    score += titleSimilarity * 0.2;

    // Content similarity (10% weight) - simplified
    const contentSimilarity = this.calculateContentSimilarity(request.content, indexed.content);
    score += contentSimilarity * 0.1;

    return Math.min(1, score);
  }

  /**
   * Calculate overlap between two arrays
   */
  private calculateOverlap(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 || arr2.length === 0) return 0;

    const set1 = new Set(arr1.map(s => s.toLowerCase()));
    const set2 = new Set(arr2.map(s => s.toLowerCase()));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Calculate string similarity (simplified)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate content similarity (simplified - uses keyword overlap)
   */
  private calculateContentSimilarity(content1: string, content2: string): number {
    const words1 = content1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const words2 = content2.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    return this.calculateOverlap(words1.slice(0, 50), words2.slice(0, 50));
  }

  /**
   * Calculate authority score for indexed content
   */
  private calculateAuthorityScore(indexed: IndexedContent): number {
    let score = 0.5; // Base score

    // Word count (longer content = more authority)
    if (indexed.wordCount > 2000) score += 0.2;
    else if (indexed.wordCount > 1000) score += 0.1;

    // Published date (recent = more authority)
    if (indexed.metadata.publishedAt) {
      const publishedDate = new Date(indexed.metadata.publishedAt);
      const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePublished < 90) score += 0.1;
      else if (daysSincePublished < 365) score += 0.05;
    }

    // Collection type (CMS = more authority than static)
    if (indexed.metadata.type === 'cms') score += 0.1;

    return Math.min(1, score);
  }

  /**
   * Calculate link value (combination of relevance and authority)
   */
  private calculateLinkValue(relevanceScore: number, authorityScore: number): number {
    // Weighted combination: 60% relevance, 40% authority
    return relevanceScore * 0.6 + authorityScore * 0.4;
  }

  /**
   * Generate anchor text for link
   */
  private generateAnchorText(
    request: InterlinkingRequest,
    indexed: IndexedContent
  ): string {
    // Use title as anchor text (can be enhanced with keyword matching)
    return indexed.title;
  }

  /**
   * Determine optimal placement for link
   */
  private determinePlacement(
    request: InterlinkingRequest,
    indexed: IndexedContent
  ): 'introduction' | 'body' | 'conclusion' {
    // Simple heuristic: high relevance = introduction, medium = body, low = conclusion
    const relevanceScore = this.calculateRelevanceScore(request, indexed);
    
    if (relevanceScore > 0.7) return 'introduction';
    if (relevanceScore > 0.4) return 'body';
    return 'conclusion';
  }

  /**
   * Generate context for link placement
   */
  private generateContext(
    request: InterlinkingRequest,
    indexed: IndexedContent
  ): string {
    // Generate a sentence that naturally introduces the link
    const topic = indexed.topics[0] || indexed.keywords[0] || 'this topic';
    return `For more information about ${topic}, see ${indexed.title}.`;
  }

  /**
   * Generate reason for link recommendation
   */
  private generateReason(
    request: InterlinkingRequest,
    indexed: IndexedContent,
    relevanceScore: number
  ): string {
    const reasons: string[] = [];

    if (relevanceScore > 0.7) {
      reasons.push('Highly relevant content');
    }

    const topicOverlap = this.calculateOverlap(request.topics, indexed.topics);
    if (topicOverlap > 0.5) {
      reasons.push(`Shares topics: ${indexed.topics.slice(0, 2).join(', ')}`);
    }

    const keywordOverlap = this.calculateOverlap(request.keywords, indexed.keywords);
    if (keywordOverlap > 0.3) {
      reasons.push(`Shares keywords: ${indexed.keywords.slice(0, 2).join(', ')}`);
    }

    if (indexed.wordCount > 2000) {
      reasons.push('Comprehensive content');
    }

    return reasons.length > 0 ? reasons.join('; ') : 'Related content';
  }

  /**
   * Deduplicate link opportunities
   */
  private deduplicateOpportunities(
    opportunities: LinkOpportunity[]
  ): LinkOpportunity[] {
    const seen = new Set<string>();
    const unique: LinkOpportunity[] = [];

    for (const opp of opportunities) {
      const key = opp.targetPage.pageId;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(opp);
      }
    }

    return unique;
  }
}

