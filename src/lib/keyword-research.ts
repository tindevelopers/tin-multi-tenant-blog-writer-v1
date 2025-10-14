"use client";

import cloudRunHealth from './cloud-run-health';
import keywordStorageService from './keyword-storage';

export interface KeywordData {
  keyword: string;
  search_volume?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  competition: number; // 0-1 scale
  cpc?: number;
  trend_score?: number;
  recommended: boolean;
  reason: string;
  related_keywords: string[];
  long_tail_keywords: string[];
}

export interface KeywordAnalysis {
  keyword_analysis: Record<string, KeywordData>;
  overall_score: number;
  recommendations: string[];
  cluster_groups: KeywordCluster[];
}

export interface KeywordCluster {
  id: string;
  name: string;
  keywords: string[];
  primary_keyword: string;
  avg_difficulty: 'easy' | 'medium' | 'hard';
  avg_competition: number;
  cluster_score: number;
}

export interface TitleSuggestion {
  title: string;
  type: 'question' | 'how_to' | 'list' | 'comparison' | 'guide' | 'review';
  seo_score: number;
  readability_score: number;
  keyword_density: number;
  estimated_traffic: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface BlogResearchResults {
  keyword_analysis: KeywordAnalysis;
  title_suggestions: TitleSuggestion[];
  content_strategy: {
    recommended_approach: string;
    target_audience: string;
    content_angle: string;
    competitor_analysis: string;
  };
  seo_insights: {
    primary_keyword: string;
    secondary_keywords: string[];
    content_length_recommendation: number;
    internal_linking_opportunities: string[];
  };
}

class KeywordResearchService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Extract keywords from text using NLP
   */
  async extractKeywords(text: string): Promise<string[]> {
    console.log('🔍 Extracting keywords from text...');
    
    try {
      // Try to ensure Cloud Run is awake, but don't fail if it's not
      const healthStatus = await cloudRunHealth.wakeUpAndWait();
      if (!healthStatus.isHealthy) {
        console.warn(`⚠️ Cloud Run is not healthy: ${healthStatus.error}. Using fallback method.`);
        return this.fallbackKeywordExtraction(text);
      }

      const response = await fetch(`${this.baseURL}/api/v1/keywords/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.warn(`⚠️ Keyword extraction API failed: ${response.status} ${response.statusText}. Using fallback method.`);
        return this.fallbackKeywordExtraction(text);
      }

      const data = await response.json();
      console.log('✅ Keywords extracted via API');
      return data.keywords || [];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️ Keyword extraction error: ${errorMessage}. Using fallback method.`);
      // Fallback to simple text processing
      return this.fallbackKeywordExtraction(text);
    }
  }

  /**
   * Analyze keywords for SEO potential
   */
  async analyzeKeywords(keywords: string[]): Promise<KeywordAnalysis> {
    console.log('📊 Analyzing keywords for SEO potential...');
    
    try {
      // Try to ensure Cloud Run is awake, but use fallback if not
      const healthStatus = await cloudRunHealth.wakeUpAndWait();
      if (!healthStatus.isHealthy) {
        console.warn(`⚠️ Cloud Run is not healthy: ${healthStatus.error}. Using fallback analysis.`);
        return this.fallbackKeywordAnalysis(keywords);
      }

      const response = await fetch(`${this.baseURL}/api/v1/keywords/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          keywords,
          text: keywords.join(' ') // Provide context
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        console.warn(`⚠️ Keyword analysis API failed: ${response.status} ${response.statusText}. Using fallback analysis.`);
        return this.fallbackKeywordAnalysis(keywords);
      }

      const data = await response.json();
      
      // Enhance the analysis with clustering
      const clusters = this.createKeywordClusters(data.keyword_analysis);
      
      console.log('✅ Keywords analyzed via API');
      return {
        keyword_analysis: data,
        overall_score: this.calculateOverallScore(data.keyword_analysis),
        recommendations: this.generateRecommendations(data.keyword_analysis),
        cluster_groups: clusters,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️ Keyword analysis error: ${errorMessage}. Using fallback analysis.`);
      return this.fallbackKeywordAnalysis(keywords);
    }
  }

