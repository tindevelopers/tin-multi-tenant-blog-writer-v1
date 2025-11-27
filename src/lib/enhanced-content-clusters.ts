/**
 * Enhanced Content Clusters Service
 * Connects keyword research results to content clusters and provides better article suggestions
 * 
 * This service handles:
 * - Converting keyword research results into content clusters
 * - Generating human-readable article suggestions
 * - Optimizing keyword usage beyond 15 keyword limit
 * - Creating Airtable-like content planning interface
 */

import { createClient } from '@/lib/supabase/client';
import type { BlogResearchResults, KeywordCluster, TitleSuggestion } from '@/lib/keyword-research';
import type { ContentOutline } from '@/lib/content-ideas';
import { logger } from '@/utils/logger';

// =====================================================
// Enhanced Types and Interfaces
// =====================================================

export interface EnhancedContentCluster {
  id?: string;
  cluster_name: string;
  pillar_keyword: string;
  cluster_description?: string;
  cluster_status: 'planning' | 'in_progress' | 'completed' | 'archived';
  authority_score: number;
  total_keywords: number;
  content_count: number;
  pillar_content_count: number;
  supporting_content_count: number;
  long_tail_content_count: number;
  created_at?: string;
  updated_at?: string;
  // Enhanced fields
  research_data: BlogResearchResults;
  keyword_clusters: KeywordCluster[];
  estimated_traffic_potential: 'low' | 'medium' | 'high';
  content_gap_score: number;
  competition_level: 'low' | 'medium' | 'high';
  target_audience?: string;
  content_strategy?: string;
}

export interface HumanReadableArticle {
  id?: string;
  cluster_id?: string;
  content_type: 'pillar' | 'supporting' | 'long_tail' | 'news' | 'tutorial' | 'review' | 'comparison';
  target_keyword: string;
  title: string;
  subtitle?: string;
  meta_description: string;
  url_slug: string;
  status: 'idea' | 'planned' | 'in_progress' | 'draft' | 'review' | 'published' | 'archived';
  priority: number;
  estimated_word_count: number;
  estimated_reading_time: number;
  target_audience: string;
  tone: string;
  content_outline: ArticleOutline;
  seo_insights: SEOInsights;
  content_gaps: ContentGap[];
  internal_linking_opportunities: InternalLink[];
  external_resources: ExternalResource[];
  estimated_traffic: number;
  difficulty_score: number;
  freshness_score: number;
  created_at?: string;
  updated_at?: string;
}

export interface ArticleOutline {
  introduction: {
    hook: string;
    problem_statement: string;
    value_proposition: string;
    preview: string[];
  };
  sections: ArticleSection[];
  conclusion: {
    summary: string;
    key_takeaways: string[];
    call_to_action: string;
  };
  faq_section?: FAQItem[];
}

export interface ArticleSection {
  heading: string;
  level: 'h2' | 'h3' | 'h4';
  description: string;
  key_points: string[];
  keywords: string[];
  estimated_word_count: number;
  subsections?: ArticleSection[];
  callout_boxes?: CalloutBox[];
}

export interface CalloutBox {
  type: 'tip' | 'warning' | 'example' | 'quote' | 'statistic';
  title: string;
  content: string;
  icon?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  keywords: string[];
}

export interface SEOInsights {
  primary_keyword: string;
  secondary_keywords: string[];
  semantic_keywords: string[];
  keyword_difficulty: number;
  search_volume: number;
  competition_level: 'low' | 'medium' | 'high';
  title_optimization_score: number;
  meta_description_score: number;
  readability_score: number;
  featured_snippet_opportunity: boolean;
  related_searches: string[];
  people_also_ask: string[];
}

export interface ContentGap {
  competitor_url: string;
  competitor_title: string;
  gap_description: string;
  opportunity_score: number;
  suggested_approach: string;
}

export interface InternalLink {
  target_content_id?: string;
  anchor_text: string;
  target_url?: string;
  context: string;
  link_value: 'high' | 'medium' | 'low';
  suggested_position: 'introduction' | 'body' | 'conclusion';
}

export interface ExternalResource {
  url: string;
  title: string;
  type: 'study' | 'tool' | 'guide' | 'news' | 'statistic';
  credibility_score: number;
  relevance_score: number;
  suggested_context: string;
}

export interface ClusterGenerationRequest {
  research_results: BlogResearchResults;
  target_audience?: string;
  industry?: string;
  content_strategy?: string;
  max_keywords_per_cluster?: number;
}

export interface ClusterGenerationResponse {
  clusters: EnhancedContentCluster[];
  total_articles_generated: number;
  content_strategy_summary: string;
  traffic_estimates: {
    low: number;
    medium: number;
    high: number;
  };
  recommendations: string[];
}

// =====================================================
// Enhanced Content Clusters Service
// =====================================================

export class EnhancedContentClustersService {
  /**
   * Generate enhanced content clusters from keyword research results
   */
  async generateClustersFromResearch(
    request: ClusterGenerationRequest
  ): Promise<ClusterGenerationResponse> {
    const { research_results, target_audience, industry, content_strategy, max_keywords_per_cluster = 25 } = request;

    logger.debug('🔄 Generating enhanced clusters from research results...');
    
    // Extract keyword clusters from research
    const keywordClusters = research_results.keyword_analysis.cluster_groups;
    
    // Generate enhanced clusters
    const clusters: EnhancedContentCluster[] = keywordClusters.map((cluster, index) => {
      // Select top keywords for this cluster (optimize beyond 15 limit)
      const topKeywords = this.selectTopKeywords(
        cluster.keywords, 
        max_keywords_per_cluster,
        research_results.keyword_analysis.keyword_analysis
      );

      return {
        cluster_name: this.generateEnhancedClusterName(cluster.name, industry),
        pillar_keyword: cluster.primary_keyword,
        cluster_description: this.generateClusterDescription(cluster, industry, target_audience),
        cluster_status: 'planning',
        authority_score: this.calculateAuthorityScore(cluster, research_results),
        total_keywords: topKeywords.length,
        content_count: 0,
        pillar_content_count: 0,
        supporting_content_count: 0,
        long_tail_content_count: 0,
        research_data: research_results,
        keyword_clusters: [cluster],
        estimated_traffic_potential: this.estimateTrafficPotential(cluster),
        content_gap_score: this.calculateContentGapScore(cluster, research_results),
        competition_level: this.assessCompetitionLevel(cluster),
        target_audience,
        content_strategy: content_strategy || this.generateContentStrategy(cluster, target_audience),
      };
    });

    // Generate articles for each cluster
    let totalArticles = 0;
    const clustersWithArticles = await Promise.all(
      clusters.map(async (cluster) => {
        const articles = await this.generateHumanReadableArticles(
          cluster, 
          research_results, 
          target_audience
        );
        totalArticles += articles.length;
        
        return {
          ...cluster,
          content_count: articles.length,
          pillar_content_count: articles.filter(a => a.content_type === 'pillar').length,
          supporting_content_count: articles.filter(a => a.content_type === 'supporting').length,
          long_tail_content_count: articles.filter(a => a.content_type === 'long_tail').length,
        };
      })
    );

    // Calculate traffic estimates
    const trafficEstimates = this.calculateTrafficEstimates(clustersWithArticles);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(clustersWithArticles, research_results);

    const response: ClusterGenerationResponse = {
      clusters: clustersWithArticles,
      total_articles_generated: totalArticles,
      content_strategy_summary: this.generateStrategySummary(clustersWithArticles),
      traffic_estimates: trafficEstimates,
      recommendations,
    };

    logger.debug('✅ Generated enhanced clusters:', {
      clusters: response.clusters.length,
      articles: response.total_articles_generated,
      traffic_estimate: response.traffic_estimates,
    });

    return response;
  }

