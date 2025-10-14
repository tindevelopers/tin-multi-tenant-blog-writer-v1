'use client';

import React, { useState, useEffect } from 'react';
import { KeywordStorageService, type KeywordHistory, type StoredKeyword } from '@/lib/keyword-storage';
import { createClient } from '@/lib/supabase/client';
import { History, Search, TrendingUp, Target, Eye, Calendar, User } from 'lucide-react';
import Alert from '@/components/ui/alert/Alert';

export default function KeywordHistoryPage() {
  const [keywordHistory, setKeywordHistory] = useState<KeywordHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<KeywordHistory | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    initializeAuth();
    
    // Listen for auth state changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        loadKeywordHistory(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setKeywordHistory([]);
        setError('Please log in to view your research history');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initializeAuth = async () => {
    try {
      const supabase = createClient();
      
      // First, check if there's a session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setError('Authentication error: ' + sessionError.message);
        setLoading(false);
        return;
      }

      if (!session) {
        setError('Please log in to view your research history');
        setLoading(false);
        return;
      }

      // Get user from session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('User error:', userError);
        setError('Authentication error: ' + userError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setError('Please log in to view your research history');
        setLoading(false);
        return;
      }

      console.log('✅ User authenticated:', user.id);
      setUser(user);
      await loadKeywordHistory(user);
    } catch (err) {
      console.error('Initialization error:', err);
      setError('Failed to initialize authentication');
      setLoading(false);
    }
  };

  const loadKeywordHistory = async (userData: any) => {
    try {
      setLoading(true);
      
      if (!userData) {
        setError('User not authenticated');
        return;
      }

      const keywordStorage = new KeywordStorageService();
      const history = await keywordStorage.getKeywordHistory(userData.id);
      setKeywordHistory(history);
    } catch (err) {
      console.error('Error loading keyword history:', err);
      setError('Failed to load keyword history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEasyWinsCount = (keywords: StoredKeyword[]) => {
    return keywords.filter(k => k.difficulty === 'easy' && k.competition < 0.3).length;
  };

  const getHighValueCount = (keywords: StoredKeyword[]) => {
    return keywords.filter(k => k.search_volume && k.search_volume > 1000).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading research history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border-2 border-green-600 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 text-green-800">
              <History className="h-6 w-6" />
              Research History
            </h1>
            <p className="text-green-700">
              View and manage your past keyword research sessions
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-800">{keywordHistory.length}</div>
            <div className="text-sm text-green-700">Research Sessions</div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert 
          variant="error" 
          title="Error Loading History" 
          message={error} 
        />
      )}

      {/* Empty State */}
      {keywordHistory.length === 0 && !loading && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-600 dark:text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Research History Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Start researching keywords to build your research history. Your keyword research sessions will be saved here for future reference.
            </p>
            <a
              href="/admin/seo"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Search className="h-4 w-4" />
              Start Research
            </a>
          </div>
        </div>
      )}

      {/* Research History List */}
      {keywordHistory.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {keywordHistory.map((history) => (
            <div key={history.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {history.topic}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(history.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {history.keywords.length} keywords
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedHistory(history)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-700 border border-green-300 rounded-lg hover:bg-green-50"
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {history.keywords.length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {getEasyWinsCount(history.keywords)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Easy Wins</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {getHighValueCount(history.keywords)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">High Value</div>
                </div>
              </div>

              {/* Top Keywords Preview */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Top Keywords:</h4>
                <div className="flex flex-wrap gap-1">
                  {history.keywords.slice(0, 5).map((keyword) => (
                    <span
                      key={keyword.id}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                    >
                      {keyword.keyword}
                    </span>
                  ))}
                  {history.keywords.length > 5 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded text-xs">
                      +{history.keywords.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected History Details Modal */}
      {selectedHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Research Details: {selectedHistory.topic}
                </h2>
                <button
                  onClick={() => setSelectedHistory(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Research conducted on {formatDate(selectedHistory.created_at)}
              </p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedHistory.keywords.map((keyword) => (
                  <div key={keyword.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {keyword.keyword}
                      </h4>
                      {keyword.difficulty === 'easy' && (
                        <span className="w-2 h-2 bg-green-500 rounded-full" title="Easy Win"></span>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      {keyword.search_volume && (
                        <div>Volume: {keyword.search_volume.toLocaleString()}</div>
                      )}
                      <div>Difficulty: {keyword.difficulty}</div>
                      <div>Competition: {Math.round(keyword.competition * 100)}%</div>
                      {keyword.cpc && (
                        <div>CPC: ${keyword.cpc.toFixed(2)}</div>
                      )}
                    </div>

                    {keyword.recommended && (
                      <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                        ✓ Recommended: {keyword.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}