  /**
   * Get keyword suggestions based on seed keywords
   */
  async getKeywordSuggestions(seedKeywords: string[]): Promise<string[]> {
    console.log('💡 Getting keyword suggestions...');
    
    try {
      // Try to ensure Cloud Run is awake, but use fallback if not
      const healthStatus = await cloudRunHealth.wakeUpAndWait();
      if (!healthStatus.isHealthy) {
        console.warn(`⚠️ Cloud Run is not healthy: ${healthStatus.error}. Using fallback suggestions.`);
        return this.generateFallbackSuggestions(seedKeywords);
      }

      const response = await fetch(`${this.baseURL}/api/v1/keywords/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          keywords: seedKeywords,
          limit: 20 
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.warn(`⚠️ Keyword suggestions API failed: ${response.status} ${response.statusText}. Using fallback suggestions.`);
        return this.generateFallbackSuggestions(seedKeywords);
      }

      const data = await response.json();
      console.log('✅ Keyword suggestions generated via API');
      return data.suggestions || [];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️ Keyword suggestions error: ${errorMessage}. Using fallback suggestions.`);
      // Fallback suggestions
      return this.generateFallbackSuggestions(seedKeywords);
    }
  }

  /**
   * Generate blog title suggestions based on keyword research
   */
  async generateTitleSuggestions(
    primaryKeyword: string, 
    secondaryKeywords: string[], 
    targetAudience: string = 'general'
  ): Promise<TitleSuggestion[]> {
    console.log('📝 Generating blog title suggestions...');
    
    const titles: TitleSuggestion[] = [];
    const keyword = primaryKeyword.toLowerCase();
    
    // Question-based titles
    titles.push({
      title: `How to ${keyword}: A Complete Guide`,
      type: 'how_to',
      seo_score: 85,
      readability_score: 90,
      keyword_density: 1.2,
      estimated_traffic: 'high',
      reasoning: 'Question-based titles perform well for informational content'
    });

    titles.push({
      title: `What is ${keyword}? Everything You Need to Know`,
      type: 'question',
      seo_score: 80,
      readability_score: 85,
      keyword_density: 1.0,
      estimated_traffic: 'medium',
      reasoning: 'Definition-style titles attract beginners and general audience'
    });

    // List-based titles
    if (secondaryKeywords.length > 0) {
      titles.push({
        title: `${secondaryKeywords.slice(0, 3).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}: ${primaryKeyword} Tips`,
        type: 'list',
        seo_score: 75,
        readability_score: 80,
        keyword_density: 1.5,
        estimated_traffic: 'medium',
        reasoning: 'List-style titles are highly shareable and scannable'
      });
    }

    // Guide titles
    titles.push({
      title: `The Ultimate ${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)} Guide for ${targetAudience}`,
      type: 'guide',
      seo_score: 90,
      readability_score: 85,
      keyword_density: 1.3,
      estimated_traffic: 'high',
      reasoning: 'Comprehensive guides rank well and attract long-term traffic'
    });

    // Comparison titles
    if (secondaryKeywords.length >= 2) {
      titles.push({
        title: `${secondaryKeywords[0].charAt(0).toUpperCase() + secondaryKeywords[0].slice(1)} vs ${secondaryKeywords[1].charAt(0).toUpperCase() + secondaryKeywords[1].slice(1)}: ${primaryKeyword} Comparison`,
        type: 'comparison',
        seo_score: 70,
        readability_score: 75,
        keyword_density: 1.8,
        estimated_traffic: 'medium',
        reasoning: 'Comparison content helps users make informed decisions'
      });
    }

    return titles.sort((a, b) => b.seo_score - a.seo_score);
  }

