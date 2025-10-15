"use client";

import { createClient } from '@/lib/supabase/client';

export interface StoredKeyword {
  id: string;
  user_id: string;
  keyword: string;
  search_volume?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  competition: number;
  cpc?: number;
  trend_score?: number;
  recommended: boolean;
  reason: string;
  related_keywords: string[];
  long_tail_keywords: string[];
  created_at: string;
  updated_at: string;
}

export interface KeywordHistory {
  id: string;
  user_id: string;
  topic: string;
  keywords: StoredKeyword[];
  research_results: Record<string, unknown>;
  created_at: string;
}

class KeywordStorageService {
  /**
   * Save extracted keywords to database for user retrieval
   */
  async saveKeywords(
    userId: string,
    topic: string,
    keywords: Array<{
      keyword: string;
      search_volume?: number;
      difficulty: 'easy' | 'medium' | 'hard';
      competition: number;
      cpc?: number;
      trend_score?: number;
      recommended: boolean;
      reason: string;
      related_keywords: string[];
      long_tail_keywords: string[];
    }>,
    researchResults?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('💾 Saving keywords to database for user:', userId);
      
      // Create a fresh Supabase client with auth context
      const supabase = createClient();
      
      // First, save the research session
      const { data: sessionData, error: sessionError } = await supabase
        .from('keyword_research_sessions')
        .insert({
          user_id: userId,
          org_id: userId, // Using userId as org_id for now since we don't have org structure yet
          primary_keyword: topic,
          location_targeting: 'United States',
          language_code: 'en',
          total_keywords: keywords.length,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Failed to save research session:', sessionError);
        return { success: false, error: sessionError.message };
      }

      // Then save individual keywords
      const keywordInserts = keywords.map(keyword => ({
        session_id: sessionData.id,
        org_id: userId, // Using userId as org_id for now
        keyword: keyword.keyword,
        search_volume: keyword.search_volume,
        keyword_difficulty: keyword.difficulty === 'easy' ? 20 : keyword.difficulty === 'medium' ? 50 : 80,
        competition_level: keyword.competition < 0.3 ? 'LOW' : keyword.competition < 0.7 ? 'MEDIUM' : 'HIGH',
        cpc: keyword.cpc,
        trend_score: keyword.trend_score,
        easy_win_score: keyword.recommended ? 70 : 30,
        high_value_score: keyword.trend_score || 50,
        pillar_potential: keyword.recommended && (keyword.search_volume || 0) > 1000,
        supporting_potential: keyword.recommended && (keyword.search_volume || 0) > 100,
        related_keywords: keyword.related_keywords,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: keywordsError } = await supabase
        .from('research_keywords')
        .insert(keywordInserts);

      if (keywordsError) {
        console.error('Failed to save keywords:', keywordsError);
        return { success: false, error: keywordsError.message };
      }

      console.log('✅ Successfully saved keywords to database');
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error saving keywords:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Retrieve user's keyword history
   */
  async getUserKeywords(userId: string, limit: number = 50): Promise<StoredKeyword[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('research_keywords')
        .select(`
          *,
          keyword_research_sessions!inner(user_id)
        `)
        .eq('keyword_research_sessions.user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to retrieve user keywords:', error);
        return [];
      }

      return data || [];
    } catch (error: unknown) {
      console.error('Error retrieving user keywords:', error);
      return [];
    }
  }

  /**
   * Get user's research sessions
   */
  async getUserResearchSessions(userId: string, limit: number = 20): Promise<KeywordHistory[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('keyword_research_sessions')
        .select(`
          *,
          research_keywords (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to retrieve research sessions:', error);
        return [];
      }

      return data?.map(session => ({
        id: session.id,
        user_id: session.user_id,
        topic: session.primary_keyword,
        keywords: session.research_keywords || [],
        research_results: {},
        created_at: session.created_at,
      })) || [];
    } catch (error: unknown) {
      console.error('Error retrieving research sessions:', error);
      return [];
    }
  }

  /**
   * Get keywords by topic
   */
  async getKeywordsByTopic(userId: string, topic: string): Promise<StoredKeyword[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_keywords')
        .select(`
          *,
          keyword_research_sessions!inner(topic)
        `)
        .eq('user_id', userId)
        .eq('keyword_research_sessions.topic', topic)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to retrieve keywords by topic:', error);
        return [];
      }

      return data || [];
    } catch (error: unknown) {
      console.error('Error retrieving keywords by topic:', error);
      return [];
    }
  }

  /**
   * Update keyword data
   */
  async updateKeyword(keywordId: string, updates: Partial<StoredKeyword>): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('user_keywords')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', keywordId);

      if (error) {
        console.error('Failed to update keyword:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error updating keyword:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Delete keyword
   */
  async deleteKeyword(keywordId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('user_keywords')
        .delete()
        .eq('id', keywordId);

      if (error) {
        console.error('Failed to delete keyword:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error deleting keyword:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Search keywords
   */
  async searchKeywords(userId: string, query: string): Promise<StoredKeyword[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_keywords')
        .select('*')
        .eq('user_id', userId)
        .ilike('keyword', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Failed to search keywords:', error);
        return [];
      }

      return data || [];
    } catch (error: unknown) {
      console.error('Error searching keywords:', error);
      return [];
    }
  }
}

// Create singleton instance
const keywordStorageService = new KeywordStorageService();

export default keywordStorageService;
export { KeywordStorageService };
