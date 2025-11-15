"use client";

import React, { useState, useEffect } from 'react';
import { Link2, Loader2, Plus, ExternalLink, CheckCircle2, X } from 'lucide-react';
import Alert from '@/components/ui/alert/Alert';
import { logger } from '@/utils/logger';

interface LinkSuggestion {
  post_id: string;
  title: string;
  excerpt?: string;
  score: number;
  suggested_anchor_text: string;
  link_type: string;
}

interface InternalLinkSuggestionsProps {
  postId: string;
  content?: string;
  onLinkAdd?: (link: { target_post_id: string; anchor_text: string; link_type: string }) => void;
  compact?: boolean;
}

export default function InternalLinkSuggestions({ 
  postId, 
  content,
  onLinkAdd,
  compact = false 
}: InternalLinkSuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addingLinks, setAddingLinks] = useState<Set<string>>(new Set());
  const [addedLinks, setAddedLinks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (postId && content) {
      loadSuggestions();
    }
  }, [postId, content]);

  const loadSuggestions = async () => {
    if (!postId || !content) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/internal-links/suggest?post_id=${postId}&content=${encodeURIComponent(content)}&limit=10`
      );
      const data = await response.json();

      if (response.ok && data.suggestions) {
        setSuggestions(data.suggestions);
      } else {
        setError(data.error || 'Failed to load link suggestions');
      }
    } catch (err: any) {
      logger.error('Error loading link suggestions:', err);
      setError('Failed to load link suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async (suggestion: LinkSuggestion) => {
    try {
      setAddingLinks(prev => new Set(prev).add(suggestion.post_id));

      const response = await fetch('/api/internal-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_post_id: postId,
          target_post_id: suggestion.post_id,
          anchor_text: suggestion.suggested_anchor_text,
          link_type: suggestion.link_type,
          is_auto_generated: true
        })
      });

      if (response.ok) {
        setAddedLinks(prev => new Set(prev).add(suggestion.post_id));
        if (onLinkAdd) {
          onLinkAdd({
            target_post_id: suggestion.post_id,
            anchor_text: suggestion.suggested_anchor_text,
            link_type: suggestion.link_type
          });
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add link');
      }
    } catch (err: any) {
      logger.error('Error adding link:', err);
      setError('Failed to add link');
    } finally {
      setAddingLinks(prev => {
        const next = new Set(prev);
        next.delete(suggestion.post_id);
        return next;
      });
    }
  };

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Internal Links
          </h3>
          <button
            onClick={loadSuggestions}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-2">
            {suggestions.slice(0, 3).map((suggestion) => (
              <div
                key={suggestion.post_id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"
              >
                <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                  {suggestion.title}
                </span>
                {addedLinks.has(suggestion.post_id) ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" />
                ) : (
                  <button
                    onClick={() => handleAddLink(suggestion)}
                    disabled={addingLinks.has(suggestion.post_id)}
                    className="ml-2 p-1 text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    {addingLinks.has(suggestion.post_id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            ))}
            {suggestions.length > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                +{suggestions.length - 3} more suggestions
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No suggestions available</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Internal Link Suggestions
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            AI-powered suggestions for internal links to improve SEO
          </p>
        </div>
        <button
          onClick={loadSuggestions}
          disabled={loading}
          className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Refresh Suggestions'
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}

      {loading && suggestions.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-12">
          <Link2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No link suggestions available. Make sure you have other published posts.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.post_id}
              className={`p-4 border rounded-lg transition-colors ${
                addedLinks.has(suggestion.post_id)
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {suggestion.title}
                    </h4>
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                      Score: {suggestion.score}
                    </span>
                  </div>
                  {suggestion.excerpt && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {suggestion.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Anchor: &quot;{suggestion.suggested_anchor_text}&quot;</span>
                    <span>Type: {suggestion.link_type}</span>
                  </div>
                </div>
                <div className="ml-4">
                  {addedLinks.has(suggestion.post_id) ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm">Added</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddLink(suggestion)}
                      disabled={addingLinks.has(suggestion.post_id)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                    >
                      {addingLinks.has(suggestion.post_id) ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Add Link
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


