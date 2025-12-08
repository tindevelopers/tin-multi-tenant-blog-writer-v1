/**
 * Content Cluster Analyzer
 * Phase 4.4: Content Cluster Analyzer - Cluster identification and authority mapping
 * 
 * Analyzes content to identify clusters and optimize authority flow
 */

import { logger } from '@/utils/logger';
import type { IndexedContent } from './content-indexer';

export interface ContentCluster {
  id: string;
  name: string;
  pillarContent: IndexedContent | null;
  supportingContent: IndexedContent[];
  longTailContent: IndexedContent[];
  topics: string[];
  keywords: string[];
  authorityScore: number;
  totalContent: number;
  internalLinks: number;
  contentGaps: string[];
}

export interface ClusterAnalysis {
  clusters: ContentCluster[];
  totalClusters: number;
  pillarContentCount: number;
  supportingContentCount: number;
  longTailContentCount: number;
  averageAuthorityScore: number;
  recommendations: string[];
}

export class ClusterAnalyzerService {
  /**
   * Analyze content to identify clusters
   */
  async analyzeClusters(indexedContent: IndexedContent[]): Promise<ClusterAnalysis> {
    try {
      logger.debug('Analyzing content clusters', { contentCount: indexedContent.length });

      // Group content by topics
      const topicGroups = this.groupByTopics(indexedContent);

      // Identify clusters
      const clusters: ContentCluster[] = [];

      for (const [topic, content] of topicGroups.entries()) {
        const cluster = this.buildCluster(topic, content);
        if (cluster) {
          clusters.push(cluster);
        }
      }

      // Calculate statistics
      const pillarContentCount = clusters.filter(c => c.pillarContent !== null).length;
      const supportingContentCount = clusters.reduce((sum, c) => sum + c.supportingContent.length, 0);
      const longTailContentCount = clusters.reduce((sum, c) => sum + c.longTailContent.length, 0);
      const averageAuthorityScore =
        clusters.reduce((sum, c) => sum + c.authorityScore, 0) / clusters.length || 0;

      // Generate recommendations
      const recommendations = this.generateRecommendations(clusters);

      logger.info('Cluster analysis completed', {
        totalClusters: clusters.length,
        pillarContent: pillarContentCount,
        supportingContent: supportingContentCount,
        longTailContent: longTailContentCount,
      });

      return {
        clusters,
        totalClusters: clusters.length,
        pillarContentCount,
        supportingContentCount,
        longTailContentCount,
        averageAuthorityScore,
        recommendations,
      };
    } catch (error: any) {
      logger.error('Error analyzing clusters', { error: error.message });
      throw error;
    }
  }

  /**
   * Group content by topics
   */
  private groupByTopics(
    indexedContent: IndexedContent[]
  ): Map<string, IndexedContent[]> {
    const groups = new Map<string, IndexedContent[]>();

    for (const content of indexedContent) {
      for (const topic of content.topics) {
        const normalizedTopic = topic.toLowerCase();
        if (!groups.has(normalizedTopic)) {
          groups.set(normalizedTopic, []);
        }
        groups.get(normalizedTopic)!.push(content);
      }
    }

    return groups;
  }

  /**
   * Build a cluster from topic group
   */
  private buildCluster(topic: string, content: IndexedContent[]): ContentCluster | null {
    if (content.length === 0) return null;

    // Identify pillar content (longest, most comprehensive)
    const pillarContent = this.identifyPillarContent(content);

    // Identify supporting content (medium length, related topics)
    const supportingContent = this.identifySupportingContent(content, pillarContent);

    // Identify long-tail content (shorter, specific topics)
    const longTailContent = this.identifyLongTailContent(content, pillarContent, supportingContent);

    // Extract cluster topics and keywords
    const topics = this.extractClusterTopics(content);
    const keywords = this.extractClusterKeywords(content);

    // Calculate authority score
    const authorityScore = this.calculateClusterAuthority(
      pillarContent,
      supportingContent,
      longTailContent
    );

    // Identify content gaps
    const contentGaps = this.identifyContentGaps(topics, keywords, content);

    return {
      id: `cluster_${topic.replace(/\s+/g, '_')}`,
      name: topic,
      pillarContent,
      supportingContent,
      longTailContent,
      topics,
      keywords,
      authorityScore,
      totalContent: content.length,
      internalLinks: 0, // Will be calculated when interlinking is applied
      contentGaps,
    };
  }

  /**
   * Identify pillar content (comprehensive, authoritative)
   */
  private identifyPillarContent(content: IndexedContent[]): IndexedContent | null {
    if (content.length === 0) return null;

    // Sort by word count and authority indicators
    const sorted = [...content].sort((a, b) => {
      // Prioritize longer content
      if (b.wordCount !== a.wordCount) {
        return b.wordCount - a.wordCount;
      }
      // Then by number of topics (more comprehensive)
      return b.topics.length - a.topics.length;
    });

    // Return the most comprehensive piece (top 20% by word count)
    const threshold = Math.max(2000, sorted[0].wordCount * 0.8);
    return sorted.find(c => c.wordCount >= threshold) || sorted[0];
  }