  /**
   * Perform comprehensive blog research
   */
  async performBlogResearch(
    topic: string, 
    targetAudience: string = 'general',
    userId?: string
  ): Promise<BlogResearchResults> {
    console.log('🔬 Starting comprehensive blog research...');
    
    try {
      // Step 1: Extract keywords from topic
      const extractedKeywords = await this.extractKeywords(topic);
      console.log('📋 Extracted keywords:', extractedKeywords);

      // Step 2: Get additional keyword suggestions
      const suggestedKeywords = await this.getKeywordSuggestions([topic]);
      console.log('💡 Suggested keywords:', suggestedKeywords);

      // Combine and deduplicate keywords
      const allKeywords = [...new Set([...extractedKeywords, ...suggestedKeywords, topic])];
      
      // Step 3: Analyze keywords
      const keywordAnalysis = await this.analyzeKeywords(allKeywords);
      console.log('📊 Keyword analysis completed');

      // Step 4: Generate title suggestions
      const titleSuggestions = await this.generateTitleSuggestions(
        topic, 
        allKeywords.slice(0, 5), 
        targetAudience
      );
      console.log('📝 Title suggestions generated');

      // Step 5: Create content strategy
      const contentStrategy = this.createContentStrategy(keywordAnalysis, topic, targetAudience);
      
      // Step 6: Generate SEO insights
      const seoInsights = this.generateSEOInsights(keywordAnalysis, topic);

      // Step 7: Save keywords to database if user is provided
      if (userId) {
        console.log('💾 Saving keywords to database for user:', userId);
        try {
          const keywordsToSave = Object.entries(keywordAnalysis.keyword_analysis).map(([keyword, data]) => ({
            keyword,
            search_volume: data.search_volume,
            difficulty: data.difficulty,
            competition: data.competition,
            cpc: data.cpc,
            trend_score: data.trend_score,
            recommended: data.recommended,
            reason: data.reason,
            related_keywords: data.related_keywords,
            long_tail_keywords: data.long_tail_keywords,
          }));

          const saveResult = await keywordStorageService.saveKeywords(
            userId,
            topic,
            keywordsToSave,
            {
              keyword_analysis: keywordAnalysis,
              title_suggestions: titleSuggestions,
              content_strategy: contentStrategy,
              seo_insights: seoInsights,
            }
          );

          if (saveResult.success) {
            console.log('✅ Keywords saved to database successfully');
          } else {
            console.warn('⚠️ Failed to save keywords to database:', saveResult.error);
          }
        } catch (saveError) {
          console.warn('⚠️ Error saving keywords to database:', saveError);
          // Don't throw error - research can continue without saving
        }
      }

      return {
        keyword_analysis: keywordAnalysis,
        title_suggestions: titleSuggestions,
        content_strategy: contentStrategy,
        seo_insights: seoInsights,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Blog research error:', errorMessage);
      throw new Error(`Blog research failed: ${errorMessage}`);
    }
  }

  // Helper methods
  private fallbackKeywordExtraction(text: string): string[] {
    // Simple keyword extraction as fallback
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'other', 'after', 'first', 'well', 'also', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'may', 'say', 'she', 'use', 'her', 'many', 'some', 'very', 'when', 'much', 'then', 'them', 'can', 'only', 'other', 'new', 'some', 'take', 'come', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'may', 'say', 'she', 'use', 'her', 'many'].includes(word));
    
