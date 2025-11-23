"use client";

import cloudRunHealth from './cloud-run-health';
import keywordStorageService from './keyword-storage';
import { logger } from '@/utils/logger';

// Enhanced endpoint types from FRONTEND_INTEGRATION_GUIDE.md v1.3.0
export interface TrendsData {
  trend_score: number;
  is_trending: boolean;
  related_topics: string[];
  related_queries: string[];
}

export interface KeywordIdea {
  keyword: string;
  search_volume: number;
  cpc?: number;
  competition?: number;
  difficulty?: string;
}

export interface RelevantPage {
  url: string;
  title: string;
  rank_group: number;
  word_count?: number;
  structure?: Record<string, unknown>;
}

export interface SERPAISummary {
  summary: string;
  main_topics: string[];
  missing_topics: string[];
  common_questions: string[];
  recommendations: string[];
  content_depth?: string;
}

export interface KeywordData {
  keyword: string;
  // Basic Metrics
  search_volume?: number;                    // Local monthly search volume
  global_search_volume?: number;             // Global monthly search volume (v1.3.0)
  search_volume_by_country?: {               // Search volume breakdown by country (v1.3.0)
    [countryCode: string]: number;
  };
  monthly_searches?: Array<{                 // Historical monthly search data (v1.3.0)
    month: string;
    search_volume: number;
  }>;
  difficulty: 'easy' | 'medium' | 'hard' | 'very_easy' | 'very_hard';
  competition: number; // 0-1 scale
  cpc?: number;                              // Cost per click (organic CPC, not Google Ads)
  cpc_currency?: string;                     // Currency code (e.g., "USD") (v1.3.0)
  cps?: number;                              // Cost per sale (v1.3.0)
  clicks?: number;                           // Estimated monthly clicks (v1.3.0)
  trend_score?: number;                      // -1.0 to 1.0
  // Enhanced Metrics (v1.3.0)
  parent_topic?: string;                     // Parent topic for clustering
  category_type?: 'topic' | 'question' | 'action' | 'entity'; // Keyword category type
  cluster_score?: number;                     // 0.0-1.0 (clustering confidence)
  // AI Optimization (v1.3.0)
  ai_search_volume?: number;                 // AI-optimized search volume
  ai_trend?: number;                         // AI trend score (-1.0 to 1.0)
  ai_monthly_searches?: Array<{              // Historical AI search volume (v1.3.0)
    month: string;
    volume: number;
  }>;
  // Traffic & Performance (v1.3.0)
  traffic_potential?: number;                 // Estimated traffic potential
  // SERP Features (v1.3.0)
  serp_features?: string[];                  // SERP features present (PAA, Featured Snippet, etc.)
  serp_feature_counts?: {                    // Counts of SERP features (v1.3.0)
    [feature: string]: number;
  };
  // Related Keywords
  related_keywords: string[];
  long_tail_keywords: string[];
  // Enhanced Related Keywords (with full metrics) - v1.3.0+
  related_keywords_enhanced?: Array<{
    keyword: string;
    search_volume: number;
    cpc: number;
    competition: number;
    difficulty_score: number;
  }>;
  // Question-type keywords - v1.3.0+
  questions?: Array<{
    keyword: string;
    search_volume: number;
    cpc: number;
    competition: number;
    difficulty_score: number;
  }>;
  // Topic-type keywords - v1.3.0+
  topics?: Array<{
    keyword: string;
    search_volume: number;
    cpc: number;
    competition: number;
    difficulty_score: number;
  }>;
  // Additional Data (v1.3.0)
  also_rank_for?: string[];                  // Keywords that pages ranking for this also rank for
  also_talk_about?: string[];                // Related topics/entities
  top_competitors?: string[];                // Top competing domains
  primary_intent?: string;                   // Primary search intent
  intent_probabilities?: {                   // Intent probability breakdown (v1.3.0)
    [intent: string]: number;
  };
  first_seen?: string;                       // Date keyword first seen (ISO format)
  last_updated?: string;                     // Date data was last updated (ISO format)
  // Recommendations
  recommended: boolean;
  reason: string;
  // Enhanced endpoint fields (legacy, kept for backward compatibility)
  trends_data?: TrendsData;
  keyword_ideas?: KeywordIdea[];
  relevant_pages?: RelevantPage[];
  serp_ai_summary?: SERPAISummary;
}

