/**
 * Enhanced Keyword Storage Service
 * Handles storage and retrieval of traditional and AI keyword research results
 * with 7-day caching support
 */

import { createClient } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';

export type SearchType = 'traditional' | 'ai' | 'both';

export interface TraditionalKeywordData {
  keyword: string;
  search_volume: number;
  global_search_volume?: number;
  keyword_difficulty: number;
  competition: number;
  cpc?: number;
  cps?: number;
  traffic_potential?: number;
  search_intent?: 'informational' | 'navigational' | 'commercial' | 'transactional' | 'local';
  trend_score?: number;
  growth_rate_12m?: number;
  monthly_searches?: Array<{ month: string; search_volume: number }>;
  serp_features?: string[];
  serp_feature_counts?: Record<string, number>;
  parent_topic?: string;
  category_type?: 'topic' | 'question' | 'action' | 'entity';
  related_keywords?: string[];
}

export interface AIKeywordData {
  keyword: string;
  ai_search_volume: number;
  ai_optimization_score: number;
  ai_recommended: boolean;
  ai_mentions_count: number;
  ai_platform?: 'chat_gpt' | 'google';
  ai_trend?: number;
  ai_monthly_searches?: Array<{ month: string; volume: number }>;
  ranking_score?: number;
  opportunity_score?: number;
  reason?: string;
}

export interface RelatedTerm {
  keyword: string;
  search_volume: number;
  keyword_difficulty: number;
  competition: number;
  cpc?: number;
  search_intent?: string;
  parent_topic?: string;
}

export interface KeywordResearchResult {
  keyword: string;
  location: string;
  language: string;
  search_type: SearchType;
  traditional_data?: TraditionalKeywordData;
  ai_data?: AIKeywordData;
  related_terms?: RelatedTerm[];
  matching_terms?: RelatedTerm[];
  comprehensive_data?: Record<string, unknown>;
  full_api_response?: Record<string, unknown>;
}

class EnhancedKeywordStorageService {
  private readonly CACHE_DURATION_DAYS = 90;

  /**
   * Check if keyword data exists in cache (not expired)
   */
  async getCachedKeyword(
    keyword: string,
    location: string = 'United States',
    language: string = 'en',
    searchType: SearchType = 'traditional',
    userId?: string
  ): Promise<KeywordResearchResult | null> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .rpc('get_cached_keyword', {
          p_keyword: keyword.toLowerCase().trim(),
          p_location: location,
          p_language: language,
          p_search_type: searchType,
          p_user_id: userId || null,
        });