  /**
   * Select top keywords optimizing beyond 15 limit
   */
  private selectTopKeywords(
    keywords: string[], 
    maxKeywords: number,
    keywordAnalysis: Record<string, any>
  ): string[] {
    // Score keywords based on multiple factors
    const scoredKeywords = keywords.map(keyword => {
      const analysis = keywordAnalysis[keyword];
      if (!analysis) return { keyword, score: 0 };

      // Enhanced multi-factor scoring algorithm
      const searchVolume = analysis.search_volume || 0;
      const difficulty = this.convertDifficultyToScore(analysis.difficulty);
      const trendScore = analysis.trend_score || 0;
      const recommendation = analysis.recommended ? 10 : 0;
      const competition = analysis.competition || 0;
      const cpc = analysis.cpc || 0;
      
      // Enhanced weighted score with competition and CPC factors
      const score = (
        (searchVolume * 0.25) +
        (difficulty * 0.15) +
        (trendScore * 0.20) +
        (recommendation * 0.25) +
        ((1 - competition) * 0.10) + // Lower competition = higher score
        (cpc * 0.05) // Higher CPC indicates commercial value
      );

      return { keyword, score };
    });

    // Sort by score and take top keywords
    return scoredKeywords
      .sort((a, b) => b.score - a.score)
      .slice(0, maxKeywords)
      .map(item => item.keyword);
  }

  /**
   * Generate human-readable articles with enhanced structure
   */
  private async generateHumanReadableArticles(
    cluster: EnhancedContentCluster,
    researchResults: BlogResearchResults,
    targetAudience?: string
  ): Promise<HumanReadableArticle[]> {
    const articles: HumanReadableArticle[] = [];

    // Enhanced content generation with better distribution
    const keywordCluster = cluster.keyword_clusters[0];
    if (!keywordCluster) {
      logger.warn('No keyword cluster found');
      return articles;
    }

    const pillarKeywords = this.selectPillarKeywords(keywordCluster);
    for (const keyword of pillarKeywords.slice(0, 3)) { // Increased from 2 to 3
      articles.push(await this.generatePillarArticle(keyword, cluster, researchResults, targetAudience));
    }

    // Generate supporting content (4-6 articles per cluster)
    const supportingKeywords = this.selectSupportingKeywords(keywordCluster);
    for (const keyword of supportingKeywords.slice(0, 6)) { // Increased from 5 to 6
      articles.push(await this.generateSupportingArticle(keyword, cluster, researchResults, targetAudience));
    }

    // Generate long-tail content (6-10 articles per cluster)
    const longTailKeywords = this.selectLongTailKeywords(keywordCluster);
    for (const keyword of longTailKeywords.slice(0, 10)) { // Increased from 8 to 10
      articles.push(await this.generateLongTailArticle(keyword, cluster, researchResults, targetAudience));
    }

    // Generate tutorial content (2-3 articles per cluster)
    const tutorialKeywords = this.selectTutorialKeywords(keywordCluster.keywords);
    for (const keyword of tutorialKeywords.slice(0, 3)) { // New content type
      articles.push(await this.generateTutorialArticle(keyword, cluster, researchResults, targetAudience));
    }

    return articles;
  }

  /**
   * Generate pillar article with comprehensive structure
   */
  private async generatePillarArticle(
    keyword: string,
    cluster: EnhancedContentCluster,
    researchResults: BlogResearchResults,
    targetAudience?: string
  ): Promise<HumanReadableArticle> {
    const analysis = researchResults.keyword_analysis.keyword_analysis[keyword];
    
    return {
      content_type: 'pillar',
      target_keyword: keyword,
      title: this.generatePillarTitle(keyword, targetAudience),
      subtitle: this.generateSubtitle(keyword, 'pillar'),
      meta_description: this.generateMetaDescription(keyword, 'pillar', targetAudience),
      url_slug: this.generateUrlSlug(keyword),
      status: 'idea',
      priority: 10,
      estimated_word_count: 3000,
      estimated_reading_time: 12,
      target_audience: targetAudience || 'general',
      tone: 'authoritative',
      content_outline: this.generatePillarOutline(keyword, targetAudience),
      seo_insights: this.generateSEOInsights(keyword, analysis, 'pillar'),
      content_gaps: await this.analyzeContentGaps(keyword),
      internal_linking_opportunities: this.generateInternalLinks(keyword, cluster),
      external_resources: await this.findExternalResources(keyword),
      estimated_traffic: analysis?.search_volume || 1000,
      difficulty_score: this.convertDifficultyToScore(analysis?.difficulty || 'medium'),
      freshness_score: 8,
    };
  }

