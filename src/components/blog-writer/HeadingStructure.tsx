"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface HeadingStructureProps {
  headings: Heading[];
  className?: string;
}

export default function HeadingStructure({ headings, className = "" }: HeadingStructureProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!headings || headings.length === 0) {
    return null;
  }

  const h1Count = headings.filter(h => h.level === 1).length;
  const h2Count = headings.filter(h => h.level === 2).length;
  const h3Count = headings.filter(h => h.level === 3).length;

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <DocumentTextIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Content Structure
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {h1Count} H1, {h2Count} H2, {h3Count} H3
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {headings.map((heading, index) => {
              const indent = (heading.level - 1) * 16;
              const Tag = `h${heading.level}` as keyof JSX.IntrinsicElements;
              
              return (
                <div
                  key={`${heading.id}-${index}`}
                  className="flex items-start gap-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded px-2 -mx-2"
                  style={{ paddingLeft: `${indent + 8}px` }}
                >
                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-0.5">
                    H{heading.level}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {heading.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

