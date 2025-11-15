"use client";

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ExternalLink, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

interface CompetitorDomain {
  domain: string;
  rank: number;
  keyword_count: number;
  avg_position: number;
  traffic_share: number;
  common_keywords: string[];
  unique_keywords: string[];
}

interface CompetitorAnalysisProps {
  primaryKeyword: string;
  currentDomain?: string;
  onAnalyze?: (competitorDomains: string[]) => void;
}

export function CompetitorAnalysis({
  primaryKeyword,
  currentDomain,
  onAnalyze,
}: CompetitorAnalysisProps) {
  const [competitors, setCompetitors] = useState<CompetitorDomain[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [competitorInput, setCompetitorInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!competitorInput.trim()) {
      setError('Please enter at least one competitor domain');
      return;
    }

    const domains = competitorInput
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    if (domains.length === 0) {
      setError('Please enter at least one valid competitor domain');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Call API to analyze competitors
      const response = await fetch('/api/keywords/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: primaryKeyword,
          competitors: domains,
          current_domain: currentDomain,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze competitors');
      }

      const data = await response.json();
      setCompetitors(data.competitors || []);
      onAnalyze?.(domains);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze competitors');
      console.error('Competitor analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const getTrendIcon = (value: number, isPositive: boolean) => {
    if (value > 0) {
      return isPositive ? (
        <TrendingUp className="h-4 w-4 text-green-500" />
      ) : (
        <TrendingDown className="h-4 w-4 text-red-500" />
      );
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
      >
        <ExternalLink className="h-4 w-4" />
        Competitor Analysis
      </button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Competitor Analysis</h2>
          {/* Input Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Competitor Domains (comma-separated)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                placeholder="example.com, competitor.com, another.com"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="px-6 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            {error && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Results */}
          {competitors.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Competitor Rankings for "{primaryKeyword}"
              </h3>

              <div className="space-y-3">
                {competitors.map((competitor, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-gray-400">#{competitor.rank}</span>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {competitor.domain}
                          </h4>
                          {competitor.domain === currentDomain && (
                            <span className="text-xs text-brand-600 dark:text-brand-400">(Your Domain)</span>
                          )}
                        </div>
                      </div>
                      <a
                        href={`https://${competitor.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Keywords</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {competitor.keyword_count}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Position</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {competitor.avg_position.toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Traffic Share</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {competitor.traffic_share.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Common Keywords</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {competitor.common_keywords.length}
                        </div>
                      </div>
                    </div>

                    {/* Common Keywords */}
                    {competitor.common_keywords.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Common Keywords:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {competitor.common_keywords.slice(0, 10).map((kw, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                            >
                              {kw}
                            </span>
                          ))}
                          {competitor.common_keywords.length > 10 && (
                            <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                              +{competitor.common_keywords.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Unique Keywords */}
                    {competitor.unique_keywords.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                          Unique Keywords (Opportunities):
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {competitor.unique_keywords.slice(0, 10).map((kw, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded"
                            >
                              {kw}
                            </span>
                          ))}
                          {competitor.unique_keywords.length > 10 && (
                            <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                              +{competitor.unique_keywords.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {competitors.length === 0 && !analyzing && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>Enter competitor domains and click "Analyze" to see comparison data.</p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