  /**
   * Identify supporting content
   */
  private identifySupportingContent(
    content: IndexedContent[],
    pillarContent: IndexedContent | null
  ): IndexedContent[] {
    const pillarId = pillarContent?.pageId;

    return content.filter(c => {
      // Exclude pillar content
      if (c.pageId === pillarId) return false;

      // Medium length (500-2000 words)
      if (c.wordCount < 500 || c.wordCount > 2000) return false;

      // Has related topics/keywords
      if (pillarContent) {
        const topicOverlap = this.calculateOverlap(c.topics, pillarContent.topics);
        const keywordOverlap = this.calculateOverlap(c.keywords, pillarContent.keywords);
        return topicOverlap > 0.3 || keywordOverlap > 0.3;
      }

      return true;
    });
  }

  /**
   * Identify long-tail content
   */
  private identifyLongTailContent(
    content: IndexedContent[],
    pillarContent: IndexedContent | null,
    supportingContent: IndexedContent[]
  ): IndexedContent[] {
    const pillarId = pillarContent?.pageId;
    const supportingIds = new Set(supportingContent.map(c => c.pageId));

    return content.filter(c => {
      // Exclude pillar and supporting content
      if (c.pageId === pillarId || supportingIds.has(c.pageId)) return false;

      // Shorter content (< 1000 words) or very specific topics
      return c.wordCount < 1000 || c.topics.length === 1;
    });
  }

  /**
   * Extract cluster topics
   */
  private extractClusterTopics(content: IndexedContent[]): string[] {
    const topicCounts = new Map<string, number>();

    for (const c of content) {
      for (const topic of c.topics) {
        const normalized = topic.toLowerCase();
        topicCounts.set(normalized, (topicCounts.get(normalized) || 0) + 1);
      }
    }

    // Return top topics
    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  /**
   * Extract cluster keywords
   */
  private extractClusterKeywords(content: IndexedContent[]): string[] {
    const keywordCounts = new Map<string, number>();

    for (const c of content) {
      for (const keyword of c.keywords) {
        const normalized = keyword.toLowerCase();
        keywordCounts.set(normalized, (keywordCounts.get(normalized) || 0) + 1);
      }
    }

    // Return top keywords
    return Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword]) => keyword);
  }

  /**
   * Calculate cluster authority score
   */
  private calculateClusterAuthority(
    pillarContent: IndexedContent | null,
    supportingContent: IndexedContent[],
    longTailContent: IndexedContent[]
  ): number {
    let score = 0;

    // Pillar content (50% weight)
    if (pillarContent) {
      score += 0.5;
      if (pillarContent.wordCount > 3000) score += 0.1;
      if (pillarContent.topics.length > 3) score += 0.1;
    }

    // Supporting content (30% weight)
    const supportingScore = Math.min(0.3, supportingContent.length * 0.05);
    score += supportingScore;

    // Long-tail content (20% weight)
    const longTailScore = Math.min(0.2, longTailContent.length * 0.02);
    score += longTailScore;

    return Math.min(1, score);
  }

  /**
   * Identify content gaps
   */
  private identifyContentGaps(
    topics: string[],
    keywords: string[],
    content: IndexedContent[]
  ): string[] {
    const gaps: string[] = [];

    // Check for missing pillar content
    if (content.length > 0 && content.every(c => c.wordCount < 2000)) {
      gaps.push('Missing comprehensive pillar content');
    }

    // Check for topic coverage
    const coveredTopics = new Set<string>();
    for (const c of content) {
      c.topics.forEach(t => coveredTopics.add(t.toLowerCase()));
    }

    const missingTopics = topics.filter(t => !coveredTopics.has(t.toLowerCase()));
    if (missingTopics.length > 0) {
      gaps.push(`Missing content for topics: ${missingTopics.join(', ')}`);
    }

    return gaps;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(clusters: ContentCluster[]): string[] {
    const recommendations: string[] = [];

    // Check for clusters without pillar content
    const clustersWithoutPillar = clusters.filter(c => c.pillarContent === null);
    if (clustersWithoutPillar.length > 0) {
      recommendations.push(
        `Create pillar content for ${clustersWithoutPillar.length} cluster(s): ${clustersWithoutPillar.map(c => c.name).join(', ')}`
      );
    }

    // Check for clusters with content gaps
    const clustersWithGaps = clusters.filter(c => c.contentGaps.length > 0);
    if (clustersWithGaps.length > 0) {
      recommendations.push(
        `Fill content gaps in ${clustersWithGaps.length} cluster(s) to improve authority`
      );
    }

    // Check for clusters with low authority
    const lowAuthorityClusters = clusters.filter(c => c.authorityScore < 0.5);
    if (lowAuthorityClusters.length > 0) {
      recommendations.push(
        `Improve authority for ${lowAuthorityClusters.length} cluster(s) by adding more supporting content`
      );
    }

    return recommendations;
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

    return intersection.size / union.size;
  }
}

