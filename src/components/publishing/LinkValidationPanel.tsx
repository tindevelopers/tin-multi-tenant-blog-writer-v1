'use client';

import React from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  LinkIcon,
  ArrowTopRightOnSquareIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { LinkValidationResult, ValidatedLink } from '@/hooks/useLinkValidation';

interface LinkValidationPanelProps {
  result: LinkValidationResult | null;
  validating?: boolean;
  error?: string | null;
  onValidate?: () => void;
  onAutoFix?: () => void;
  showDetails?: boolean;
  compact?: boolean;
}

export function LinkValidationPanel({
  result,
  validating = false,
  error = null,
  onValidate,
  onAutoFix,
  showDetails = true,
  compact = false,
}: LinkValidationPanelProps) {
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
        <div className="flex items-center gap-2">
          <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
        </div>
        {onValidate && (
          <button
            onClick={onValidate}
            className="mt-2 text-sm text-red-600 hover:underline"
          >
            Retry validation
          </button>
        )}
      </div>
    );
  }

  if (validating) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2">
          <ArrowPathIcon className="w-5 h-5 text-gray-400 animate-spin" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Validating internal links...
          </span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Links not validated yet
            </span>
          </div>
          {onValidate && (
            <button
              onClick={onValidate}
              className="text-sm text-brand-600 hover:underline flex items-center gap-1"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Validate Now
            </button>
          )}
        </div>
      </div>
    );
  }

  // Determine status
  const hasIssues = result.brokenLinks > 0 || result.wrongSiteLinks > 0;
  const statusColor = result.isValid
    ? 'green'
    : hasIssues
    ? 'yellow'
    : 'red';

  const StatusIcon = result.isValid
    ? CheckCircleIcon
    : hasIssues
    ? ExclamationTriangleIcon
    : XCircleIcon;

  if (compact) {
    return (
      <div
        className={`rounded-lg border p-3 ${
          statusColor === 'green'
            ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
            : statusColor === 'yellow'
            ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800'
            : 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon
              className={`w-5 h-5 ${
                statusColor === 'green'
                  ? 'text-green-600 dark:text-green-400'
                  : statusColor === 'yellow'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            />
            <span
              className={`text-sm font-medium ${
                statusColor === 'green'
                  ? 'text-green-800 dark:text-green-200'
                  : statusColor === 'yellow'
                  ? 'text-yellow-800 dark:text-yellow-200'
                  : 'text-red-800 dark:text-red-200'
              }`}
            >
              {result.isValid
                ? 'All links valid'
                : `${result.brokenLinks + result.wrongSiteLinks} link issue(s)`}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {result.totalLinks} links
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border ${
        statusColor === 'green'
          ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
          : statusColor === 'yellow'
          ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800'
          : 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-inherit">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon
              className={`w-5 h-5 ${
                statusColor === 'green'
                  ? 'text-green-600 dark:text-green-400'
                  : statusColor === 'yellow'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            />
            <h3
              className={`font-medium ${
                statusColor === 'green'
                  ? 'text-green-800 dark:text-green-200'
                  : statusColor === 'yellow'
                  ? 'text-yellow-800 dark:text-yellow-200'
                  : 'text-red-800 dark:text-red-200'
              }`}
            >
              Link Validation
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {onAutoFix && result.wrongSiteLinks > 0 && (
              <button
                onClick={onAutoFix}
                className="text-sm px-3 py-1 rounded-md bg-brand-500 text-white hover:bg-brand-600 transition-colors flex items-center gap-1"
              >
                <WrenchScrewdriverIcon className="w-4 h-4" />
                Auto-Fix
              </button>
            )}
            {onValidate && (
              <button
                onClick={onValidate}
                className="text-sm text-gray-600 dark:text-gray-400 hover:underline flex items-center gap-1"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Re-check
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {result.totalLinks}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {result.validLinks}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Valid</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
              {result.wrongSiteLinks}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Wrong Site</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600 dark:text-red-400">
              {result.brokenLinks}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Broken</div>
          </div>
        </div>
      </div>

      {/* Warnings & Errors */}
      {(result.warnings.length > 0 || result.errors.length > 0) && (
        <div className="p-4 space-y-2">
          {result.errors.map((err, idx) => (
            <div key={`err-${idx}`} className="flex items-start gap-2 text-sm">
              <XCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-red-700 dark:text-red-300">{err}</span>
            </div>
          ))}
          {result.warnings.map((warn, idx) => (
            <div key={`warn-${idx}`} className="flex items-start gap-2 text-sm">
              <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <span className="text-yellow-700 dark:text-yellow-300">{warn}</span>
            </div>
          ))}
        </div>
      )}

      {/* Link Details */}
      {showDetails && result.links.length > 0 && (
        <div className="p-4 border-t border-inherit">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link Details
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {result.links.map((link, idx) => (
              <LinkRow key={idx} link={link} />
            ))}
          </div>
        </div>
      )}

      {/* Publish Status */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
        <div className="flex items-center gap-2">
          {result.canPublish ? (
            <>
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Safe to publish
              </span>
            </>
          ) : (
            <>
              <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                Review warnings before publishing
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LinkRow({ link }: { link: ValidatedLink }) {
  const statusColors: Record<string, string> = {
    valid: 'text-green-600 dark:text-green-400',
    external: 'text-blue-600 dark:text-blue-400',
    broken: 'text-red-600 dark:text-red-400',
    wrong_site: 'text-yellow-600 dark:text-yellow-400',
    not_published: 'text-orange-600 dark:text-orange-400',
    not_indexed: 'text-gray-600 dark:text-gray-400',
  };

  const statusLabels: Record<string, string> = {
    valid: '✓ Valid',
    external: '↗ External',
    broken: '✗ Broken',
    wrong_site: '⚠ Wrong Site',
    not_published: '○ Not Published',
    not_indexed: '? Not Indexed',
  };

  return (
    <div className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium ${statusColors[link.status]}`}
          >
            {statusLabels[link.status]}
          </span>
          <span className="text-sm text-gray-900 dark:text-white truncate">
            {link.anchorText || '(no text)'}
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
          {link.url}
        </div>
        {link.suggestion && (
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            → {link.suggestion}
          </div>
        )}
      </div>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
      </a>
    </div>
  );
}

export default LinkValidationPanel;
