"use client";

import { useState, useEffect } from "react";
import { 
  MagnifyingGlassIcon, 
  ClockIcon, 
  ChartBarIcon,
  DocumentTextIcon,
  TrashIcon,
  EyeIcon
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { useKeywordStorage } from "@/hooks/useKeywordStorage";
import type { KeywordHistory } from "@/lib/keyword-storage";

export default function KeywordResearchHistoryPage() {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const { researchSessions, loading, error, loadResearchSessions } = useKeywordStorage(userId);
  const [selectedSession, setSelectedSession] = useState<KeywordHistory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Get current user ID
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      }
    });
  }, []);

  const filteredSessions = researchSessions.filter(session =>
    session.topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">📊 Keyword Research History</h1>
            <p className="text-blue-100">
              View and manage your saved keyword research sessions
            </p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{researchSessions.length}</div>
              <div className="text-sm text-blue-100">Research Sessions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border-0 bg-transparent focus:ring-0 text-gray-700 dark:text-gray-300 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredSessions.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Research Sessions Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Start a new keyword research session from the drafts page to see results here.
          </p>
        </div>
      )}

      {/* Research Sessions List */}
      {!loading && !error && filteredSessions.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {session.topic}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      {formatDate(session.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <DocumentTextIcon className="w-4 h-4" />
                      {session.keywords?.length || 0} Keywords
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSession(session)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  <EyeIcon className="w-4 h-4" />
                  View Details
                </button>
              </div>

              {/* Keywords Preview */}
              {session.keywords && session.keywords.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Top Keywords:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {session.keywords.slice(0, 5).map((keyword: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {keyword.keyword}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(keyword.difficulty)}`}>
                          {keyword.difficulty}
                        </span>
                      </div>
                    ))}
                    {session.keywords.length > 5 && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 px-2">
                        +{session.keywords.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Research Results Summary */}
              {session.research_results && typeof session.research_results === 'object' && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(session.research_results as any).keyword_analysis && (
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {(session.research_results as any).keyword_analysis.overall_score || 0}
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-300">SEO Score</div>
                      </div>
                    )}
                    {(session.research_results as any).title_suggestions && (
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {(session.research_results as any).title_suggestions.length || 0}
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300">Title Suggestions</div>
                      </div>
                    )}
                    {(session.research_results as any).seo_insights && (
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-sm font-bold text-purple-600 dark:text-purple-400 truncate">
                          {(session.research_results as any).seo_insights.primary_keyword || 'N/A'}
                        </div>
                        <div className="text-xs text-purple-700 dark:text-purple-300">Primary Keyword</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selected Session Modal/Details */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Research Details: {selectedSession.topic}
              </h2>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Keywords Table */}
            {selectedSession.keywords && selectedSession.keywords.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Keywords
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Keyword</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Volume</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Difficulty</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Competition</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Recommended</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSession.keywords.map((keyword: any, index: number) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{keyword.keyword}</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{keyword.search_volume || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(keyword.difficulty)}`}>
                              {keyword.difficulty}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                            {Math.round(keyword.competition * 100)}%
                          </td>
                          <td className="py-3 px-4">
                            {keyword.recommended ? (
                              <span className="text-green-600 dark:text-green-400">✓ Yes</span>
                            ) : (
                              <span className="text-gray-400">✗ No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Research Results */}
            {selectedSession.research_results && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Research Results
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(selectedSession.research_results, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


