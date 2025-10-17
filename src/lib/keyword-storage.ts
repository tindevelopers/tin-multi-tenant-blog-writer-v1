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
      console.log('💾 Topic:', topic);
      console.log('💾 Keywords count:', keywords.length);
      console.log('💾 First few keywords:', keywords.slice(0, 3));
      
      // Create a fresh Supabase client with auth context
      const supabase = createClient();
      
      // Test auth first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('💾 Auth check:', { userId: user?.id, error: authError?.message });
      
      if (authError) {
        console.error('💾 Auth error:', authError);
        return { success: false, error: authError.message };
      }
      
      if (!user) {
        console.error('💾 No user found');
        return { success: false, error: 'User not authenticated' };
      }
      
      // First, save the research session
      console.log('💾 Inserting research session...');
      
      // Let's try a simpler approach first - test with minimal data
      const sessionData = {
        user_id: userId,
        topic: topic,
        research_results: {
          total_keywords: keywords.length,
          location_targeting: 'United States',
          language_code: 'en',
          generated_at: new Date().toISOString()
        }
      };
      console.log('💾 Session data:', sessionData);
      
      // Test the insert step by step
      console.log('💾 Testing table access...');
      const { data: tableTest, error: tableError } = await supabase
        .from('keyword_research_sessions')
        .select('id')
        .limit(1);
      
      console.log('💾 Table access test:', { data: tableTest, error: tableError });
      
      if (tableError) {
        console.error('❌ Cannot access keyword_research_sessions table:', tableError);
        return { success: false, error: `Table access error: ${tableError.message}` };
      }
      
      console.log('✅ Table access successful');
      
      console.log('💾 Attempting insert...');
      const { data: sessionResult, error: sessionError } = await supabase
        .from('keyword_research_sessions')
        .insert(sessionData)
        .select()
        .single();

      console.log('💾 Session insert result:', { 
        data: sessionResult, 
        error: sessionError,
        errorCode: sessionError?.code,
        errorDetails: sessionError?.details,
        errorHint: sessionError?.hint
      });

      if (sessionError) {
        console.error('❌ Failed to save research session:', sessionError);
        return { success: false, error: sessionError.message || JSON.stringify(sessionError) };
      }
      
      console.log('✅ Research session saved:', sessionResult.id);

      // Then save individual keywords
      const keywordInserts = keywords.map(keyword => ({
        user_id: userId,
        research_session_id: sessionResult.id,
        keyword: keyword.keyword,
        search_volume: keyword.search_volume || 0,
        difficulty: keyword.difficulty === 'easy' ? 'easy' : keyword.difficulty === 'medium' ? 'medium' : 'hard',
        competition: parseFloat(keyword.competition) || 0.5,
        cpc: parseFloat(keyword.cpc) || 0,
        trend_score: parseFloat(keyword.trend_score) || 0,
        recommended: keyword.recommended || false,
        reason: keyword.reason || '',
        related_keywords: keyword.related_keywords || [],
        long_tail_keywords: keyword.long_tail_keywords || [],
      }));

      console.log('💾 Inserting keywords...');
      console.log('💾 First keyword insert:', keywordInserts[0]);
      
      const { data: keywordResult, error: keywordsError } = await supabase
        .from('user_keywords')
        .insert(keywordInserts)
        .select();

      console.log('💾 Keywords insert result:', { 
        count: keywordResult?.length, 
        error: keywordsError?.message 
      });

      if (keywordsError) {
        console.error('❌ Failed to save keywords:', keywordsError);
        return { success: false, error: keywordsError.message };
      }

      console.log('✅ Successfully saved keywords to database:', keywordResult?.length, 'keywords');
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
          user_keywords (*)
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
        topic: session.topic,
        keywords: session.user_keywords || [],
        research_results: session.research_results || {},
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
