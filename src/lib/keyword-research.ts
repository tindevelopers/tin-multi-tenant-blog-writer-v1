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
  private useApiRoutes: boolean; // Use Next.js API routes instead of direct Cloud Run calls

  constructor(baseURL: string, useApiRoutes: boolean = true) {
    this.baseURL = baseURL;
    this.useApiRoutes = useApiRoutes; // Default to using API routes to avoid CORS
  }

  /**
   * Retry API call with exponential backoff
   * Handles CORS errors by retrying (service might still be configuring CORS)
   */
  private async retryApiCall<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 8,
    baseDelay: number = 2000,
    operationName: string = 'API call'
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if it's a CORS or network error (service might still be starting)
        // CORS errors typically show up as TypeError with "Failed to fetch" or similar
        const errorMessage = lastError.message.toLowerCase();
        const errorName = lastError.name.toLowerCase();
        const isCorsError = errorMessage.includes('cors') || 
                           errorMessage.includes('failed to fetch') ||
                           errorMessage.includes('blocked') ||
                           errorMessage.includes('networkerror') ||
                           errorMessage.includes('network error') ||
                           (errorName === 'typeerror' && errorMessage.includes('fetch'));
        
        // Network errors (including CORS) are retryable
        const isNetworkError = errorName === 'typeerror' || errorName === 'networkerror';
        
        if (attempt < maxRetries && (isCorsError || isNetworkError)) {
          // CORS/network errors likely mean service is still starting up or CORS not configured yet
          const delay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), 10000);
          console.log(`⏳ ${operationName} failed (CORS/network error - service may still be starting). Retry ${attempt}/${maxRetries} in ${Math.round(delay/1000)}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Re-check health and wake up service before retrying
          try {
            const healthStatus = await cloudRunHealth.wakeUpAndWait();
            if (!healthStatus.isHealthy && healthStatus.isWakingUp) {
              console.log(`⏳ Service still starting up (${healthStatus.error}), continuing to wait...`);
              // Continue retrying if service is still waking up
              continue;
            }
          } catch {
            // Health check failed, but continue retrying API call
            console.log(`⏳ Health check failed, but continuing to retry API call...`);
            continue;
          }
        } else {
          // Non-retryable error or max retries reached
          throw lastError;
        }
      }
    }
    
    throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
  }

  /**
   * Extract keywords from text using NLP
   * For short text (< 100 chars), returns the text as a single keyword
   */
  async extractKeywords(text: string): Promise<string[]> {
    console.log('🔍 Extracting keywords from text...');
    
    // If text is too short (< 100 chars), Cloud Run API requires longer content
    // For short queries, just return the query itself as a keyword
    if (text.trim().length < 100) {
      console.log('📝 Text is too short for extraction, using as single keyword');
      return [text.trim()];
    }
    
    try {
      // If using API routes, we don't need to check Cloud Run health directly
      // The API route will handle Cloud Run communication server-side
      if (!this.useApiRoutes) {
        const healthStatus = await cloudRunHealth.wakeUpAndWait();
        if (!healthStatus.isHealthy) {
          throw new Error(`Cloud Run is not ready: ${healthStatus.error}`);
        }
      }

      return await this.retryApiCall(async () => {
        let response: Response;
        try {
          // Use Next.js API route to avoid CORS issues
          const apiUrl = this.useApiRoutes 
            ? '/api/keywords/extract'
            : `${this.baseURL}/api/v1/keywords/extract`;
          
          response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ text }),
            signal: AbortSignal.timeout(15000),
          });
        } catch (fetchError: unknown) {
          // CORS errors and network errors are caught here
          const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
          // Re-throw as a network error that will be retried
          throw new Error(`Network error: ${errorMsg}`);
        }

        if (!response.ok) {
          // If 400 error and it's about content length, return the text as keyword
          if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.error?.includes('100 characters')) {
              console.log('📝 Content too short, using text as single keyword');
              return [text.trim()];
            }
          }
          throw new Error(`API returned ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Keywords extracted via API');
        console.log('📋 Raw API response:', JSON.stringify(data, null, 2));
        const keywords = data.keywords || [];
        
        // Ensure we're preserving phrases, not individual words
        // Filter out single-word keywords that are likely stop words or too generic
        const phraseKeywords = keywords.filter((kw: string) => {
          const trimmed = kw.trim();
          // Keep phrases (2+ words) or single words that are meaningful
          const wordCount = trimmed.split(/\s+/).length;
          return wordCount > 1 || trimmed.length > 5;
        });
        
        console.log('📋 Filtered keywords (phrases preserved):', phraseKeywords);
        return phraseKeywords;
      }, 8, 2000, 'Keyword extraction');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Keyword extraction failed after retries: ${errorMessage}`);
      // For short text, fallback to using the text itself as a keyword
      if (text.trim().length < 100) {
        console.log('📝 Fallback: Using text as single keyword');
        return [text.trim()];
      }
      throw new Error(`Failed to extract keywords: ${errorMessage}. Please wait for the API to become ready and try again.`);
    }
  }

  /**
   * Analyze keywords for SEO potential
   */
  async analyzeKeywords(keywords: string[]): Promise<KeywordAnalysis> {
    console.log('📊 Analyzing keywords for SEO potential...');
    
    try {
      // If using API routes, we don't need to check Cloud Run health directly
      // The API route will handle Cloud Run communication server-side
      if (!this.useApiRoutes) {
        const healthStatus = await cloudRunHealth.wakeUpAndWait();
        if (!healthStatus.isHealthy) {
          throw new Error(`Cloud Run is not ready: ${healthStatus.error}`);
        }
      }

      return await this.retryApiCall(async () => {
        let response: Response;
        try {
          // Use Next.js API route to avoid CORS issues
          const apiUrl = this.useApiRoutes 
            ? '/api/keywords/analyze'
            : `${this.baseURL}/api/v1/keywords/analyze`;
          
          response = await fetch(apiUrl, {
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
        } catch (fetchError: unknown) {
          // CORS errors and network errors are caught here
          const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
          // Re-throw as a network error that will be retried
          throw new Error(`Network error: ${errorMsg}`);
        }

        if (!response.ok) {
          throw new Error(`API returned ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Enhance the analysis with clustering
        const keywordAnalysis = data.keyword_analysis || data;
        
        // Filter out single-word keywords that don't make sense as standalone keywords
        // Keep only phrases (2+ words) or meaningful single words
        const filteredAnalysis: Record<string, KeywordData> = {};
        Object.entries(keywordAnalysis).forEach(([keyword, data]: [string, any]) => {
          const wordCount = keyword.trim().split(/\s+/).length;
          // Keep phrases (2+ words) or single words that are meaningful (length > 5)
          if (wordCount > 1 || keyword.trim().length > 5) {
            filteredAnalysis[keyword] = data;
          } else {
            console.log(`⚠️ Filtering out single-word keyword: "${keyword}"`);
          }
        });
        
        const clusters = this.createKeywordClusters(filteredAnalysis);
        
        console.log('✅ Keywords analyzed via API');
        console.log('🔍 API response data structure:', data);
        console.log('🔍 Filtered keyword analysis (phrases only):', Object.keys(filteredAnalysis));
        
        // Debug search volume data
        console.log('🔍 Search volume data check:', Object.entries(filteredAnalysis).map(([key, data]: [string, any]) => ({
          keyword: key,
          search_volume: data?.search_volume,
          search_volume_type: typeof data?.search_volume
        })));
        
        return {
          keyword_analysis: filteredAnalysis,
          overall_score: this.calculateOverallScore(filteredAnalysis),
          recommendations: this.generateRecommendations(filteredAnalysis),
          cluster_groups: clusters,
        };
      }, 8, 2000, 'Keyword analysis');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Keyword analysis failed after retries: ${errorMessage}`);
      throw new Error(`Failed to analyze keywords: ${errorMessage}. Please wait for the API to become ready and try again.`);
    }
  }

  /**
   * Get keyword suggestions based on seed keywords
   */
  async getKeywordSuggestions(seedKeywords: string[]): Promise<string[]> {
    console.log('💡 Getting keyword suggestions...');
    
    try {
      // If using API routes, we don't need to check Cloud Run health directly
      // The API route will handle Cloud Run communication server-side
      if (!this.useApiRoutes) {
        const healthStatus = await cloudRunHealth.wakeUpAndWait();
        if (!healthStatus.isHealthy) {
          throw new Error(`Cloud Run is not ready: ${healthStatus.error}`);
        }
      }

      return await this.retryApiCall(async () => {
        let response: Response;
        try {
          // Use Next.js API route to avoid CORS issues
          const apiUrl = this.useApiRoutes 
            ? '/api/keywords/suggest'
            : `${this.baseURL}/api/v1/keywords/suggest`;
          
          response = await fetch(apiUrl, {
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
        } catch (fetchError: unknown) {
          // CORS errors and network errors are caught here
          const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
          // Re-throw as a network error that will be retried
          throw new Error(`Network error: ${errorMsg}`);
        }

        if (!response.ok) {
          throw new Error(`API returned ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Keyword suggestions generated via API');
        return data.suggestions || [];
      }, 8, 2000, 'Keyword suggestions');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Keyword suggestions failed after retries: ${errorMessage}`);
      throw new Error(`Failed to get keyword suggestions: ${errorMessage}. Please wait for the API to become ready and try again.`);
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
    // Improved keyword extraction that preserves phrases
    // First, try to extract meaningful phrases (2-5 words)
    const phrases: string[] = [];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    // Extract 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      if (phrase.length > 5) {
        phrases.push(phrase);
      }
    }
    
    // Extract 3-word phrases
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (phrase.length > 8) {
        phrases.push(phrase);
      }
    }
    
    // Extract 4-word phrases (long-tail keywords)
    for (let i = 0; i < words.length - 3; i++) {
      const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]} ${words[i + 3]}`;
      if (phrase.length > 12) {
        phrases.push(phrase);
      }
    }
    
    // Also include the full original text if it's a meaningful phrase
    const cleanedText = text.trim().toLowerCase();
    if (cleanedText.split(/\s+/).length >= 2 && cleanedText.length > 10) {
      phrases.push(cleanedText);
    }
    
    // Return unique phrases, prioritizing longer ones
    return [...new Set(phrases)]
      .sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length)
      .slice(0, 20);
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
    
    return [...new Set(suggestions)].slice(0, 25);
  }

  private fallbackKeywordAnalysis(keywords: string[]): KeywordAnalysis {
    console.log('📊 Using fallback keyword analysis...');
    console.log('📊 Keywords to analyze:', keywords);
    
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
    
    // Debug generated search volumes
    console.log('📊 Generated search volumes:', Object.entries(keywordAnalysis).map(([key, data]) => ({
      keyword: key,
      search_volume: data.search_volume,
      search_volume_type: typeof data.search_volume
    })));
    
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
// Use API routes by default to avoid CORS issues
const keywordResearchService = new KeywordResearchService(
  process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west1.run.app',
  true // useApiRoutes = true (use Next.js API routes instead of direct Cloud Run calls)
);

export default keywordResearchService;
export { KeywordResearchService };
