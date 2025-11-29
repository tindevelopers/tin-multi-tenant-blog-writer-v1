"use client";

import React from 'react';
import { Search, Sparkles } from 'lucide-react';

export type SearchType = 'traditional' | 'ai' | 'both';

interface SearchTypeSelectorProps {
  value: SearchType;
  onChange: (type: SearchType) => void;
  disabled?: boolean;
  showBothOption?: boolean;
}

export default function SearchTypeSelector({
  value,
  onChange,
  disabled = false,
  showBothOption = true,
}: SearchTypeSelectorProps) {
  const options: Array<{ value: SearchType; label: string; description: string; icon: React.ReactNode }> = [
    {
      value: 'traditional',
      label: 'Traditional SEO',
      description: 'Google search volume, difficulty, competition',
      icon: <Search className="w-5 h-5" />,
    },
    {
      value: 'ai',
      label: 'AI Search',
      description: 'AI search volume, LLM mentions, optimization scores',
      icon: <Sparkles className="w-5 h-5" />,
    },
  ];

  if (showBothOption) {
    options.push({
      value: 'both',
      label: 'Both',
      description: 'Traditional SEO + AI search data',
      icon: (
        <div className="flex items-center gap-1">
          <Search className="w-4 h-4" />
          <Sparkles className="w-4 h-4" />
        </div>
      ),
    });
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Search Type
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            className={`
              p-4 rounded-lg border-2 text-left transition-all
              ${value === option.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`${value === option.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {option.icon}
              </div>
              <div className={`font-medium ${value === option.value ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'}`}>
                {option.label}
              </div>
            </div>
            <div className={`text-xs ${value === option.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
              {option.description}
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Results are automatically cached for 90 days and stored in your database
      </p>
    </div>
  );
}