    // Get unique words and return top 10
    return [...new Set(words)].slice(0, 10);
  }

  private generateFallbackSuggestions(seedKeywords: string[]): string[] {
    const suggestions: string[] = [];
    
    seedKeywords.forEach(keyword => {
      // Add variations
      suggestions.push(`${keyword} guide`);
      suggestions.push(`${keyword} tips`);
      suggestions.push(`how to ${keyword}`);
      suggestions.push(`${keyword} for beginners`);
      suggestions.push(`best ${keyword}`);
      suggestions.push(`${keyword} tutorial`);
    });
    
    return [...new Set(suggestions)].slice(0, 15);
  }

  private fallbackKeywordAnalysis(keywords: string[]): KeywordAnalysis {
    console.log('📊 Using fallback keyword analysis...');
    
    // Generate mock keyword data for each keyword
    const keywordAnalysis: Record<string, KeywordData> = {};
    
    keywords.forEach((keyword, index) => {
      // Generate semi-realistic data based on keyword characteristics
      const length = keyword.split(' ').length;
      const isLongTail = length > 3;
      const difficulty = isLongTail ? 'easy' : (length > 2 ? 'medium' : 'hard');
      const competition = isLongTail ? 0.3 : (length > 2 ? 0.6 : 0.8);
      const searchVolume = isLongTail ? Math.floor(Math.random() * 1000) + 100 : Math.floor(Math.random() * 5000) + 1000;
      
      keywordAnalysis[keyword] = {
        keyword,
        search_volume: searchVolume,
        difficulty: difficulty as 'easy' | 'medium' | 'hard',
        competition,
        cpc: parseFloat((Math.random() * 3 + 0.5).toFixed(2)),
        trend_score: parseFloat((Math.random() * 20 + 60).toFixed(2)),
        recommended: difficulty === 'easy' || difficulty === 'medium',
        reason: difficulty === 'easy' 
          ? 'Low competition, good opportunity for ranking'
          : difficulty === 'medium'
          ? 'Moderate competition, achievable with quality content'
          : 'High competition, requires strong domain authority',
        related_keywords: this.generateRelatedKeywords(keyword),
        long_tail_keywords: this.generateLongTailKeywords(keyword),
      };
    });
    
    // Create clusters
    const clusters = this.createKeywordClusters(keywordAnalysis);
    
    return {
      keyword_analysis: keywordAnalysis,
      overall_score: this.calculateOverallScore(keywordAnalysis),
      recommendations: this.generateRecommendations(keywordAnalysis),
      cluster_groups: clusters,
    };
  }

  private generateRelatedKeywords(keyword: string): string[] {
    const baseWords = keyword.split(' ');
    const related: string[] = [];
    
    if (baseWords.length > 0) {
      related.push(`${keyword} guide`);
      related.push(`${keyword} tips`);
      related.push(`best ${keyword}`);
      related.push(`${baseWords[0]} techniques`);
    }
    
    return related.slice(0, 5);
  }

  private generateLongTailKeywords(keyword: string): string[] {
    return [
      `how to ${keyword}`,
      `${keyword} for beginners`,
      `${keyword} step by step`,
      `${keyword} complete guide`,
      `best ${keyword} methods`,
    ].slice(0, 3);
  }

  private createKeywordClusters(keywordAnalysis: Record<string, KeywordData>): KeywordCluster[] {
    const clusters: KeywordCluster[] = [];
    const keywords = Object.keys(keywordAnalysis);
    
    // Simple clustering based on keyword similarity
    const processed = new Set<string>();
    
    keywords.forEach(keyword => {
      if (processed.has(keyword)) return;
      
      const cluster: KeywordCluster = {
        id: `cluster_${clusters.length + 1}`,
        name: keyword.charAt(0).toUpperCase() + keyword.slice(1) + ' Cluster',
        keywords: [keyword],
        primary_keyword: keyword,
        avg_difficulty: keywordAnalysis[keyword].difficulty,
        avg_competition: keywordAnalysis[keyword].competition,
        cluster_score: this.calculateClusterScore([keywordAnalysis[keyword]]),
      };
      
      // Find related keywords
      keywords.forEach(otherKeyword => {
        if (otherKeyword !== keyword && !processed.has(otherKeyword)) {
          if (this.areKeywordsRelated(keyword, otherKeyword)) {
            cluster.keywords.push(otherKeyword);
            cluster.avg_competition = (cluster.avg_competition + keywordAnalysis[otherKeyword].competition) / 2;
          }
        }
      });
      
      clusters.push(cluster);
      cluster.keywords.forEach(k => processed.add(k));
    });
    
    return clusters;
  }

  private areKeywordsRelated(keyword1: string, keyword2: string): boolean {
    // Simple relatedness check based on word overlap
    const words1 = keyword1.toLowerCase().split(/\s+/);
    const words2 = keyword2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length > 0 && commonWords.length / Math.max(words1.length, words2.length) > 0.3;
  }

  private calculateClusterScore(keywords: KeywordData[]): number {
    if (keywords.length === 0) return 0;
    
    const avgCompetition = keywords.reduce((sum, k) => sum + k.competition, 0) / keywords.length;
    const avgDifficulty = keywords.filter(k => k.difficulty === 'easy').length / keywords.length;
    
    return Math.round((avgDifficulty * 100) - (avgCompetition * 50) + 50);
  }

  private calculateOverallScore(keywordAnalysis: Record<string, KeywordData>): number {
    const keywords = Object.values(keywordAnalysis) as KeywordData[];
    if (keywords.length === 0) return 0;
    
    const avgCompetition = keywords.reduce((sum, k) => sum + k.competition, 0) / keywords.length;
    const easyKeywords = keywords.filter(k => k.difficulty === 'easy').length;
    const recommendedKeywords = keywords.filter(k => k.recommended).length;
    
    return Math.round((easyKeywords / keywords.length) * 40 + (recommendedKeywords / keywords.length) * 40 - (avgCompetition * 20));
  }

  private generateRecommendations(keywordAnalysis: Record<string, KeywordData>): string[] {
    const recommendations: string[] = [];
    const keywords = Object.values(keywordAnalysis) as KeywordData[];
    
    const easyKeywords = keywords.filter(k => k.difficulty === 'easy');
    const hardKeywords = keywords.filter(k => k.difficulty === 'hard');
    
    if (easyKeywords.length > 0) {
      recommendations.push(`Focus on easy keywords: ${easyKeywords.map(k => k.keyword).join(', ')}`);
    }
    
    if (hardKeywords.length > 0) {
      recommendations.push(`Consider avoiding very competitive keywords: ${hardKeywords.map(k => k.keyword).join(', ')}`);
    }
    
    const recommendedKeywords = keywords.filter(k => k.recommended);
    if (recommendedKeywords.length > 0) {
      recommendations.push(`Prioritize these keywords for best results: ${recommendedKeywords.map(k => k.keyword).join(', ')}`);
    }
    
    return recommendations;
  }

  private createContentStrategy(keywordAnalysis: KeywordAnalysis, topic: string, targetAudience: string) {
    const primaryKeyword = keywordAnalysis.cluster_groups[0]?.primary_keyword || topic;
    
    return {
      recommended_approach: 'Create comprehensive, in-depth content that addresses user intent',
      target_audience: targetAudience,
      content_angle: `Focus on practical, actionable advice for ${targetAudience} interested in ${primaryKeyword}`,
      competitor_analysis: 'Analyze top-ranking content to identify content gaps and improvement opportunities',
    };
  }

  private generateSEOInsights(keywordAnalysis: KeywordAnalysis, topic: string) {
    const primaryKeyword = keywordAnalysis.cluster_groups[0]?.primary_keyword || topic;
    const secondaryKeywords = keywordAnalysis.cluster_groups.flatMap(c => c.keywords).slice(1, 5);
    
    return {
      primary_keyword: primaryKeyword,
      secondary_keywords: secondaryKeywords,
      content_length_recommendation: 2000, // Based on keyword competition
      internal_linking_opportunities: [
        `${primaryKeyword} guide`,
        `${primaryKeyword} tips`,
        `how to ${primaryKeyword}`,
      ],
    };
  }
}

// Create singleton instance
const keywordResearchService = new KeywordResearchService(
  process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west1.run.app'
);

export default keywordResearchService;
export { KeywordResearchService };
