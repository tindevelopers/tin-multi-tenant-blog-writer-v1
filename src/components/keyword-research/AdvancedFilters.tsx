"use client";

import React, { useState } from 'react';
import { Filter, X, Plus, Trash2 } from 'lucide-react';

export interface FilterCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: string | number | [number, number];
}

interface AdvancedFiltersProps {
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  onApply: () => void;
  onClear: () => void;
}

const FILTER_FIELDS = [
  { value: 'search_volume', label: 'Search Volume' },
  { value: 'difficulty', label: 'Difficulty' },
  { value: 'competition', label: 'Competition' },
  { value: 'cpc', label: 'CPC' },
  { value: 'trend_score', label: 'Trend Score' },
  { value: 'keyword', label: 'Keyword' },
  { value: 'parent_topic', label: 'Parent Topic' },
  { value: 'primary_intent', label: 'Intent' },
];

const OPERATORS = {
  search_volume: [
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'between', label: 'Between' },
  ],
  difficulty: [
    { value: 'equals', label: 'Equals' },
    { value: 'in', label: 'Is One Of' },
  ],
  competition: [
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'between', label: 'Between' },
  ],
  cpc: [
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'between', label: 'Between' },
  ],
  trend_score: [
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
  ],
  keyword: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
  ],
  parent_topic: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
  ],
  primary_intent: [
    { value: 'equals', label: 'Equals' },
    { value: 'in', label: 'Is One Of' },
  ],
};

export function AdvancedFilters({
  filters,
  onFiltersChange,
  onApply,
  onClear,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const addFilter = () => {
    onFiltersChange([
      ...filters,
      { field: 'search_volume', operator: 'greater_than', value: 0 },
    ]);
  };

  const removeFilter = (index: number) => {
    onFiltersChange(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<FilterCondition>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    onFiltersChange(newFilters);
  };

  const getOperatorsForField = (field: string) => {
    return OPERATORS[field as keyof typeof OPERATORS] || OPERATORS.search_volume;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
      >
        <Filter className="h-4 w-4" />
        <span>Advanced Filters</span>
        {filters.length > 0 && (
          <span className="px-2 py-0.5 text-xs bg-brand-500 text-white rounded-full">
            {filters.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Advanced Filters
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filters.map((filter, index) => (
                <div
                  key={index}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <select
                      value={filter.field}
                      onChange={(e) => {
                        const newField = e.target.value;
                        const operators = getOperatorsForField(newField);
                        updateFilter(index, {
                          field: newField,
                          operator: operators[0].value as FilterCondition['operator'],
                          value: '',
                        });
                      }}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {FILTER_FIELDS.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeFilter(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex gap-2 mb-2">
                    <select
                      value={filter.operator}
                      onChange={(e) =>
                        updateFilter(index, {
                          operator: e.target.value as FilterCondition['operator'],
                        })
                      }
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {getOperatorsForField(filter.field).map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {filter.operator === 'between' ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={Array.isArray(filter.value) ? filter.value[0] : ''}
                        onChange={(e) =>
                          updateFilter(index, {
                            value: [
                              Number(e.target.value),
                              Array.isArray(filter.value) ? filter.value[1] : Number(e.target.value),
                            ],
                          })
                        }
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={Array.isArray(filter.value) ? filter.value[1] : ''}
                        onChange={(e) =>
                          updateFilter(index, {
                            value: [
                              Array.isArray(filter.value) ? filter.value[0] : 0,
                              Number(e.target.value),
                            ],
                          })
                        }
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  ) : filter.operator === 'in' ? (
                    <input
                      type="text"
                      placeholder="Comma-separated values"
                      value={Array.isArray(filter.value) ? filter.value.join(', ') : String(filter.value || '')}
                      onChange={(e) =>
                        updateFilter(index, {
                          value: e.target.value.split(',').map((v) => v.trim()),
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <input
                      type={['search_volume', 'competition', 'cpc', 'trend_score'].includes(filter.field) ? 'number' : 'text'}
                      placeholder="Value"
                      value={String(filter.value || '')}
                      onChange={(e) =>
                        updateFilter(index, {
                          value: ['search_volume', 'competition', 'cpc', 'trend_score'].includes(filter.field)
                            ? Number(e.target.value)
                            : e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  )}
                </div>
              ))}

              {filters.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">No filters added yet</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={addFilter}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Plus className="h-4 w-4" />
                Add Filter
              </button>
              <button
                onClick={onClear}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Clear All
              </button>
              <button
                onClick={() => {
                  onApply();
                  setIsOpen(false);
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