  /**
   * Generate supporting article
   */
  private async generateSupportingArticle(
    keyword: string,
    cluster: EnhancedContentCluster,
    researchResults: BlogResearchResults,
    targetAudience?: string
  ): Promise<HumanReadableArticle> {
    const analysis = researchResults.keyword_analysis.keyword_analysis[keyword];
    
    return {
      content_type: 'supporting',
      target_keyword: keyword,
      title: this.generateSupportingTitle(keyword, targetAudience),
      subtitle: this.generateSubtitle(keyword, 'supporting'),
      meta_description: this.generateMetaDescription(keyword, 'supporting', targetAudience),
      url_slug: this.generateUrlSlug(keyword),
      status: 'idea',
      priority: 7,
      estimated_word_count: 1500,
      estimated_reading_time: 6,
      target_audience: targetAudience || 'general',
      tone: 'informative',
      content_outline: this.generateSupportingOutline(keyword, targetAudience),
      seo_insights: this.generateSEOInsights(keyword, analysis, 'supporting'),
      content_gaps: await this.analyzeContentGaps(keyword),
      internal_linking_opportunities: this.generateInternalLinks(keyword, cluster),
      external_resources: await this.findExternalResources(keyword),
      estimated_traffic: analysis?.search_volume || 500,
      difficulty_score: this.convertDifficultyToScore(analysis?.difficulty || 'medium'),
      freshness_score: 6,
    };
  }

  /**
   * Generate long-tail article
   */
  private async generateLongTailArticle(
    keyword: string,
    cluster: EnhancedContentCluster,
    researchResults: BlogResearchResults,
    targetAudience?: string
  ): Promise<HumanReadableArticle> {
    const analysis = researchResults.keyword_analysis.keyword_analysis[keyword];
    
    return {
      content_type: 'long_tail',
      target_keyword: keyword,
      title: this.generateLongTailTitle(keyword),
      subtitle: this.generateSubtitle(keyword, 'long_tail'),
      meta_description: this.generateMetaDescription(keyword, 'long_tail', targetAudience),
      url_slug: this.generateUrlSlug(keyword),
      status: 'idea',
      priority: 5,
      estimated_word_count: 1000,
      estimated_reading_time: 4,
      target_audience: targetAudience || 'general',
      tone: 'conversational',
      content_outline: this.generateLongTailOutline(keyword),
      seo_insights: this.generateSEOInsights(keyword, analysis, 'long_tail'),
      content_gaps: await this.analyzeContentGaps(keyword),
      internal_linking_opportunities: this.generateInternalLinks(keyword, cluster),
      external_resources: await this.findExternalResources(keyword),
      estimated_traffic: analysis?.search_volume || 200,
      difficulty_score: this.convertDifficultyToScore(analysis?.difficulty || 'easy'),
      freshness_score: 7,
    };
  }

  /**
   * Generate comprehensive pillar outline
   */
  private generatePillarOutline(keyword: string, targetAudience?: string): ArticleOutline {
    const audienceContext = targetAudience ? ` for ${targetAudience}` : '';
    
    return {
      introduction: {
        hook: `Why is ${keyword}${audienceContext} becoming increasingly important?`,
        problem_statement: `Many people struggle with ${keyword} because they lack comprehensive understanding.`,
        value_proposition: `This complete guide will give you everything you need to master ${keyword}.`,
        preview: [
          `What ${keyword} is and why it matters`,
          `Step-by-step implementation guide`,
          `Common mistakes to avoid`,
          `Advanced strategies and best practices`,
          `Real-world examples and case studies`
        ]
      },
      sections: [
        {
          heading: `What is ${keyword}?`,
          level: 'h2',
          description: `Define ${keyword} and provide comprehensive context`,
          key_points: [
            `Clear definition of ${keyword}`,
            `Key components and characteristics`,
            `Historical context and evolution`,
            `Current market trends`
          ],
          keywords: [keyword, 'definition', 'overview', 'basics'],
          estimated_word_count: 400,
          callout_boxes: [{
            type: 'tip',
            title: 'Quick Definition',
            content: `${keyword} is...`,
            icon: '💡'
          }]
        },
        {
          heading: `Why ${keyword} Matters${audienceContext}`,
          level: 'h2',
          description: `Explain the importance, benefits, and impact`,
          key_points: [
            `Key benefits and advantages`,
            `Industry impact and trends`,
            `ROI and business value`,
            `Future outlook and predictions`
          ],
          keywords: [keyword, 'benefits', 'importance', 'value'],
          estimated_word_count: 500,
          subsections: [
            {
              heading: 'Business Benefits',
              level: 'h3',
              description: 'How businesses benefit from implementing this',
              key_points: ['Cost savings', 'Efficiency gains', 'Competitive advantage'],
              keywords: ['business benefits', 'ROI', 'efficiency'],
              estimated_word_count: 200
            }
          ]
        },
        {
          heading: `How to Implement ${keyword}`,
          level: 'h2',
          description: `Step-by-step implementation guide`,
          key_points: [
            `Pre-implementation planning`,
            `Step-by-step process`,
            `Tools and resources needed`,
            `Timeline and milestones`
          ],
          keywords: [keyword, 'implementation', 'how to', 'guide'],
          estimated_word_count: 800,
          callout_boxes: [{
            type: 'warning',
            title: 'Common Pitfall',
            content: 'Avoid this common mistake when implementing...',
            icon: '⚠️'
          }]
        },
        {
          heading: `Advanced ${keyword} Strategies`,
          level: 'h2',
          description: `Expert-level strategies and techniques`,
          key_points: [
            `Advanced techniques and methods`,
            `Industry-specific approaches`,
            `Scaling and optimization`,
            `Innovation and future trends`
          ],
          keywords: [keyword, 'advanced', 'strategies', 'expert'],
          estimated_word_count: 600
        },
        {
          heading: `${keyword} Best Practices`,
          level: 'h2',
          description: `Industry best practices and recommendations`,
          key_points: [
            `Do's and don'ts`,
            `Industry standards`,
            `Quality benchmarks`,
            `Continuous improvement`
          ],
          keywords: [keyword, 'best practices', 'recommendations', 'standards'],
          estimated_word_count: 500
        },
        {
          heading: `Common ${keyword} Mistakes to Avoid`,
          level: 'h2',
          description: `Pitfalls and how to avoid them`,
          key_points: [
            `Most common mistakes`,
            `Why these mistakes happen`,
            `How to prevent them`,
            `Recovery strategies`
          ],
          keywords: [keyword, 'mistakes', 'avoid', 'pitfalls'],
          estimated_word_count: 400
        }
      ],
      conclusion: {
        summary: `${keyword} is a critical component that requires careful planning and execution.`,
        key_takeaways: [
          `Understand the fundamentals before implementation`,
          `Follow the step-by-step process`,
          `Avoid common mistakes`,
          `Continuously optimize and improve`
        ],
        call_to_action: `Ready to implement ${keyword}? Start with our comprehensive guide and take the first step today.`
      },
      faq_section: [
        {
          question: `What is the best way to get started with ${keyword}?`,
          answer: `Start by understanding the fundamentals and creating a detailed implementation plan.`,
          keywords: ['getting started', 'beginner', 'basics']
        },
        {
          question: `How long does it take to see results with ${keyword}?`,
          answer: `Results typically appear within 3-6 months with proper implementation.`,
          keywords: ['timeline', 'results', 'expectations']
        },
        {
          question: `What are the biggest challenges with ${keyword}?`,
          answer: `Common challenges include lack of planning, insufficient resources, and poor execution.`,
          keywords: ['challenges', 'difficulties', 'problems']
        }
      ]
    };
  }