// Enhanced Keyword Analysis Request (v1.3.3)
export interface EnhancedKeywordAnalysisRequest {
  keywords: string[];
  location?: string;
  language?: string;
  search_type?: 
    | "competitor_analysis"
    | "content_research"
    | "quick_analysis"
    | "comprehensive_analysis"
    | "enhanced_keyword_analysis";
  include_serp?: boolean;
  max_suggestions_per_keyword?: number;
  
  // SERP Customization (v1.3.3)
  serp_depth?: number;                    // Default: 20, Range: 5-100
  serp_prompt?: string;                    // Custom prompt for AI summary
  include_serp_features?: string[];        // Default: ["featured_snippet", "people_also_ask", "videos", "images"]
  serp_analysis_type?: "basic" | "ai_summary" | "both";  // Default: "both"
  
  // Related Keywords Customization (v1.3.3)
  related_keywords_depth?: number;        // Default: 1, Range: 1-4
  related_keywords_limit?: number;        // Default: 20, Range: 5-100
  
  // Keyword Ideas Customization (v1.3.3)
  keyword_ideas_limit?: number;            // Default: 50, Range: 10-200
  keyword_ideas_type?: "all" | "questions" | "topics";  // Default: "all"
  
  // AI Volume Customization (v1.3.3)
  include_ai_volume?: boolean;             // Default: true
  ai_volume_timeframe?: number;            // Default: 12, Range: 1-24 (months)
}

// LLM Research Request (v1.3.3)
export interface LLMResearchRequest {
  keywords: string[];                      // Max 10 keywords
  prompts?: string[];                      // Optional: Auto-generated if not provided
  llm_models?: string[];                   // Default: ["chatgpt", "claude", "gemini"]
  max_tokens?: number;                     // Default: 500, Range: 100-2000
  location?: string;                       // Default: "United States"
  language?: string;                       // Default: "en"
  include_consensus?: boolean;             // Default: true
  include_sources?: boolean;               // Default: true
  research_type?: "quick" | "comprehensive" | "fact_check" | "content_research";  // Default: "comprehensive"
}

