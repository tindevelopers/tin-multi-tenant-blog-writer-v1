/**
 * Keyword Research Service with Automatic Storage and Caching
 * 
 * Wraps existing keyword research services and adds:
 * - 7-day caching
 * - Automatic database storage
 * - Traditional vs AI search support
 * - Related terms storage
 */

import { createClient } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import keywordResearchService from '@/lib/keyword-research';
import type { KeywordData, KeywordAnalysis } from '@/lib/keyword-research';
import enhancedKeywordStorage, { SearchType, TraditionalKeywordData, AIKeywordData, RelatedTerm } from '@/lib/keyword-storage-enhanced';
import { blogWriterAPI } from '@/lib/blog-writer-api';

export interface KeywordResearchWithStorageOptions {
  searchType?: SearchType;
  location?: string;
  language?: string;
  autoStore?: boolean; // Default: true
  useCache?: boolean; // Default: true
  includeRelatedTerms?: boolean; // Default: true for traditional search
}

export interface KeywordResearchWithStorageResult {
  keyword: string;
  traditionalData?: TraditionalKeywordData;
  aiData?: AIKeywordData;
  relatedTerms?: RelatedTerm[];
  matchingTerms?: RelatedTerm[];
  source: 'cache' | 'database' | 'api';
  cached?: boolean;
}