      if (error) {
        logger.warn('Error fetching cached keyword', { error, keyword });
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const cached = data[0];
      
      // Check if cache is still valid
      const expiresAt = new Date(cached.expires_at);
      if (expiresAt < new Date()) {
        logger.debug('Cache expired for keyword', { keyword, expiresAt });
        return null;
      }

      logger.debug('Cache hit for keyword', { keyword, cached_at: cached.cached_at });
      
      return {
        keyword: cached.keyword,
        location,
        language,
        search_type: searchType,
        traditional_data: cached.traditional_data,
        ai_data: cached.ai_data,
        related_terms: cached.related_terms,
        comprehensive_data: cached.comprehensive_data,
      };
    } catch (error) {
      logger.error('Error getting cached keyword', { error, keyword });
      return null;
    }
  }

  /**
   * Store keyword data in cache
   */
  async cacheKeyword(
    keyword: string,
    data: Partial<KeywordResearchResult>,
    userId?: string,
    orgId?: string
  ): Promise<boolean> {
    try {
      const supabase = createClient();
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.CACHE_DURATION_DAYS);

      const cacheData = {
        keyword: keyword.toLowerCase().trim(),
        location: data.location || 'United States',
        language: data.language || 'en',
        search_type: data.search_type || 'traditional',
        traditional_data: data.traditional_data || null,
        ai_data: data.ai_data || null,
        related_terms: data.related_terms || [],
        comprehensive_data: data.comprehensive_data || null,
        expires_at: expiresAt.toISOString(),
        user_id: userId || null,
        org_id: orgId || null,
      };

      const { error } = await supabase
        .from('keyword_cache')
        .upsert(cacheData, {
          onConflict: 'keyword,location,language,search_type,COALESCE(user_id, \'00000000-0000-0000-0000-000000000000\'::uuid)',
        });

      if (error) {
        logger.error('Error caching keyword', { error, keyword });
        return false;
      }

      logger.debug('Keyword cached successfully', { keyword, expires_at: expiresAt });
      return true;
    } catch (error) {
      logger.error('Error caching keyword', { error, keyword });
      return false;
    }
  }

  /**
   * Store full keyword research result in database
   */
  async storeKeywordResearch(
    userId: string,
    result: KeywordResearchResult,
    orgId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const supabase = createClient();

      // Store main research result
      const researchData = {
        user_id: userId,
        org_id: orgId || null,
        keyword: result.keyword.toLowerCase().trim(),
        location: result.location,
        language: result.language,
        search_type: result.search_type,
        traditional_keyword_data: result.traditional_data || null,
        traditional_metrics: result.traditional_data ? {
          search_volume: result.traditional_data.search_volume,
          keyword_difficulty: result.traditional_data.keyword_difficulty,
          competition: result.traditional_data.competition,
          cpc: result.traditional_data.cpc,
          traffic_potential: result.traditional_data.traffic_potential,
        } : null,
        traditional_serp_data: result.traditional_data?.serp_features ? {
          serp_features: result.traditional_data.serp_features,
          serp_feature_counts: result.traditional_data.serp_feature_counts,
        } : null,
        traditional_trends: result.traditional_data?.monthly_searches ? {
          monthly_searches: result.traditional_data.monthly_searches,
          trend_score: result.traditional_data.trend_score,
          growth_rate_12m: result.traditional_data.growth_rate_12m,
        } : null,
        ai_keyword_data: result.ai_data || null,
        ai_metrics: result.ai_data ? {
          ai_search_volume: result.ai_data.ai_search_volume,
          ai_optimization_score: result.ai_data.ai_optimization_score,
          ai_recommended: result.ai_data.ai_recommended,
          ai_mentions_count: result.ai_data.ai_mentions_count,
          ai_platform: result.ai_data.ai_platform,
          ranking_score: result.ai_data.ranking_score,
          opportunity_score: result.ai_data.opportunity_score,
        } : null,
        ai_llm_mentions: result.ai_data?.ai_mentions_count ? {
          mentions_count: result.ai_data.ai_mentions_count,
          platform: result.ai_data.ai_platform,
        } : null,
        related_terms: result.related_terms || [],
        matching_terms: result.matching_terms || [],
        aggregated_data: result.comprehensive_data || null,
        full_api_response: result.full_api_response || null,
      };

      const { data: researchResult, error: researchError } = await supabase
        .from('keyword_research_results')
        .upsert(researchData, {
          onConflict: 'user_id,keyword,location,language,search_type',
        })
        .select('id')
        .single();

      if (researchError) {
        logger.error('Error storing research result', { error: researchError, keyword: result.keyword });
        return { success: false, error: researchError.message };
      }

      const researchResultId = researchResult?.id;

      // Store individual keyword terms
      if (result.traditional_data || result.ai_data) {
        const termData = {
          research_result_id: researchResultId,
          user_id: userId,
          org_id: orgId || null,
          keyword: result.keyword,
          keyword_normalized: result.keyword.toLowerCase().trim(),
          parent_keyword: result.keyword,
          search_volume: result.traditional_data?.search_volume || 0,
          global_search_volume: result.traditional_data?.global_search_volume || 0,
          keyword_difficulty: result.traditional_data?.keyword_difficulty || null,
          competition: result.traditional_data?.competition || null,
          cpc: result.traditional_data?.cpc || null,
          cps: result.traditional_data?.cps || null,
          traffic_potential: result.traditional_data?.traffic_potential || 0,
          search_intent: result.traditional_data?.search_intent || null,
          trend_score: result.traditional_data?.trend_score || null,
          growth_rate_12m: result.traditional_data?.growth_rate_12m || null,
          monthly_searches: result.traditional_data?.monthly_searches || null,
          serp_features: result.traditional_data?.serp_features || null,
          serp_feature_counts: result.traditional_data?.serp_feature_counts || null,
          ai_search_volume: result.ai_data?.ai_search_volume || 0,
          ai_optimization_score: result.ai_data?.ai_optimization_score || null,
          ai_recommended: result.ai_data?.ai_recommended || false,
          ai_mentions_count: result.ai_data?.ai_mentions_count || 0,
          ai_platform: result.ai_data?.ai_platform || null,
          ai_trend: result.ai_data?.ai_trend || null,
          ai_monthly_searches: result.ai_data?.ai_monthly_searches || null,
          parent_topic: result.traditional_data?.parent_topic || result.ai_data?.reason || null,
          category_type: result.traditional_data?.category_type || null,
          related_keywords: result.traditional_data?.related_keywords || [],
          is_related_term: false,
          is_matching_term: false,
          is_long_tail: (result.keyword.split(' ').length > 3),
          search_type: result.search_type,
          location: result.location,
          language: result.language,
        };

        await supabase
          .from('keyword_terms')
          .upsert(termData, {
            onConflict: 'user_id,keyword_normalized,location,language,search_type',
          });
      }

      // Store related terms
      if (result.related_terms && result.related_terms.length > 0) {
        const relatedTermsData = result.related_terms.map(term => ({
          research_result_id: researchResultId,
          user_id: userId,
          org_id: orgId || null,
          keyword: term.keyword,
          keyword_normalized: term.keyword.toLowerCase().trim(),
          parent_keyword: result.keyword,
          search_volume: term.search_volume,
          keyword_difficulty: term.keyword_difficulty,
          competition: term.competition,
          cpc: term.cpc || null,
          search_intent: term.search_intent || null,
          parent_topic: term.parent_topic || null,
          is_related_term: true,
          is_matching_term: false,
          is_long_tail: (term.keyword.split(' ').length > 3),
          search_type: result.search_type,
          location: result.location,
          language: result.language,
        }));

        await supabase
          .from('keyword_terms')
          .upsert(relatedTermsData, {
            onConflict: 'user_id,keyword_normalized,location,language,search_type',
          });
      }

      // Store matching terms
      if (result.matching_terms && result.matching_terms.length > 0) {
        const matchingTermsData = result.matching_terms.map(term => ({
          research_result_id: researchResultId,
          user_id: userId,
          org_id: orgId || null,
          keyword: term.keyword,
          keyword_normalized: term.keyword.toLowerCase().trim(),
          parent_keyword: result.keyword,
          search_volume: term.search_volume,
          keyword_difficulty: term.keyword_difficulty,
          competition: term.competition,
          cpc: term.cpc || null,
          search_intent: term.search_intent || null,
          parent_topic: term.parent_topic || null,
          is_related_term: false,
          is_matching_term: true,
          is_long_tail: (term.keyword.split(' ').length > 3),
          search_type: result.search_type,
          location: result.location,
          language: result.language,
        }));

        await supabase
          .from('keyword_terms')
          .upsert(matchingTermsData, {
            onConflict: 'user_id,keyword_normalized,location,language,search_type',
          });
      }

      logger.debug('Keyword research stored successfully', { keyword: result.keyword, id: researchResultId });
      
      return { success: true, id: researchResultId };
    } catch (error) {
      logger.error('Error storing keyword research', { error, keyword: result.keyword });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Retrieve keyword research result from database
   */
  async getKeywordResearch(
    userId: string,
    keyword: string,
    location: string = 'United States',
    language: string = 'en',
    searchType: SearchType = 'traditional'
  ): Promise<KeywordResearchResult | null> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('keyword_research_results')
        .select('*')
        .eq('user_id', userId)
        .eq('keyword', keyword.toLowerCase().trim())
        .eq('location', location)
        .eq('language', language)
        .eq('search_type', searchType)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      // Update access tracking
      await supabase
        .from('keyword_research_results')
        .update({ accessed_at: new Date().toISOString() })
        .eq('id', data.id);

      return {
        keyword: data.keyword,
        location: data.location,
        language: data.language,
        search_type: data.search_type,
        traditional_data: data.traditional_keyword_data,
        ai_data: data.ai_keyword_data,
        related_terms: data.related_terms,
        matching_terms: data.matching_terms,
        comprehensive_data: data.aggregated_data,
        full_api_response: data.full_api_response,
      };
    } catch (error) {
      logger.error('Error retrieving keyword research', { error, keyword });
      return null;
    }
  }

  /**
   * Flush cache for a user (or all cache if userId is not provided)
   */
  async flushCache(
    userId?: string,
    keyword?: string,
    searchType?: SearchType
  ): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase.rpc('flush_keyword_cache', {
        p_user_id: userId || null,
        p_keyword: keyword ? keyword.toLowerCase().trim() : null,
        p_search_type: searchType || null,
      });

      if (error) {
        logger.error('Error flushing cache', { error, userId, keyword });
        return { success: false, error: error.message };
      }

      const deletedCount = data || 0;
      logger.debug('Cache flushed successfully', { userId, keyword, deletedCount });
      
      return { success: true, deletedCount };
    } catch (error) {
      logger.error('Error flushing cache', { error, userId, keyword });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get all keyword terms for a user (with filters)
   */
  async getUserKeywordTerms(
    userId: string,
    filters?: {
      searchType?: SearchType;
      location?: string;
      language?: string;
      parentKeyword?: string;
      isRelatedTerm?: boolean;
      isMatchingTerm?: boolean;
      minSearchVolume?: number;
      maxDifficulty?: number;
    }
  ): Promise<any[]> {
    try {
      const supabase = createClient();

      let query = supabase
        .from('keyword_terms')
        .select('*')
        .eq('user_id', userId)
        .order('search_volume', { ascending: false });

      if (filters?.searchType) {
        query = query.eq('search_type', filters.searchType);
      }
      if (filters?.location) {
        query = query.eq('location', filters.location);
      }
      if (filters?.language) {
        query = query.eq('language', filters.language);
      }
      if (filters?.parentKeyword) {
        query = query.eq('parent_keyword', filters.parentKeyword);
      }
      if (filters?.isRelatedTerm !== undefined) {
        query = query.eq('is_related_term', filters.isRelatedTerm);
      }
      if (filters?.isMatchingTerm !== undefined) {
        query = query.eq('is_matching_term', filters.isMatchingTerm);
      }
      if (filters?.minSearchVolume) {
        query = query.gte('search_volume', filters.minSearchVolume);
      }
      if (filters?.maxDifficulty) {
        query = query.lte('keyword_difficulty', filters.maxDifficulty);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error retrieving user keyword terms', { error });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error retrieving user keyword terms', { error });
      return [];
    }
  }
}

export const enhancedKeywordStorage = new EnhancedKeywordStorageService();
export default enhancedKeywordStorage;