// Progress Update (for SSE streaming) (v1.3.3)
export interface ProgressUpdate {
  stage: string;
  stage_number: number;
  total_stages: number;
  progress_percentage: number;
  status: string;
  details?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

// LLM Research Response (v1.3.3)
export interface LLMResearchResponse {
  llm_research: Record<string, {
    prompts_used: string[];
    responses: Record<string, Record<string, {
      text: string;
      tokens: number;
      model: string;
      timestamp: string;
    }>>;
    consensus?: string[];
    differences?: string[];
    sources?: Array<{ url: string; title: string }>;
    confidence?: {
      chatgpt: number;
      claude: number;
      gemini: number;
      average: number;
    };
  }>;
  summary: {
    total_keywords_researched: number;
    total_prompts: number;
    total_llm_queries: number;
    llm_models_used: string[];
    average_confidence: number;
    sources_found: number;
    research_type: string;
  };
}

export interface KeywordAnalysis {
  keyword_analysis: Record<string, KeywordData>;
  overall_score: number;
  recommendations: string[];
  cluster_groups: KeywordCluster[];
  // Enhanced response fields (v1.3.0)
  location?: {
    used: string;
    detected_from_ip: boolean;
    specified: boolean;
  };
  discovery?: {
    // Additional discovery data from DataForSEO
    [key: string]: unknown;
  };
  serp_analysis?: {
    // SERP analysis summary
    [key: string]: unknown;
  };
  serp_ai_summary?: {
    // AI-generated SERP summary
    [key: string]: unknown;
  };
  total_keywords?: number;
  original_keywords?: string[];
  suggested_keywords?: string[];
  cluster_summary?: {
    total_keywords: number;
    cluster_count: number;
    unclustered_count: number;
  };
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
        : (() => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              const { BLOG_WRITER_API_URL } = require('./blog-writer-api-url');
              return BLOG_WRITER_API_URL;
            } catch {
              // Fallback to dev endpoint if module can't be loaded
                  return 'https://blog-writer-api-dev-613248238610.europe-west9.run.app';
            }
          })());
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
          logger.debug(`⚠️ Retry attempt ${attempt}/${maxRetries} after ${delay}ms...`);
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
   * Now supports enhanced endpoint features from v1.3.0
   */
  async analyzeKeywords(
    keywords: string[], 
    maxSuggestionsPerKeyword: number = 75, // Default to 75 for optimal long-tail results
    location: string = 'United States',
    options?: {
      include_trends?: boolean;
      include_keyword_ideas?: boolean;
      include_relevant_pages?: boolean;
      include_serp_ai_summary?: boolean;
      competitor_domain?: string;
    }
  ): Promise<KeywordAnalysis> {
    logger.debug(`📊 Analyzing keywords (${keywords.length} keywords, max_suggestions: ${maxSuggestionsPerKeyword})...`);
    
    // Optimal batch size for long-tail research
    const OPTIMAL_BATCH_SIZE = 20;
    if (keywords.length > OPTIMAL_BATCH_SIZE) {
      throw new Error(`Cannot analyze more than ${OPTIMAL_BATCH_SIZE} keywords at once. Received ${keywords.length} keywords. Please batch your requests.`);
    }

    // Reduced default to preserve credits (was 75, now 10)
    const finalMaxSuggestions = Math.max(5, maxSuggestionsPerKeyword || 10);
    logger.debug(`📊 Using ${finalMaxSuggestions} suggestions per keyword for optimal long-tail results`);

    return await this.retryApiCall(async () => {
      const apiUrl = this.useApiRoutes 
        ? '/api/keywords/analyze'
        : `${this.baseURL}/api/v1/keywords/enhanced`;
      
      const requestBody: Record<string, unknown> = {
        keywords,
        location,
        language: 'en',
        include_serp: false,
        max_suggestions_per_keyword: finalMaxSuggestions
      };

      // Add enhanced endpoint parameters if provided
      if (options) {
        if (options.include_trends !== undefined) {
          requestBody.include_trends = options.include_trends;
        }
        if (options.include_keyword_ideas !== undefined) {
          requestBody.include_keyword_ideas = options.include_keyword_ideas;
        }
        if (options.include_relevant_pages !== undefined) {
          requestBody.include_relevant_pages = options.include_relevant_pages;
        }
        if (options.include_serp_ai_summary !== undefined) {
          requestBody.include_serp_ai_summary = options.include_serp_ai_summary;
        }
        if (options.competitor_domain) {
          requestBody.competitor_domain = options.competitor_domain;
        }
      }

      logger.debug(`📤 Sending request to ${apiUrl} with ${finalMaxSuggestions} suggestions per keyword`);

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

        logger.error(`❌ API error (${response.status}):`, errorMessage);
        logger.error(`❌ Request body:`, JSON.stringify(requestBody, null, 2));
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Debug: Log API response structure to understand search_volume location
      logger.debug('📊 API Response structure:', {
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
            logger.debug('🔍 Search volume extraction for keyword', {
              keyword,
              'kwData.search_volume': kwData.search_volume,
              'kwData.volume': kwData.volume,
              'kwData.monthly_searches': kwData.monthly_searches,
              'kwData.metadata': kwData.metadata,
              extracted: searchVolume
            });
          }
          
          filteredAnalysis[keyword] = {
            keyword: kwData.keyword || keyword,
            // Basic Metrics
            search_volume: searchVolume,
            global_search_volume: kwData.global_search_volume,
            search_volume_by_country: kwData.search_volume_by_country,
            monthly_searches: kwData.monthly_searches,
            difficulty: kwData.difficulty || 'medium',
            competition: kwData.competition ?? 0.5,
            cpc: kwData.cpc ?? null,
            cpc_currency: kwData.cpc_currency,
            cps: kwData.cps,
            clicks: kwData.clicks,
            trend_score: kwData.trend_score ?? 0,
            // Enhanced Metrics (v1.3.0)
            parent_topic: kwData.parent_topic,
            cluster_score: kwData.cluster_score,
            category_type: kwData.category_type,
            // AI Optimization (v1.3.0)
            ai_search_volume: kwData.ai_search_volume,
            ai_trend: kwData.ai_trend,
            ai_monthly_searches: kwData.ai_monthly_searches,
            // Traffic & Performance (v1.3.0)
            traffic_potential: kwData.traffic_potential,
            // SERP Features (v1.3.0)
            serp_features: kwData.serp_features,
            serp_feature_counts: kwData.serp_feature_counts,
            // Related Keywords
            related_keywords: kwData.related_keywords || [],
            long_tail_keywords: kwData.long_tail_keywords || [],
            // Additional Data (v1.3.0)
            also_rank_for: kwData.also_rank_for,
            also_talk_about: kwData.also_talk_about,
            top_competitors: kwData.top_competitors,
            primary_intent: kwData.primary_intent,
            intent_probabilities: kwData.intent_probabilities,
            first_seen: kwData.first_seen,
            last_updated: kwData.last_updated,
            // Recommendations
            recommended: kwData.recommended ?? false,
            reason: kwData.reason || '',
            // Enhanced endpoint fields (legacy, kept for backward compatibility)
            trends_data: kwData.trends_data,
            keyword_ideas: kwData.keyword_ideas,
            relevant_pages: kwData.relevant_pages,
            serp_ai_summary: kwData.serp_ai_summary,
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

      logger.debug(`✅ Analysis complete: ${Object.keys(filteredAnalysis).length} keywords, ${clusters.length} clusters`);
      
      return {
        keyword_analysis: filteredAnalysis,
        overall_score: this.calculateOverallScore(filteredAnalysis),
        recommendations: this.generateRecommendations(filteredAnalysis),
        cluster_groups: clusters,
        // Enhanced response fields (v1.3.0)
        location: data.location,
        discovery: data.discovery,
        serp_analysis: data.serp_analysis,
        serp_ai_summary: data.serp_ai_summary,
        total_keywords: data.total_keywords,
        original_keywords: data.original_keywords,
        suggested_keywords: data.suggested_keywords,
        cluster_summary: data.cluster_summary,
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
      logger.warn('Keyword extraction failed, using topic as keyword:', error);
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
        // Increase timeout to 60 seconds to account for Cloud Run cold starts
        // The server-side API route already has retry logic with 30s timeout per attempt
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword, limit, location }),
          signal: AbortSignal.timeout(60000), // Increased from 30s to 60s
        });

        if (response.ok) {
          const data = await response.json();
          const suggestions = data.keyword_suggestions || data.suggestions || [];
          allSuggestions.push(...suggestions);
        } else {
          const errorText = await response.text();
          logger.warn(`Keyword suggestions API returned ${response.status}:`, errorText);
        }
      }

      return [...new Set(allSuggestions)].slice(0, limit);
    } catch (error) {
      const isTimeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      if (isTimeout) {
        logger.error('Keyword suggestions failed: Request timed out. The API may be cold-starting. Please try again.', error);
      } else {
        logger.error('Keyword suggestions failed:', error);
      }
      return [];
    }
  }

  /**
   * Perform comprehensive blog research - REBUILT
   * Now supports enhanced endpoint features for better content quality
   */
  async performBlogResearch(
    topic: string, 
    targetAudience: string = 'general',
    userId?: string,
    location: string = 'United States',
    useEnhancedFeatures: boolean = true // Enable enhanced features by default
  ): Promise<BlogResearchResults> {
    logger.debug('🔬 Starting comprehensive blog research...');
    
    try {
      // Step 1: Extract keywords
      const extractedKeywords = await this.extractKeywords(topic);
      logger.debug('📋 Extracted keywords:', extractedKeywords);

      // Step 2: Get keyword suggestions
      const suggestedKeywords = await this.getKeywordSuggestions([topic], 150, location);
      logger.debug(`💡 Suggested keywords (${suggestedKeywords.length}):`, suggestedKeywords.slice(0, 10));

      // Combine keywords
      const allKeywords = [...new Set([...extractedKeywords, ...suggestedKeywords, topic])];
      
      // Step 3: Analyze keywords in batches (reduced for credit preservation)
      const BATCH_SIZE = 5; // Reduced from 20 to preserve credits
      const MAX_SUGGESTIONS_PER_KEYWORD = 10; // Reduced from 75 to preserve credits
      
      let keywordAnalysis: KeywordAnalysis;
      
      if (allKeywords.length > BATCH_SIZE) {
        logger.debug(`⚠️ Batching analysis: ${allKeywords.length} keywords into batches of ${BATCH_SIZE}...`);
        
        const batches: KeywordAnalysis[] = [];
        
        // Enhanced options disabled in development to preserve credits
        const enhancedOptions = false ? { // Disabled: useEnhancedFeatures
          include_trends: false, // Disabled to preserve credits
          include_keyword_ideas: false, // Disabled to preserve credits
          include_relevant_pages: false, // Disabled to preserve credits
          include_serp_ai_summary: false, // Disabled to preserve credits
        } : undefined;
        
        for (let i = 0; i < allKeywords.length; i += BATCH_SIZE) {
          const batch = allKeywords.slice(i, i + BATCH_SIZE);
          logger.debug(`📊 Analyzing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allKeywords.length / BATCH_SIZE)} (${batch.length} keywords)...`);
          
          const batchAnalysis = await this.analyzeKeywords(batch, MAX_SUGGESTIONS_PER_KEYWORD, location, enhancedOptions);
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
        
        logger.debug(`✅ Merged ${batches.length} batches: ${Object.keys(mergedAnalysis).length} keywords`);
      } else {
        // Enhanced options disabled in development to preserve credits
        const enhancedOptions = false ? { // Disabled: useEnhancedFeatures
          include_trends: false, // Disabled to preserve credits
          include_keyword_ideas: false, // Disabled to preserve credits
          include_relevant_pages: false, // Disabled to preserve credits
          include_serp_ai_summary: false, // Disabled to preserve credits
        } : undefined;
        
        keywordAnalysis = await this.analyzeKeywords(allKeywords, MAX_SUGGESTIONS_PER_KEYWORD, location, enhancedOptions);
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
      logger.error('❌ Blog research failed:', errorMessage);
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
   * Generate SEO insights - Enhanced with v1.3.0 features
   */
  generateSEOInsights(analysis: KeywordAnalysis): BlogResearchResults['seo_insights'] {
    const keywords = Object.keys(analysis.keyword_analysis);
    const primaryKeyword = keywords[0] || '';
    const primaryKeywordData = analysis.keyword_analysis[primaryKeyword];
    
    // Use SERP AI Summary for content length recommendation if available
    let contentLengthRecommendation = 2000; // Default
    if (primaryKeywordData?.serp_ai_summary?.content_depth) {
      const depth = primaryKeywordData.serp_ai_summary.content_depth;
      if (depth === 'comprehensive') {
        contentLengthRecommendation = 4000;
      } else if (depth === 'detailed') {
        contentLengthRecommendation = 3000;
      } else if (depth === 'medium') {
        contentLengthRecommendation = 2000;
      } else {
        contentLengthRecommendation = 1500;
      }
    }
    
    // Extract keyword ideas for secondary keywords
    const keywordIdeas: string[] = [];
    if (primaryKeywordData?.keyword_ideas) {
      keywordIdeas.push(...primaryKeywordData.keyword_ideas
        .slice(0, 10)
        .map(idea => idea.keyword));
    }
    
    // Combine with existing secondary keywords
    const secondaryKeywords = [
      ...keywords.slice(1, 10),
      ...keywordIdeas
    ].slice(0, 15); // Limit to 15 total
    
    return {
      primary_keyword: primaryKeyword,
      secondary_keywords: secondaryKeywords,
      content_length_recommendation: contentLengthRecommendation,
      internal_linking_opportunities: keywords.slice(0, 5)
    };
  }

  /**
   * Extract enhanced insights from keyword analysis for blog generation
   * Uses v1.3.0 enhanced endpoint features
   */
  extractEnhancedInsights(analysis: KeywordAnalysis, primaryKeyword: string): {
    trendsData?: TrendsData;
    keywordIdeas?: KeywordIdea[];
    serpAISummary?: SERPAISummary;
    relevantPages?: RelevantPage[];
    isTrending?: boolean;
    mainTopics?: string[];
    missingTopics?: string[];
    commonQuestions?: string[];
    recommendations?: string[];
  } {
    const keywordData = analysis.keyword_analysis[primaryKeyword];
    if (!keywordData) {
      return {};
    }

    return {
      trendsData: keywordData.trends_data,
      keywordIdeas: keywordData.keyword_ideas,
      serpAISummary: keywordData.serp_ai_summary,
      relevantPages: keywordData.relevant_pages,
      isTrending: keywordData.trends_data?.is_trending || false,
      mainTopics: keywordData.serp_ai_summary?.main_topics,
      missingTopics: keywordData.serp_ai_summary?.missing_topics,
      commonQuestions: keywordData.serp_ai_summary?.common_questions,
      recommendations: keywordData.serp_ai_summary?.recommendations,
    };
  }
}

// Export singleton instance
const keywordResearchService = new KeywordResearchService();
export default keywordResearchService;