class KeywordResearchWithStorageService {
  /**
   * Research keyword with automatic caching and storage
   */
  async researchKeyword(
    keyword: string,
    options: KeywordResearchWithStorageOptions = {}
  ): Promise<KeywordResearchWithStorageResult> {
    const {
      searchType = 'traditional',
      location = 'United States',
      language = 'en',
      autoStore = true,
      useCache = true,
      includeRelatedTerms = true,
    } = options;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Step 1: Check cache if enabled
    if (useCache && userId) {
      const cached = await enhancedKeywordStorage.getCachedKeyword(
        keyword,
        location,
        language,
        searchType,
        userId
      );

      if (cached) {
        logger.debug('Using cached keyword data', { keyword, source: 'cache' });
        return {
          keyword,
          traditionalData: cached.traditional_data,
          aiData: cached.ai_data,
          relatedTerms: cached.related_terms,
          matchingTerms: cached.matching_terms,
          source: 'cache',
          cached: true,
        };
      }
    }

    // Step 2: Check database
    if (userId) {
      const stored = await enhancedKeywordStorage.getKeywordResearch(
        userId,
        keyword,
        location,
        language,
        searchType
      );

      if (stored) {
        logger.debug('Using stored keyword data', { keyword, source: 'database' });
        
        // Re-cache if expired
        if (useCache) {
          await enhancedKeywordStorage.cacheKeyword(keyword, stored, userId);
        }

        return {
          keyword,
          traditionalData: stored.traditional_data,
          aiData: stored.ai_data,
          relatedTerms: stored.related_terms,
          matchingTerms: stored.matching_terms,
          source: 'database',
          cached: false,
        };
      }
    }

    // Step 3: Fetch from API
    logger.debug('Fetching keyword data from API', { keyword, searchType });

    const result: KeywordResearchWithStorageResult = {
      keyword,
      source: 'api',
      cached: false,
    };

    // Fetch traditional data if needed
    if (searchType === 'traditional' || searchType === 'both') {
      try {
        const traditionalAnalysis = await keywordResearchService.analyzeKeywords(
          [keyword],
          50, // max suggestions
          location,
          {
            include_trends: true,
            include_keyword_ideas: includeRelatedTerms,
          }
        );

        if (traditionalAnalysis.keyword_analysis && Object.keys(traditionalAnalysis.keyword_analysis).length > 0) {
          const keywordData = traditionalAnalysis.keyword_analysis[keyword.toLowerCase()];
          
          if (keywordData) {
            result.traditionalData = {
              keyword,
              search_volume: keywordData.search_volume || 0,
              global_search_volume: keywordData.global_search_volume,
              keyword_difficulty: keywordData.keyword_difficulty || 0,
              competition: keywordData.competition || 0,
              cpc: keywordData.cpc,
              cps: keywordData.cps,
              traffic_potential: keywordData.traffic_potential,
              search_intent: keywordData.primary_intent as any,
              trend_score: keywordData.trend_score,
              growth_rate_12m: keywordData.monthly_searches ? this.calculateGrowthRate(keywordData.monthly_searches) : undefined,
              monthly_searches: keywordData.monthly_searches?.map((m: any) => ({
                month: m.month || m.date,
                search_volume: m.search_volume || m.volume,
              })),
              serp_features: keywordData.serp_features,
              serp_feature_counts: keywordData.serp_feature_counts,
              parent_topic: keywordData.parent_topic,
              category_type: keywordData.category_type as any,
              related_keywords: keywordData.related_keywords || [],
            };

            // Extract related terms
            if (includeRelatedTerms && traditionalAnalysis.keyword_analysis) {
              const relatedTerms: RelatedTerm[] = [];
              
              // Get related keywords from analysis
              Object.entries(traditionalAnalysis.keyword_analysis).forEach(([kw, data]: [string, any]) => {
                if (kw.toLowerCase() !== keyword.toLowerCase() && data.search_volume > 0) {
                  relatedTerms.push({
                    keyword: kw,
                    search_volume: data.search_volume || 0,
                    keyword_difficulty: data.keyword_difficulty || 0,
                    competition: data.competition || 0,
                    cpc: data.cpc,
                    search_intent: data.primary_intent,
                    parent_topic: data.parent_topic,
                  });
                }
              });

              // Also get from keyword ideas if available
              if (traditionalAnalysis.keyword_ideas) {
                traditionalAnalysis.keyword_ideas.forEach((idea: any) => {
                  if (idea.keyword && idea.keyword.toLowerCase() !== keyword.toLowerCase()) {
                    relatedTerms.push({
                      keyword: idea.keyword,
                      search_volume: idea.search_volume || 0,
                      keyword_difficulty: idea.difficulty_score || 0,
                      competition: idea.competition || 0,
                      cpc: idea.cpc,
                      parent_topic: keyword,
                    });
                  }
                });
              }

              result.relatedTerms = relatedTerms.slice(0, 50); // Limit to 50
            }
          }
        }
      } catch (error) {
        logger.error('Error fetching traditional keyword data', { error, keyword });
      }
    }

    // Fetch AI data if needed
    if (searchType === 'ai' || searchType === 'both') {
      try {
        // Use AI topic suggestions endpoint
        const aiResponse = await fetch('/api/keywords/ai-topic-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keywords: [keyword],
            location,
            language,
            include_ai_search_volume: true,
            include_llm_mentions: true,
            limit: 10,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          
          // Extract AI metrics for the keyword
          const keywordLower = keyword.toLowerCase();
          const llmMentions = aiData.ai_metrics?.llm_mentions?.[keywordLower];
          const searchVolume = aiData.ai_metrics?.search_volume?.[keywordLower];
          
          if (llmMentions || searchVolume) {
            result.aiData = {
              keyword,
              ai_search_volume: searchVolume?.ai_search_volume || llmMentions?.ai_search_volume || 0,
              ai_optimization_score: 0, // Will be calculated or fetched separately
              ai_recommended: (llmMentions?.mentions_count || 0) > 100,
              ai_mentions_count: llmMentions?.mentions_count || 0,
              ai_platform: llmMentions?.platform || 'chat_gpt',
              ai_trend: searchVolume?.ai_trend,
              ai_monthly_searches: searchVolume?.ai_monthly_searches?.map((m: any) => ({
                month: `${m.year}-${String(m.month).padStart(2, '0')}`,
                volume: m.search_volume,
              })),
            };
          }
        }
      } catch (error) {
        logger.error('Error fetching AI keyword data', { error, keyword });
      }
    }

    // Step 4: Store results if autoStore is enabled
    if (autoStore && userId && (result.traditionalData || result.aiData)) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('org_id')
          .eq('user_id', userId)
          .single();

        await enhancedKeywordStorage.storeKeywordResearch(
          userId,
          {
            keyword,
            location,
            language,
            search_type: searchType,
            traditional_data: result.traditionalData,
            ai_data: result.aiData,
            related_terms: result.relatedTerms,
            matching_terms: result.matchingTerms,
          },
          userData?.org_id
        );

        // Cache the result
        if (useCache) {
          await enhancedKeywordStorage.cacheKeyword(
            keyword,
            {
              keyword,
              location,
              language,
              search_type: searchType,
              traditional_data: result.traditionalData,
              ai_data: result.aiData,
              related_terms: result.relatedTerms,
              matching_terms: result.matchingTerms,
            },
            userId,
            userData?.org_id
          );
        }

        logger.debug('Keyword research stored successfully', { keyword });
      } catch (error) {
        logger.error('Error storing keyword research', { error, keyword });
        // Don't throw - storage failure shouldn't break the flow
      }
    }

    return result;
  }

  /**
   * Calculate growth rate from monthly searches
   */
  private calculateGrowthRate(monthlySearches: Array<{ month: string; search_volume: number }>): number {
    if (!monthlySearches || monthlySearches.length < 2) {
      return 0;
    }

    const sorted = [...monthlySearches].sort((a, b) => 
      new Date(a.month).getTime() - new Date(b.month).getTime()
    );

    const first = sorted[0].search_volume;
    const last = sorted[sorted.length - 1].search_volume;

    if (first === 0) {
      return last > 0 ? 100 : 0;
    }

    return ((last - first) / first) * 100;
  }

  /**
   * Get user's stored keywords with filters
   */
  async getUserKeywords(filters?: {
    searchType?: SearchType;
    location?: string;
    language?: string;
    parentKeyword?: string;
    minSearchVolume?: number;
    maxDifficulty?: number;
  }): Promise<any[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    return await enhancedKeywordStorage.getUserKeywordTerms(user.id, filters);
  }
}

export const keywordResearchWithStorage = new KeywordResearchWithStorageService();
export default keywordResearchWithStorage;

