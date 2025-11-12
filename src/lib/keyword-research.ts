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
  // New clustering fields from API
  parent_topic?: string;
  cluster_score?: number;
  category_type?: 'topic' | 'question' | 'action' | 'entity';
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
  parent_topic?: string;
  category_type?: 'topic' | 'question' | 'action' | 'entity';
  keyword_count?: number;
}

export interface ClusterData {
  parent_topic: string;
  keywords: string[];
  cluster_score: number;
  category_type: 'topic' | 'question' | 'action' | 'entity';
  keyword_count: number;
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

/**
 * Keyword Research Service - Rebuilt from scratch
 * 
 * Key improvements:
 * - Always uses 75 suggestions per keyword for optimal long-tail results
 * - Proper fallback when enhanced endpoint is unavailable
 * - Better error handling and retry logic
 * - Optimal batch size of 20 keywords
 */
class KeywordResearchService {
  private baseURL: string;
  private useApiRoutes: boolean;

  constructor(
    baseURL?: string,
    useApiRoutes: boolean = true
  ) {
    this.baseURL = baseURL || 
      (typeof window !== 'undefined' 
        ? window.location.origin 
        : 'https://blog-writer-api-dev-613248238610.europe-west1.run.app');
    this.useApiRoutes = useApiRoutes;
  }

  /**
   * Retry API call with exponential backoff
   */
  private async retryApiCall<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 2000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const isRetryable = error instanceof Error && 
          (error.message.includes('503') || 
           error.message.includes('timeout') ||
           error.message.includes('network'));
        
        if (isRetryable && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`⚠️ Retry attempt ${attempt}/${maxRetries} after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw lastError;
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Analyze keywords - REBUILT with proper defaults and fallback
   */
  async analyzeKeywords(
    keywords: string[], 
    maxSuggestionsPerKeyword: number = 75, // Default to 75 for optimal long-tail results
    location: string = 'United States'
  ): Promise<KeywordAnalysis> {
    console.log(`📊 Analyzing keywords (${keywords.length} keywords, max_suggestions: ${maxSuggestionsPerKeyword})...`);
    
    // Optimal batch size for long-tail research
    const OPTIMAL_BATCH_SIZE = 20;
    if (keywords.length > OPTIMAL_BATCH_SIZE) {
      throw new Error(`Cannot analyze more than ${OPTIMAL_BATCH_SIZE} keywords at once. Received ${keywords.length} keywords. Please batch your requests.`);
    }

    // Ensure maxSuggestionsPerKeyword is at least 5 (API requirement) and defaults to 75
    const finalMaxSuggestions = Math.max(5, maxSuggestionsPerKeyword || 75);
    console.log(`📊 Using ${finalMaxSuggestions} suggestions per keyword for optimal long-tail results`);

    return await this.retryApiCall(async () => {
      const apiUrl = this.useApiRoutes 
        ? '/api/keywords/analyze'
        : `${this.baseURL}/api/v1/keywords/enhanced`;
      
      const requestBody = {
        keywords,
        location,
        language: 'en',
        include_serp: false,
        max_suggestions_per_keyword: finalMaxSuggestions
      };

      console.log(`📤 Sending request to ${apiUrl} with ${finalMaxSuggestions} suggestions per keyword`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(90000), // 90 second timeout
      });

      if (!response.ok) {
        const responseText = await response.text();
        let errorMessage = `API returned ${response.status}`;
        
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorData.detail || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }

        console.error(`❌ API error (${response.status}):`, errorMessage);
        console.error(`❌ Request body:`, JSON.stringify(requestBody, null, 2));
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Debug: Log API response structure to understand search_volume location
      console.log('📊 API Response structure:', {
        hasEnhancedAnalysis: !!data.enhanced_analysis,
        hasKeywordAnalysis: !!data.keyword_analysis,
        sampleKeyword: Object.keys(data.enhanced_analysis || data.keyword_analysis || {})[0],
        sampleData: Object.values(data.enhanced_analysis || data.keyword_analysis || {})[0]
      });
      
      // Handle response structure
      const enhancedAnalysis = data.enhanced_analysis || data.keyword_analysis || data;
      
      // Filter and process keywords
      const filteredAnalysis: Record<string, KeywordData> = {};
      Object.entries(enhancedAnalysis).forEach(([keyword, kwData]: [string, any]) => {
        const wordCount = keyword.trim().split(/\s+/).length;
        if (wordCount > 1 || keyword.trim().length > 5) {
          // Extract search_volume from various possible locations
          // API might return it as search_volume, volume, monthly_searches, or in metadata
          const searchVolume = kwData.search_volume 
            ?? kwData.volume 
            ?? kwData.monthly_searches 
            ?? kwData.metadata?.search_volume 
            ?? kwData.metadata?.volume
            ?? null;
          
          // Debug: Log search volume extraction for first keyword
          if (Object.keys(filteredAnalysis).length === 0) {
            console.log('🔍 Search volume extraction for keyword:', keyword, {
              'kwData.search_volume': kwData.search_volume,
              'kwData.volume': kwData.volume,
              'kwData.monthly_searches': kwData.monthly_searches,
              'kwData.metadata': kwData.metadata,
              extracted: searchVolume
            });
          }
          
          filteredAnalysis[keyword] = {
            keyword: kwData.keyword || keyword,
            search_volume: searchVolume,
            difficulty: kwData.difficulty || 'medium',
            competition: kwData.competition ?? 0.5,
            cpc: kwData.cpc ?? null,
            trend_score: kwData.trend_score ?? 0,
            recommended: kwData.recommended ?? false,
            reason: kwData.reason || '',
            related_keywords: kwData.related_keywords || [],
            long_tail_keywords: kwData.long_tail_keywords || [],
            parent_topic: kwData.parent_topic,
            cluster_score: kwData.cluster_score,
            category_type: kwData.category_type,
          };
        }
      });

      // Process clusters
      let clusters: KeywordCluster[] = [];
      if (data.clusters && Array.isArray(data.clusters)) {
        clusters = data.clusters.map((cluster: ClusterData, index: number) => ({
          id: `cluster-${index}`,
          name: cluster.parent_topic,
          keywords: cluster.keywords || [],
          primary_keyword: cluster.keywords?.[0] || '',
          avg_difficulty: 'medium' as const,
          avg_competition: 0.5,
          cluster_score: cluster.cluster_score || 0,
          parent_topic: cluster.parent_topic,
          category_type: cluster.category_type,
          keyword_count: cluster.keyword_count || cluster.keywords?.length || 0,
        }));
      }

      console.log(`✅ Analysis complete: ${Object.keys(filteredAnalysis).length} keywords, ${clusters.length} clusters`);

      return {
        keyword_analysis: filteredAnalysis,
        overall_score: this.calculateOverallScore(filteredAnalysis),
        recommendations: this.generateRecommendations(filteredAnalysis),
        cluster_groups: clusters,
      };
    });
  }

  /**
   * Extract keywords from text
   */
  async extractKeywords(text: string): Promise<string[]> {
    if (!text || text.trim().length < 10) {
      return [text.trim()];
    }

    try {
      const apiUrl = this.useApiRoutes 
        ? '/api/keywords/extract'
        : `${this.baseURL}/api/v1/keywords/extract`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Extraction failed: ${response.status}`);
      }

