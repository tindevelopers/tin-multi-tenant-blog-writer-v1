/**
 * Link Validation Panel Component
 * 
 * Validates and displays links from content metadata
 */

"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { extractLinks, validateLinks } from '@/lib/content-metadata-utils';
import type { ContentMetadata, ValidatedLink } from '@/lib/content-metadata-utils';
import { 
  LinkIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

interface LinkValidationPanelProps {
  contentMetadata: ContentMetadata | null | undefined;
  className?: string;
  lastUpdated?: string | null;
  onRefresh?: () => Promise<void> | void;
}

type LinkCategory = 'interlinks' | 'backlinks' | 'invalid';

const CATEGORY_LABELS: Record<LinkCategory, string> = {
  interlinks: 'Interlinks',
  backlinks: 'Backlinks',
  invalid: 'Invalid',
};

export function LinkValidationPanel({
  contentMetadata,
  className = '',
  lastUpdated,
  onRefresh,
}: LinkValidationPanelProps) {
  const links = extractLinks(contentMetadata);
  const validatedLinks = validateLinks(links);
  const categorizedLinks = useMemo(() => ({
    interlinks: validatedLinks.filter(link => link.isInternal && link.isValid),
    backlinks: validatedLinks.filter(link => !link.isInternal && link.isValid),
    invalid: validatedLinks.filter(link => !link.isValid),
  }), [validatedLinks]);

  const initialCategory: LinkCategory =
    categorizedLinks.interlinks.length > 0
      ? 'interlinks'
      : categorizedLinks.backlinks.length > 0
        ? 'backlinks'
        : 'invalid';

  const [activeCategory, setActiveCategory] = useState<LinkCategory>(initialCategory);

  useEffect(() => {
    setActiveCategory(initialCategory);
  }, [initialCategory]);

  const activeList = categorizedLinks[activeCategory];
  const hasAnyLinks = validatedLinks.length > 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Link Opportunities ({links.length})
            </h3>
            {lastUpdated && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Updated {new Date(lastUpdated).toLocaleDateString()} • Click refresh after rerunning opportunities
              </p>
            )}
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={() => onRefresh()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4 rotate-45 text-gray-400" />
            Refresh
          </button>
        )}
      </div>

      {hasAnyLinks ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
            {(['interlinks', 'backlinks', 'invalid'] as LinkCategory[]).map((category) => {
              const count = categorizedLinks[category].length;
              const isActive = activeCategory === category;
              const emphasizeInvalid = category === 'invalid' && count > 0;

              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500'
                  }`}
                >
                  <p className={`text-xs uppercase tracking-wide ${
                    emphasizeInvalid ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {CATEGORY_LABELS[category]}
                  </p>
                  <p className={`text-2xl font-semibold ${
                    emphasizeInvalid ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                  }`}>
                    {count}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {category === 'interlinks' && 'Internal cluster links'}
                    {category === 'backlinks' && 'External authority links'}
                    {category === 'invalid' && 'Links that failed validation'}
                  </p>
                </button>
              );
            })}
          </div>

          <div>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2 mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {CATEGORY_LABELS[activeCategory]} ({activeList.length})
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {activeCategory === 'interlinks'
                    ? 'Recommended internal links (interlinks) from your content network'
                    : activeCategory === 'backlinks'
                      ? 'Suggested authority backlinks sourced during enhancement'
                      : 'Links that failed validation – fix or remove'}
                </p>
              </div>
            </div>

            {activeList.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No {CATEGORY_LABELS[activeCategory].toLowerCase()} found. Re-run link opportunities or refresh to update this view.
              </div>
            ) : (
              <ul className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {activeList.map((link, index) => (
                  <li
                    key={`${link.url}-${index}`}
                    className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-gray-700 p-3 hover:border-blue-200 dark:hover:border-blue-500 transition-colors"
                  >
                    {link.isValid ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {link.isValid && link.url ? (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline break-all"
                          >
                            {link.text || link.url}
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-gray-900 dark:text-white break-all">
                            {link.text || link.url}
                          </span>
                        )}
                        {link.isValid && (
                          <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                        {link.url}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                        {link.domain && <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">{link.domain}</span>}
                        {activeCategory === 'backlinks' && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">Backlink</span>}
                        {activeCategory === 'interlinks' && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">Interlink</span>}
                        {!link.isValid && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200">Invalid URL</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">No link insights yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Run Content Enhancement and Interlinking phases to populate interlinks, backlinks, and invalid link checks.
          </p>
          {onRefresh && (
            <button
              onClick={() => onRefresh()}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Recheck Links
            </button>
          )}
        </div>
      )}
    </div>
  );
}

