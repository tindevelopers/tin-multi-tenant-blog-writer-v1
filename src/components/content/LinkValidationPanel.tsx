/**
 * Link Validation Panel Component
 * 
 * Validates and displays links from content metadata
 */

"use client";

import React from 'react';
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
}

export function LinkValidationPanel({ contentMetadata, className = '' }: LinkValidationPanelProps) {
  const links = extractLinks(contentMetadata);
  const validatedLinks = validateLinks(links);

  if (links.length === 0) {
    return null;
  }

  const internalLinks = validatedLinks.filter(link => link.isInternal);
  const externalLinks = validatedLinks.filter(link => !link.isInternal);
  const invalidLinks = validatedLinks.filter(link => !link.isValid);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <LinkIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Links ({links.length})
        </h3>
      </div>

      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-600 dark:text-gray-400">Internal</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {internalLinks.length}
            </div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">External</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {externalLinks.length}
            </div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Invalid</div>
            <div className={`text-lg font-semibold ${invalidLinks.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
              {invalidLinks.length}
            </div>
          </div>
        </div>

        {/* Invalid Links */}
        {invalidLinks.length > 0 && (
          <div>
            <div className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
              Invalid Links ({invalidLinks.length})
            </div>
            <ul className="space-y-1">
              {invalidLinks.map((link, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                  <XCircleIcon className="w-4 h-4" />
                  <span className="truncate">{link.url}</span>
                  <span className="text-gray-500 dark:text-gray-400">({link.text})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* External Links */}
        {externalLinks.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              External Links ({externalLinks.length})
            </div>
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {externalLinks.map((link, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  {link.isValid ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                  )}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline truncate flex-1"
                  >
                    {link.text || link.url}
                  </a>
                  <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Internal Links */}
        {internalLinks.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Internal Links ({internalLinks.length})
            </div>
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {internalLinks.map((link, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  {link.isValid ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                  )}
                  <a
                    href={link.url}
                    className="text-blue-600 dark:text-blue-400 hover:underline truncate flex-1"
                  >
                    {link.text || link.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

