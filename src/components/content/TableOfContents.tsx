/**
 * Table of Contents Component
 * 
 * Displays a table of contents generated from content metadata headings
 */

"use client";

import React from 'react';
import { generateTOC, type TOCItem } from '@/lib/content-metadata-utils';
import type { ContentMetadata } from '@/lib/content-metadata-utils';

interface TableOfContentsProps {
  contentMetadata: ContentMetadata | null | undefined;
  onHeadingClick?: (anchor: string) => void;
  className?: string;
}

export function TableOfContents({ 
  contentMetadata, 
  onHeadingClick,
  className = '' 
}: TableOfContentsProps) {
  const tocItems = generateTOC(contentMetadata);

  if (tocItems.length === 0) {
    return null;
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, anchor: string) => {
    e.preventDefault();
    if (onHeadingClick) {
      onHeadingClick(anchor);
    } else {
      // Default behavior: scroll to heading
      const element = document.querySelector(anchor);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <nav className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        Table of Contents
      </h3>
      <ul className="space-y-1">
        {tocItems.map((item, index) => (
          <li
            key={`${item.id}-${index}`}
            className={`text-sm ${
              item.level === 1 
                ? 'font-semibold text-gray-900 dark:text-white' 
                : item.level === 2
                ? 'font-medium text-gray-700 dark:text-gray-300 ml-4'
                : 'text-gray-600 dark:text-gray-400 ml-8'
            }`}
          >
            <a
              href={item.anchor}
              onClick={(e) => handleClick(e, item.anchor)}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