  // Helper methods for title generation, SEO insights, etc.
  private generatePillarTitle(keyword: string, targetAudience?: string): string {
    const templates = [
      `The Complete Guide to ${keyword}${targetAudience ? ` for ${targetAudience}` : ''}`,
      `Everything You Need to Know About ${keyword}${targetAudience ? ` (${targetAudience} Edition)` : ''}`,
      `${keyword}: The Ultimate Guide${targetAudience ? ` for ${targetAudience}` : ''}`,
      `Master ${keyword}${targetAudience ? `: A ${targetAudience} Guide` : ': A Comprehensive Guide'}`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateSupportingTitle(keyword: string, targetAudience?: string): string {
    const templates = [
      `How to ${keyword}${targetAudience ? ` for ${targetAudience}` : ''}`,
      `${keyword}: A Practical Guide`,
      `Understanding ${keyword}${targetAudience ? ` (${targetAudience})` : ''}`,
      `${keyword} Explained: Tips and Best Practices`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateLongTailTitle(keyword: string): string {
    return keyword
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private generateTutorialTitle(keyword: string, targetAudience?: string): string {
    const templates = [
      `Step-by-Step Tutorial: ${keyword}${targetAudience ? ` for ${targetAudience}` : ''}`,
      `How to ${keyword}: A Beginner's Guide${targetAudience ? ` (${targetAudience})` : ''}`,
      `${keyword} Tutorial: From Beginner to Expert${targetAudience ? ` (${targetAudience} Edition)` : ''}`,
      `Learn ${keyword}${targetAudience ? ` for ${targetAudience}` : ''}: Complete Tutorial`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateSubtitle(keyword: string, type: string): string {
    const subtitles = {
      pillar: `A comprehensive guide covering everything you need to know`,
      supporting: `Practical tips and actionable strategies`,
      long_tail: `Quick answers and practical insights`,
      tutorial: `Step-by-step instructions and practical examples`
    };
    return (subtitles as any)[type] || 'Expert insights and practical guidance';
  }

  private generateMetaDescription(keyword: string, type: string, targetAudience?: string): string {
    const audiencePart = targetAudience ? ` for ${targetAudience}` : '';
    const descriptions = {
      pillar: `Discover everything you need to know about ${keyword}${audiencePart}. This comprehensive guide covers best practices, strategies, and expert tips.`,
      supporting: `Learn ${keyword}${audiencePart} with this practical guide. Get actionable tips, step-by-step instructions, and expert insights.`,
      long_tail: `Find out ${keyword}${audiencePart}. Quick answers, practical tips, and expert recommendations to help you succeed.`,
      tutorial: `Master ${keyword}${audiencePart} with this step-by-step tutorial. Learn from basics to advanced techniques with practical examples.`,
    };
    
    const description = (descriptions as any)[type];
    return description.length > 160 ? description.substring(0, 157) + '...' : description;
  }

  private generateUrlSlug(keyword: string): string {
    return keyword
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private generateSEOInsights(keyword: string, analysis: any, type: string): SEOInsights {
    return {
      primary_keyword: keyword,
      secondary_keywords: analysis?.related_keywords || [],
      semantic_keywords: this.generateSemanticKeywords(keyword),
      keyword_difficulty: this.convertDifficultyToScore(analysis?.difficulty || 'medium'),
      search_volume: analysis?.search_volume || 0,
      competition_level: this.assessCompetitionLevelFromDifficulty(analysis?.difficulty),
      title_optimization_score: this.calculateTitleScore(keyword, type),
      meta_description_score: this.calculateMetaScore(keyword, type),
      readability_score: this.calculateReadabilityScore(type),
      featured_snippet_opportunity: type === 'long_tail',
      related_searches: analysis?.related_keywords?.slice(0, 5) || [],
      people_also_ask: this.generatePeopleAlsoAsk(keyword),
    };
  }

  // Additional helper methods...
  private convertDifficultyToScore(difficulty: string): number {
    const scores = { easy: 3, medium: 6, hard: 9 };
    return (scores as any)[difficulty] || 6;
  }

  private selectPillarKeywords(cluster: KeywordCluster): string[] {
    return [cluster.primary_keyword];
  }

  private selectSupportingKeywords(cluster: KeywordCluster): string[] {
    return cluster.keywords.slice(1, 6);
  }

  private selectLongTailKeywords(cluster: KeywordCluster): string[] {
    return cluster.keywords.filter(k => k.length > cluster.primary_keyword.length + 10).slice(0, 8);
  }

  private generateSemanticKeywords(keyword: string): string[] {
    // This would typically use AI/NLP to generate semantic keywords
    return [`${keyword} guide`, `${keyword} tips`, `${keyword} best practices`];
  }

  private generatePeopleAlsoAsk(keyword: string): string[] {
    return [
      `What is ${keyword}?`,
      `How does ${keyword} work?`,
      `Why is ${keyword} important?`,
      `What are the benefits of ${keyword}?`
    ];
  }

  private calculateTitleScore(keyword: string, type: string): number {
    // Simple scoring based on keyword placement and length
    const hasKeyword = keyword.toLowerCase().includes(keyword.toLowerCase());
    const optimalLength = type === 'pillar' ? 60 : 55;
    const lengthScore = Math.max(0, 10 - Math.abs(keyword.length - optimalLength) / 5);
    return hasKeyword ? 8 + lengthScore : lengthScore;
  }

  private calculateMetaScore(keyword: string, type: string): number {
    const optimalLength = 155;
    const lengthScore = Math.max(0, 10 - Math.abs(keyword.length - optimalLength) / 10);
    return lengthScore;
  }

  private calculateReadabilityScore(type: string): number {
    const scores = { pillar: 8, supporting: 7, long_tail: 9 };
    return (scores as any)[type] || 7;
  }

  private generateSupportingOutline(keyword: string, targetAudience?: string): ArticleOutline {
    return {
      introduction: {
        hook: `Looking to master ${keyword}?`,
        problem_statement: `Many people struggle with ${keyword} because they don't know where to start.`,
        value_proposition: `This guide will show you exactly how to ${keyword} effectively.`,
        preview: [`Step-by-step process`, `Common mistakes to avoid`, `Pro tips and tricks`]
      },
      sections: [
        {
          heading: `Getting Started with ${keyword}`,
          level: 'h2',
          description: 'Foundation and prerequisites',
          key_points: ['Prerequisites', 'Setup requirements', 'Initial steps'],
          keywords: [keyword, 'getting started', 'basics'],
          estimated_word_count: 300
        },
        {
          heading: `Step-by-Step ${keyword} Process`,
          level: 'h2',
          description: 'Detailed implementation steps',
          key_points: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
          keywords: [keyword, 'process', 'steps', 'how to'],
          estimated_word_count: 600
        },
        {
          heading: `Pro Tips for ${keyword}`,
          level: 'h2',
          description: 'Advanced tips and optimization',
          key_points: ['Advanced techniques', 'Optimization tips', 'Best practices'],
          keywords: [keyword, 'tips', 'advanced', 'optimization'],
          estimated_word_count: 400
        }
      ],
      conclusion: {
        summary: `Mastering ${keyword} takes practice and patience.`,
        key_takeaways: ['Follow the process', 'Practice regularly', 'Learn from mistakes'],
        call_to_action: `Ready to start with ${keyword}? Begin with step one and track your progress.`
      }
    };
  }

  private generateLongTailOutline(keyword: string): ArticleOutline {
    return {
      introduction: {
        hook: `Quick answer: ${keyword}`,
        problem_statement: `You're looking for a quick solution to ${keyword}.`,
        value_proposition: `Here's exactly what you need to know about ${keyword}.`,
        preview: [`Direct answer`, `Key points`, `Quick tips`]
      },
      sections: [
        {
          heading: `What You Need to Know About ${keyword}`,
          level: 'h2',
          description: 'Essential information',
          key_points: ['Definition', 'Key facts', 'Important considerations'],
          keywords: [keyword, 'facts', 'information'],
          estimated_word_count: 400
        },
        {
          heading: `Quick Tips for ${keyword}`,
          level: 'h2',
          description: 'Actionable tips',
          key_points: ['Tip 1', 'Tip 2', 'Tip 3'],
          keywords: [keyword, 'tips', 'quick'],
          estimated_word_count: 300
        }
      ],
      conclusion: {
        summary: `${keyword} is simpler than you might think.`,
        key_takeaways: ['Key point 1', 'Key point 2', 'Key point 3'],
        call_to_action: `Need more help with ${keyword}? Check out our detailed guides.`
      }
    };
  }

  private async analyzeContentGaps(keyword: string): Promise<ContentGap[]> {
    // This would typically analyze competitor content
    return [
      {
        competitor_url: 'example.com',
        competitor_title: `Competitor article about ${keyword}`,
        gap_description: 'Missing practical examples',
        opportunity_score: 8,
        suggested_approach: 'Add real-world examples and case studies'
      }
    ];
  }

  private generateInternalLinks(keyword: string, cluster: EnhancedContentCluster): InternalLink[] {
    return [
      {
        anchor_text: cluster.pillar_keyword,
        context: `Learn more about ${cluster.pillar_keyword}`,
        link_value: 'high',
        suggested_position: 'body'
      }
    ];
  }

  private async findExternalResources(keyword: string): Promise<ExternalResource[]> {
    // This would typically search for relevant external resources
    return [
      {
        url: 'example.com/resource',
        title: `External resource about ${keyword}`,
        type: 'study',
        credibility_score: 9,
        relevance_score: 8,
        suggested_context: 'Reference this study in the methodology section'
      }
    ];
  }

  /**
   * Select tutorial keywords for enhanced content generation
   */
  private selectTutorialKeywords(keywords: string[]): string[] {
    return keywords.filter(keyword => 
      keyword.toLowerCase().includes('how to') ||
      keyword.toLowerCase().includes('tutorial') ||
      keyword.toLowerCase().includes('guide') ||
      keyword.toLowerCase().includes('step by step') ||
      keyword.toLowerCase().includes('learn')
    ).slice(0, 5);
  }

  /**
   * Generate tutorial article with enhanced structure
   */
  private async generateTutorialArticle(
    keyword: string,
    cluster: EnhancedContentCluster,
    researchResults: BlogResearchResults,
    targetAudience?: string
  ): Promise<HumanReadableArticle> {
    const analysis = researchResults.keyword_analysis.keyword_analysis[keyword];
    
    return {
      content_type: 'tutorial',
      target_keyword: keyword,
      title: this.generateTutorialTitle(keyword, targetAudience),
      subtitle: this.generateSubtitle(keyword, 'tutorial'),
      meta_description: this.generateMetaDescription(keyword, 'tutorial', targetAudience),
      url_slug: this.generateUrlSlug(keyword),
      estimated_word_count: 2000,
      tone: 'educational',
      status: 'idea',
      priority: 3,
      estimated_reading_time: 8,
      estimated_traffic: this.convertTrafficToNumber(this.estimateTraffic(analysis?.search_volume || 0)),
      difficulty_score: this.calculateDifficultyScore(analysis?.difficulty || 'medium'),
      target_audience: targetAudience || 'general',
      content_outline: this.generateTutorialOutline(keyword),
      internal_linking_opportunities: this.generateInternalLinks(keyword, cluster),
      external_resources: await this.findExternalResources(keyword),
      content_gaps: await this.analyzeContentGaps(keyword),
      seo_insights: {
        primary_keyword: keyword,
        secondary_keywords: analysis?.related_keywords?.slice(0, 5) || [],
        semantic_keywords: analysis?.related_keywords?.slice(5, 10) || [],
        keyword_difficulty: 50,
        search_volume: analysis?.search_volume || 0,
        competition_level: 'medium' as 'low' | 'medium' | 'high',
        title_optimization_score: 85,
        meta_description_score: 80,
        readability_score: 75,
        featured_snippet_opportunity: true,
        related_searches: analysis?.related_keywords?.slice(0, 3) || [],
        people_also_ask: analysis?.related_keywords?.slice(3, 6) || []
      },
      freshness_score: 85
    };
  }

  /**
   * Generate tutorial content outline
   */
  private generateTutorialOutline(keyword: string): ArticleOutline {
    return {
      introduction: {
        hook: `Ready to master ${keyword}? This comprehensive tutorial will guide you through every step.`,
        problem_statement: `Many people struggle with ${keyword} because they lack proper guidance and step-by-step instructions.`,
        value_proposition: `This tutorial will teach you everything you need to know about ${keyword} with practical examples and real-world applications.`,
        preview: [
          'Step-by-step instructions',
          'Practical examples',
          'Common pitfalls to avoid',
          'Advanced techniques'
        ]
      },
      sections: [
        {
          heading: 'Getting Started',
          level: 'h2',
          description: `Understanding ${keyword} is essential for success.`,
          key_points: [
            'Learn the fundamentals',
            'Set up your environment',
            'Understand prerequisites'
          ],
          keywords: [keyword, 'basics', 'fundamentals'],
          estimated_word_count: 700
        },
        {
          heading: 'Step-by-Step Process',
          level: 'h2',
          description: `Follow this comprehensive process to master ${keyword}.`,
          key_points: [
            'Foundation building',
            'Implementation phase',
            'Optimization techniques'
          ],
          keywords: [keyword, 'process', 'implementation'],
          estimated_word_count: 1500
        },
        {
          heading: 'Advanced Techniques',
          level: 'h2',
          description: `Master advanced concepts and avoid common pitfalls.`,
          key_points: [
            'Pro tips and tricks',
            'Common mistakes to avoid',
            'Expert-level techniques'
          ],
          keywords: [keyword, 'advanced', 'techniques'],
          estimated_word_count: 700
        }
      ],
      conclusion: {
        summary: `You've now mastered the fundamentals of ${keyword}.`,
        key_takeaways: ['Key learning point 1', 'Key learning point 2', 'Key learning point 3'],
        call_to_action: `Ready to apply what you've learned? Start with these practical exercises.`
      }
    };
  }

  // Additional helper methods for cluster generation
  private generateEnhancedClusterName(clusterName: string, industry?: string): string {
    const industryContext = industry ? ` (${industry})` : '';
    return `${clusterName} Content Hub${industryContext}`;
  }

  private generateClusterDescription(cluster: KeywordCluster, industry?: string, targetAudience?: string): string {
    const industryContext = industry ? ` in the ${industry} industry` : '';
    const audienceContext = targetAudience ? ` for ${targetAudience}` : '';
    return `Comprehensive content cluster focused on ${cluster.primary_keyword}${industryContext}${audienceContext}. Includes pillar content, supporting articles, and long-tail content to establish authority and capture traffic across the entire topic spectrum.`;
  }

  private calculateAuthorityScore(cluster: KeywordCluster, researchResults: BlogResearchResults): number {
    const avgCompetition = cluster.avg_competition;
    const clusterScore = cluster.cluster_score;
    const keywordCount = cluster.keywords.length;
    
    // Calculate authority score based on multiple factors
    return Math.round((clusterScore * 0.4) + ((1 - avgCompetition) * 0.4) + (Math.min(keywordCount / 20, 1) * 0.2) * 10);
  }

  private estimateTrafficPotential(cluster: KeywordCluster): 'low' | 'medium' | 'high' {
    const score = cluster.cluster_score;
    if (score > 0.7) return 'high';
    if (score > 0.4) return 'medium';
    return 'low';
  }

  private calculateContentGapScore(cluster: KeywordCluster, researchResults: BlogResearchResults): number {
    // This would typically analyze content gaps in the market
    return Math.floor(Math.random() * 5) + 6; // 6-10 score
  }

  private assessCompetitionLevel(cluster: KeywordCluster): 'low' | 'medium' | 'high' {
    if (cluster.avg_competition < 0.3) return 'low';
    if (cluster.avg_competition < 0.7) return 'medium';
    return 'high';
  }

  private assessCompetitionLevelFromDifficulty(difficulty: string): 'low' | 'medium' | 'high' {
    const mapping = { easy: 'low', medium: 'medium', hard: 'high' };
    return (mapping as any)[difficulty] || 'medium';
  }

  private generateContentStrategy(cluster: KeywordCluster, targetAudience?: string): string {
    const audienceContext = targetAudience ? ` for ${targetAudience}` : '';
    return `Develop comprehensive content around ${cluster.primary_keyword}${audienceContext} using a hub-and-spoke model. Create 1-2 pillar pieces, 3-5 supporting articles, and 5-8 long-tail content pieces to capture traffic across all search intents and establish topical authority.`;
  }

  private calculateTrafficEstimates(clusters: EnhancedContentCluster[]): { low: number; medium: number; high: number } {
    let low = 0, medium = 0, high = 0;
    
    clusters.forEach(cluster => {
      const articles = cluster.content_count;
      const baseTraffic = articles * 100; // Base estimate per article
      
      switch (cluster.estimated_traffic_potential) {
        case 'low':
          low += baseTraffic;
          break;
        case 'medium':
          medium += baseTraffic * 2;
          break;
        case 'high':
          high += baseTraffic * 3;
          break;
      }
    });

    return { low, medium, high };
  }

  private generateRecommendations(clusters: EnhancedContentCluster[], researchResults: BlogResearchResults): string[] {
    const recommendations = [
      'Start with pillar content to establish topical authority',
      'Create supporting content to capture long-tail traffic',
      'Focus on user intent and search behavior',
      'Build internal linking between related articles',
      'Monitor performance and optimize based on data'
    ];

    // Add specific recommendations based on research results
    if (researchResults.content_strategy?.recommended_approach) {
      recommendations.push(researchResults.content_strategy.recommended_approach);
    }

    return recommendations;
  }

  private generateStrategySummary(clusters: EnhancedContentCluster[]): string {
    const totalArticles = clusters.reduce((sum, cluster) => sum + cluster.content_count, 0);
    const highPotentialClusters = clusters.filter(c => c.estimated_traffic_potential === 'high').length;
    
    return `Content strategy includes ${clusters.length} clusters with ${totalArticles} total articles. ${highPotentialClusters} high-potential clusters identified for priority development. Focus on establishing topical authority through comprehensive coverage of each cluster's keyword spectrum.`;
  }

  /**
   * Save enhanced clusters to database
   */
  async saveEnhancedClusters(
    userId: string,
    clusters: EnhancedContentCluster[],
    articles: HumanReadableArticle[]
  ): Promise<{ success: boolean; cluster_ids?: string[]; error?: string }> {
    try {
      logger.debug('🚀 Starting saveEnhancedClusters with:', {
        userId,
        userIdType: typeof userId,
        clustersCount: clusters.length,
        articlesCount: articles.length,
        firstCluster: clusters[0] ? {
          cluster_name: clusters[0].cluster_name,
          pillar_keyword: clusters[0].pillar_keyword,
          cluster_status: clusters[0].cluster_status,
          user_id: (clusters[0] as any).user_id,
          org_id: (clusters[0] as any).org_id
        } : 'No clusters',
        firstArticle: articles[0] ? {
          title: articles[0].title,
          content_type: articles[0].content_type,
          target_keyword: articles[0].target_keyword,
          cluster_id: articles[0].cluster_id
        } : 'No articles'
      });
      
      // Validate input data
      if (!userId || typeof userId !== 'string') {
        logger.error('❌ Invalid userId:', userId);
        return { success: false, error: 'Invalid user ID' };
      }
      
      if (!clusters || clusters.length === 0) {
        logger.error('❌ No clusters to save');
        return { success: false, error: 'No clusters provided' };
      }
      
      if (!articles || articles.length === 0) {
        logger.error('❌ No articles to save');
        return { success: false, error: 'No articles provided' };
      }

      const supabase = createClient();
      logger.debug('🔧 Supabase client created successfully');
      
      // Check user authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      logger.debug('🔐 Authentication check:', {
        user: user ? { id: user.id, email: user.email } : null,
        authError,
        authErrorExists: !!authError
      });
      
      if (authError || !user) {
        logger.error('❌ Authentication failed:', authError);
        return { success: false, error: 'User not authenticated' };
      }
      
      if (user.id !== userId) {
        logger.error('❌ User ID mismatch:', { providedUserId: userId, authenticatedUserId: user.id });
        return { success: false, error: 'User ID mismatch' };
      }

      // Get user's org_id from users table
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('org_id')
        .eq('user_id', userId)
        .single();

      if (userError || !userProfile) {
        logger.error('❌ Failed to get user org_id:', userError);
        return { success: false, error: 'User organization not found' };
      }

      const orgId = userProfile.org_id;
      logger.debug('✅ Retrieved org_id:', { orgId, userId });

      // Test table access before attempting insert
      try {
        logger.debug('🔍 Testing table access...');
        const { data: testData, error: testError } = await supabase
          .from('content_clusters')
          .select('id')
          .limit(1);
        
        logger.debug('🔍 Table access test result:', {
          testData,
          testError,
          testErrorExists: !!testError,
          testErrorStringified: JSON.stringify(testError),
          testErrorType: typeof testError,
          testErrorKeys: testError ? Object.keys(testError) : 'No keys'
        });
        
        if (testError) {
          logger.error('❌ Table access test failed:', testError);
          return { success: false, error: `Table access failed: ${testError instanceof Error ? testError.message : 'Unknown error'}` };
        }
        
        // Also test the articles table
        logger.debug('🔍 Testing cluster_content_ideas table access...');
        const { data: ideasTestData, error: ideasTestError } = await supabase
          .from('cluster_content_ideas')
          .select('id')
          .limit(1);
        
        logger.debug('🔍 Ideas table access test result:', {
          ideasTestData,
          ideasTestError,
          ideasTestErrorExists: !!ideasTestError,
          ideasTestErrorStringified: JSON.stringify(ideasTestError)
        });
        
        if (ideasTestError) {
          logger.error('❌ Ideas table access test failed:', ideasTestError);
          return { success: false, error: `Ideas table access failed: ${ideasTestError instanceof Error ? ideasTestError.message : 'Unknown error'}` };
        }
        
      } catch (testException) {
        logger.error('❌ Exception during table access test:', {
          testException,
          testExceptionMessage: testException instanceof Error ? testException.message : 'Unknown error',
          testExceptionStack: testException instanceof Error ? testException.stack : 'No stack trace',
          testExceptionType: typeof testException,
          testExceptionConstructor: testException?.constructor?.name
        });
        return { success: false, error: `Table access exception: ${testException instanceof Error ? testException.message : 'Unknown error'}` };
      }
      
      const clusterIds: string[] = [];
      
      for (const cluster of clusters) {
        // Check if cluster with same name already exists for this org
        let clusterName = cluster.cluster_name;
        const { data: existingClusters } = await supabase
          .from('content_clusters')
          .select('cluster_name')
          .eq('org_id', orgId)
          .eq('cluster_name', clusterName);
        
        // If duplicate exists, append timestamp to make it unique
        if (existingClusters && existingClusters.length > 0) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          clusterName = `${cluster.cluster_name} (${timestamp})`;
          logger.debug('⚠️ Duplicate cluster name detected, appending timestamp:', {
            original: cluster.cluster_name,
            new: clusterName
          });
        }

        // Prepare cluster data for insertion
        const clusterInsertData = {
          user_id: userId,
          org_id: orgId, // Use actual org_id from users table
          cluster_name: clusterName,
          pillar_keyword: cluster.pillar_keyword,
          cluster_description: cluster.cluster_description,
          cluster_status: cluster.cluster_status,
          authority_score: cluster.authority_score,
          total_keywords: cluster.total_keywords,
          content_count: cluster.content_count,
          pillar_content_count: cluster.pillar_content_count,
          supporting_content_count: cluster.supporting_content_count,
          // Enhanced fields
          research_data: cluster.research_data,
          keyword_clusters: cluster.keyword_clusters,
          estimated_traffic_potential: cluster.estimated_traffic_potential,
          content_gap_score: cluster.content_gap_score,
          competition_level: cluster.competition_level,
          target_audience: cluster.target_audience,
          content_strategy: cluster.content_strategy,
        };

        logger.debug('🔍 Attempting to save cluster with data:', {
          cluster_name: clusterInsertData.cluster_name,
          pillar_keyword: clusterInsertData.pillar_keyword,
          user_id: clusterInsertData.user_id,
          org_id: clusterInsertData.org_id,
        });

        // Save cluster
        logger.debug('🔍 About to insert cluster data into database...');
        
        let clusterData: any = null;
        let clusterError: any = null;
        
        try {
          const result = await supabase
            .from('content_clusters')
            .insert(clusterInsertData)
            .select()
            .single();
            
          clusterData = result.data;
          clusterError = result.error;

          logger.debug('🔍 Database response:', { 
            clusterData, 
            clusterError,
            clusterDataExists: !!clusterData,
            clusterErrorExists: !!clusterError,
            clusterErrorType: typeof clusterError,
            clusterErrorStringified: JSON.stringify(clusterError)
          });
        } catch (insertError) {
          logger.error('❌ Exception during cluster insert:', {
            insertError,
            insertErrorType: typeof insertError,
            insertErrorMessage: insertError instanceof Error ? insertError.message : 'Unknown error',
            insertErrorStack: insertError instanceof Error ? insertError.stack : 'No stack trace',
            insertErrorName: insertError instanceof Error ? insertError.name : 'Unknown error type'
          });
          return { success: false, error: `Database insert exception: ${insertError instanceof Error ? insertError.message : 'Unknown error'}` };
        }

        if (clusterError) {
          // Try to extract error information in multiple ways
          const errorInfo = {
            error: clusterError,
            errorType: typeof clusterError,
            errorKeys: clusterError ? Object.keys(clusterError) : 'No keys',
            message: clusterError instanceof Error ? clusterError.message : 'No message',
            details: clusterError?.details || 'No details',
            hint: clusterError?.hint || 'No hint',
            code: clusterError?.code || 'No code',
            errorStringified: JSON.stringify(clusterError),
            errorToString: clusterError?.toString?.() || 'No toString method',
            errorConstructor: clusterError instanceof Error ? clusterError.constructor.name : 'No constructor name',
            data: clusterInsertData
          };
          
          logger.error('❌ Failed to save enhanced cluster - Full error details:', errorInfo);
          
          // Try to get a meaningful error message
          let errorMessage = 'Unknown database error';
          if (clusterError instanceof Error && clusterError.message) {
            errorMessage = clusterError.message;
          } else if (clusterError?.details) {
            errorMessage = clusterError.details;
          } else if (clusterError?.hint) {
            errorMessage = clusterError.hint;
          } else if (typeof clusterError === 'string') {
            errorMessage = clusterError;
          } else if (clusterError?.toString) {
            errorMessage = clusterError.toString();
          }
          
          return { success: false, error: errorMessage };
        }

        if (!clusterData) {
          logger.error('❌ No data returned from cluster insert, but no error either');
          return { success: false, error: 'No data returned from database insert' };
        }

        logger.debug('✅ Successfully saved cluster:', clusterData);

        clusterIds.push(clusterData.id);

        // Save articles for this cluster
        const clusterArticles = articles.filter(a => a.cluster_id === cluster.id);
        if (clusterArticles.length > 0) {
          // Group articles by target_keyword to assign sequence numbers
          const keywordGroups = new Map<string, number>();
          
          const articlesToInsert = clusterArticles.map(article => {
            // Get or assign sequence number for this keyword
            const keyword = article.target_keyword;
            const currentSequence = keywordGroups.get(keyword) || 0;
            const nextSequence = currentSequence + 1;
            keywordGroups.set(keyword, nextSequence);
            
            return {
              cluster_id: clusterData.id,
              org_id: orgId, // Use actual org_id from users table
              content_type: article.content_type,
              target_keyword: article.target_keyword,
              keyword_sequence: nextSequence,
              title: article.title,
              meta_description: article.meta_description,
              url_slug: article.url_slug,
              status: article.status,
              priority: article.priority,
              word_count_target: article.estimated_word_count,
              tone: article.tone,
              outline: article.content_outline,
              internal_links_planned: article.internal_linking_opportunities,
              external_links_planned: article.external_resources,
              keyword_difficulty: article.difficulty_score,
              // Only include fields that exist in the database schema
              // Additional fields will be added via future migrations
            };
          });

          const { error: articlesError } = await supabase
            .from('cluster_content_ideas')
            .insert(articlesToInsert);

          if (articlesError) {
            logger.error('Failed to save enhanced articles:', articlesError);
            return { success: false, error: articlesError instanceof Error ? articlesError.message : 'Unknown error' };
          }
        }
      }

      logger.debug('✅ Successfully saved enhanced clusters and articles');
      return { success: true, cluster_ids: clusterIds };
    } catch (error: unknown) {
      logger.error('❌ Unexpected error in saveEnhancedClusters:', {
        error,
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        errorName: error instanceof Error ? error.name : 'Unknown error type'
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred while saving clusters';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get user's enhanced clusters
   */
  async getUserEnhancedClusters(userId: string): Promise<EnhancedContentCluster[]> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('content_clusters')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch enhanced clusters:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error fetching enhanced clusters:', error);
      return [];
    }
  }

  /**
   * Get enhanced articles for a cluster
   */
  async getClusterEnhancedArticles(clusterId: string): Promise<HumanReadableArticle[]> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('cluster_content_ideas')
        .select('*')
        .eq('cluster_id', clusterId)
        .order('priority', { ascending: false });

      if (error) {
        logger.error('Failed to fetch enhanced articles:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error fetching enhanced articles:', error);
      return [];
    }
  }

  /**
   * Estimate traffic potential based on search volume
   */
  private estimateTraffic(searchVolume: number): 'low' | 'medium' | 'high' {
    if (searchVolume >= 10000) return 'high';
    if (searchVolume >= 1000) return 'medium';
    return 'low';
  }

  private convertTrafficToNumber(traffic: 'low' | 'medium' | 'high'): number {
    switch (traffic) {
      case 'low': return 50;
      case 'medium': return 200;
      case 'high': return 500;
      default: return 100;
    }
  }

  /**
   * Calculate difficulty score from difficulty string
   */
  private calculateDifficultyScore(difficulty: string): number {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 3;
      case 'medium': return 6;
      case 'hard': return 9;
      default: return 5;
    }
  }

  /**
   * Identify SEO opportunities for a keyword
   */
  private identifySEOOpportunities(keyword: string, analysis?: any): string[] {
    const opportunities: string[] = [];
    
    if (!analysis) {
      opportunities.push('Add keyword analysis data');
      return opportunities;
    }

    if (analysis.search_volume && analysis.search_volume > 1000) {
      opportunities.push('High search volume keyword - prioritize content');
    }

    if (analysis.difficulty === 'easy' || analysis.difficulty === 'medium') {
      opportunities.push('Manageable competition - good ranking opportunity');
    }

    if (analysis.trend_score && analysis.trend_score > 0.7) {
      opportunities.push('Trending keyword - create timely content');
    }

    if (keyword.length > 20) {
      opportunities.push('Long-tail keyword - specific audience targeting');
    }

    return opportunities.length > 0 ? opportunities : ['Standard SEO optimization'];
  }
}