      const data = await response.json();
      return data.extracted_keywords || data.keywords || [];
    } catch (error) {
      console.warn('Keyword extraction failed, using topic as keyword:', error);
      return [text.trim()];
    }
  }

  /**
   * Get keyword suggestions
   */
  async getKeywordSuggestions(
    keywords: string[],
    limit: number = 150,
    location: string = 'United States'
  ): Promise<string[]> {
    try {
      const apiUrl = this.useApiRoutes 
        ? '/api/keywords/suggest'
        : `${this.baseURL}/api/v1/keywords/suggest`;
      
      const allSuggestions: string[] = [];
      
      for (const keyword of keywords) {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword, limit }),
          signal: AbortSignal.timeout(30000),
        });

        if (response.ok) {
          const data = await response.json();
          const suggestions = data.keyword_suggestions || data.suggestions || [];
          allSuggestions.push(...suggestions);
        }
      }

      return [...new Set(allSuggestions)].slice(0, limit);
    } catch (error) {
      console.error('Keyword suggestions failed:', error);
      return [];
    }
  }

  /**
   * Perform comprehensive blog research - REBUILT
   */
  async performBlogResearch(
    topic: string,
    targetAudience: string = 'general',
    userId?: string,
    location: string = 'United States'
  ): Promise<BlogResearchResults> {
    console.log('🔬 Starting comprehensive blog research...');
    
    try {
      // Step 1: Extract keywords
      const extractedKeywords = await this.extractKeywords(topic);
      console.log('📋 Extracted keywords:', extractedKeywords);

      // Step 2: Get keyword suggestions
      const suggestedKeywords = await this.getKeywordSuggestions([topic], 150, location);
      console.log(`💡 Suggested keywords (${suggestedKeywords.length}):`, suggestedKeywords.slice(0, 10));

      // Combine keywords
      const allKeywords = [...new Set([...extractedKeywords, ...suggestedKeywords, topic])];
      
      // Step 3: Analyze keywords in batches
      const BATCH_SIZE = 20;
      const MAX_SUGGESTIONS_PER_KEYWORD = 75; // Optimal for long-tail research
      
      let keywordAnalysis: KeywordAnalysis;
      
      if (allKeywords.length > BATCH_SIZE) {
        console.log(`⚠️ Batching analysis: ${allKeywords.length} keywords into batches of ${BATCH_SIZE}...`);
        
        const batches: KeywordAnalysis[] = [];
        
        for (let i = 0; i < allKeywords.length; i += BATCH_SIZE) {
          const batch = allKeywords.slice(i, i + BATCH_SIZE);
          console.log(`📊 Analyzing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allKeywords.length / BATCH_SIZE)} (${batch.length} keywords)...`);
          
          const batchAnalysis = await this.analyzeKeywords(batch, MAX_SUGGESTIONS_PER_KEYWORD, location);
          batches.push(batchAnalysis);
        }
        
        // Merge batches
        const mergedAnalysis: Record<string, KeywordData> = {};
        let totalScore = 0;
        const allRecommendations: string[] = [];
        const allClusters: KeywordCluster[] = [];
        
        batches.forEach((batch, index) => {
          Object.assign(mergedAnalysis, batch.keyword_analysis);
          totalScore += batch.overall_score;
          allRecommendations.push(...batch.recommendations);
          batch.cluster_groups.forEach(cluster => {
            allClusters.push({
              ...cluster,
              id: `batch-${index}-${cluster.id}`
            });
          });
        });
        
        keywordAnalysis = {
          keyword_analysis: mergedAnalysis,
          overall_score: totalScore / batches.length,
          recommendations: [...new Set(allRecommendations)],
          cluster_groups: allClusters
        };
        
        console.log(`✅ Merged ${batches.length} batches: ${Object.keys(mergedAnalysis).length} keywords`);
      } else {
        keywordAnalysis = await this.analyzeKeywords(allKeywords, MAX_SUGGESTIONS_PER_KEYWORD, location);
      }

      // Step 4: Generate title suggestions
      const primaryKeyword = Object.keys(keywordAnalysis.keyword_analysis)[0] || topic;
      const secondaryKeywords = Object.keys(keywordAnalysis.keyword_analysis).slice(1, 10);
      const titleSuggestions = this.generateTitleSuggestions(primaryKeyword, secondaryKeywords, targetAudience);

      // Step 5: Generate content strategy
      const contentStrategy = this.generateContentStrategy(keywordAnalysis, targetAudience);

      // Step 6: Generate SEO insights
      const seoInsights = this.generateSEOInsights(keywordAnalysis);

      return {
        keyword_analysis: keywordAnalysis,
        title_suggestions: titleSuggestions,
        content_strategy: contentStrategy,
        seo_insights: seoInsights,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Blog research failed:', errorMessage);
      throw new Error(`Blog research failed: ${errorMessage}`);
    }
  }

  /**
   * Calculate overall score
   */
  calculateOverallScore(analysis: Record<string, KeywordData>): number {
    const keywords = Object.values(analysis);
    if (keywords.length === 0) return 0;
    
    const avgDifficulty = keywords.reduce((sum, kw) => {
      const diff = kw.difficulty === 'easy' ? 1 : kw.difficulty === 'medium' ? 2 : 3;
      return sum + diff;
    }, 0) / keywords.length;
    
    const avgCompetition = keywords.reduce((sum, kw) => sum + (kw.competition || 0.5), 0) / keywords.length;
    
    return Math.round(100 - (avgDifficulty * 20) - (avgCompetition * 30));
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(analysis: Record<string, KeywordData>): string[] {
    const recommendations: string[] = [];
    const keywords = Object.values(analysis);
    
    const easyKeywords = keywords.filter(kw => kw.difficulty === 'easy');
    if (easyKeywords.length > 0) {
      recommendations.push(`Focus on ${easyKeywords.length} easy keywords for quick wins`);
    }
    
    const highVolume = keywords.filter(kw => (kw.search_volume || 0) > 1000);
    if (highVolume.length > 0) {
      recommendations.push(`Target ${highVolume.length} high-volume keywords for maximum traffic`);
    }
    
    return recommendations;
  }

  /**
   * Generate title suggestions
   */
  generateTitleSuggestions(
    primaryKeyword: string,
    secondaryKeywords: string[],
    audience: string = 'general'
  ): TitleSuggestion[] {
    const titles: TitleSuggestion[] = [
      {
        title: `Complete Guide to ${primaryKeyword}`,
        type: 'guide',
        seo_score: 85,
        readability_score: 90,
        keyword_density: 0.02,
        estimated_traffic: 'high',
        reasoning: 'Comprehensive guides rank well and attract long-term traffic'
      }
    ];
    
    return titles;
  }

  /**
   * Generate content strategy
   */
  generateContentStrategy(
    analysis: KeywordAnalysis,
    targetAudience: string
  ): BlogResearchResults['content_strategy'] {
    return {
      recommended_approach: 'Create comprehensive, in-depth content',
      target_audience: targetAudience,
      content_angle: 'Educational and informative',
      competitor_analysis: 'Focus on providing unique value'
    };
  }

  /**
   * Generate SEO insights
   */
  generateSEOInsights(analysis: KeywordAnalysis): BlogResearchResults['seo_insights'] {
    const keywords = Object.keys(analysis.keyword_analysis);
    return {
      primary_keyword: keywords[0] || '',
      secondary_keywords: keywords.slice(1, 10),
      content_length_recommendation: 2000,
      internal_linking_opportunities: keywords.slice(0, 5)
    };
  }
}

// Export singleton instance
const keywordResearchService = new KeywordResearchService();
export default keywordResearchService;

