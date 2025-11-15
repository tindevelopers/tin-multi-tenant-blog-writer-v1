/**
 * Content Structure Display Component
 * 
 * Displays and validates content structure according to v1.3.1 guarantees:
 * - Exactly 1 H1 heading
 * - Minimum 3 H2 sections
 * - Proper heading hierarchy
 */

'use client';

import React from 'react';
import { validateContentStructure, getStructureSummary, type ContentStructureValidation } from '@/lib/content-structure-validator';

interface ContentStructureDisplayProps {
  content: string;
  content_metadata?: {
    headings?: Array<{
      level: number;
      text: string;
      id?: string;
    }>;
  };
  className?: string;
}

export function ContentStructureDisplay({
  content,
  content_metadata,
  className = ''
}: ContentStructureDisplayProps) {
  const validation = validateContentStructure(content);
  const summary = getStructureSummary(validation);

  return (
    <div className={`bg-purple-50 border border-purple-200 rounded-lg p-4 dark:bg-purple-900/20 dark:border-purple-800 ${className}`}>
      <div className="flex items-center mb-3">
        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
        <h3 className="text-purple-800 dark:text-purple-200 font-semibold text-sm">
          Content Structure
        </h3>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {summary}
          </span>
          {validation.isValid && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              ✅ Valid
            </span>
          )}
        </div>
        
        {validation.warnings.length > 0 && (
          <div className="mt-3 pt-2 border-t border-purple-200 dark:border-purple-700">
            <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">
              ⚠️ Structure Warnings:
            </p>
            <ul className="text-xs text-yellow-600 dark:text-yellow-500 space-y-1">
              {validation.warnings.map((warning, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {validation.headings.length > 0 && (
          <div className="mt-3 pt-2 border-t border-purple-200 dark:border-purple-700">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Heading Outline:
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {validation.headings.slice(0, 10).map((heading, index) => (
                <div 
                  key={index} 
                  className={`text-xs ${
                    heading.level === 1 ? 'font-bold text-gray-900 dark:text-gray-100' :
                    heading.level === 2 ? 'font-semibold text-gray-800 dark:text-gray-200 ml-2' :
                    heading.level === 3 ? 'text-gray-700 dark:text-gray-300 ml-4' :
                    'text-gray-600 dark:text-gray-400 ml-6'
                  }`}
                >
                  {'#'.repeat(heading.level)} {heading.text}
                </div>
              ))}
              {validation.headings.length > 10 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  ... and {validation.headings.length - 10} more headings
                </p>
              )}
            </div>
          </div>
        )}
        
        {validation.isValid && (
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-3 pt-2 border-t border-purple-200 dark:border-purple-700">
            ✅ v1.3.1: Structure meets all guarantees (1 H1, {validation.h2Count} H2 sections)
          </p>
        )}
      </div>
    </div>
  );
}

