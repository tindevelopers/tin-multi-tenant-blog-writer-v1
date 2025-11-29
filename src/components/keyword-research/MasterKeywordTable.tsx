'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import Checkbox from '@/components/form/input/Checkbox';
import Badge from '@/components/ui/badge/Badge';
import Select from '@/components/form/Select';
import { ArrowUpDown, Filter, Download, Target, TrendingUp, Search } from 'lucide-react';
import type { KeywordData } from '@/lib/keyword-research-enhanced';

interface MasterKeywordTableProps {
  keywords: KeywordData[];
  selectedKeywords: string[];
  onToggleKeyword: (keyword: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSendToContentIdeas?: (keywords: string[]) => void;
  onSendToContentClusters?: (keywords: string[]) => void;
  loading?: boolean;
}

type SortField = 'keyword' | 'search_volume' | 'keyword_difficulty' | 'easy_win_score' | 'high_value_score' | 'cpc' | 'search_intent';
type SortDirection = 'asc' | 'desc';

function MasterKeywordTable({
  keywords,
  selectedKeywords,
  onToggleKeyword,
  onSelectAll,
  onClearSelection,
  onSendToContentIdeas,
  onSendToContentClusters,
  loading = false,
}: MasterKeywordTableProps) {
  const [sortField, setSortField] = useState<SortField>('search_volume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [competitionFilter, setCompetitionFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');
  const [viewMode, setViewMode] = useState<'all' | 'easy-wins' | 'high-value'>('all');

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField, sortDirection]);

  const filteredAndSortedKeywords = useMemo(() => {
    let filtered = [...keywords];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((k) =>
        k.keyword.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply competition filter
    if (competitionFilter !== 'ALL') {
      filtered = filtered.filter((k) => k.competition_level === competitionFilter);
    }

    // Apply view mode filter
    if (viewMode === 'easy-wins') {
      filtered = filtered.filter((k) => k.easy_win_score >= 60);
    } else if (viewMode === 'high-value') {
      filtered = filtered.filter((k) => k.high_value_score >= 60);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });

    return filtered;
  }, [keywords, searchQuery, competitionFilter, viewMode, sortField, sortDirection]);

  const allSelected = filteredAndSortedKeywords.length > 0 && 
    filteredAndSortedKeywords.every((k) => selectedKeywords.includes(k.keyword));

  const getCompetitionBadgeColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'success';
      case 'MEDIUM':
        return 'warning';
      case 'HIGH':
        return 'error';
      default:
        return 'light';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success-600 dark:text-success-400 font-semibold';
    if (score >= 60) return 'text-blue-light-600 dark:text-blue-light-400 font-medium';
    if (score >= 40) return 'text-warning-600 dark:text-warning-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const exportToCSV = () => {
    const headers = ['Keyword', 'Search Volume', 'Difficulty', 'Competition', 'Easy Win Score', 'High Value Score', 'CPC', 'Intent', 'Type', 'Parent Topic'];
    const rows = filteredAndSortedKeywords.map((k) => [
      k.keyword,
      k.search_volume,
      k.keyword_difficulty,
      k.competition_level,
      k.easy_win_score,
      k.high_value_score,
      k.cpc || 0,
      k.search_intent || '',
      k.is_question ? 'Question' : '',
      k.parent_topic || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keywords-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const competitionOptions = [
    { value: 'ALL', label: 'All Competition' },
    { value: 'LOW', label: 'Low Competition' },
    { value: 'MEDIUM', label: 'Medium Competition' },
    { value: 'HIGH', label: 'High Competition' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Master Keyword Variations</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filteredAndSortedKeywords.length} keywords found • {selectedKeywords.length} selected
            </p>
          </div>
          <button
            onClick={exportToCSV}
            disabled={keywords.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'all'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All Keywords ({keywords.length})
          </button>
          <button
            onClick={() => setViewMode('easy-wins')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'easy-wins'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Target className="h-4 w-4" />
            Easy Wins ({keywords.filter((k) => k.easy_win_score >= 60).length})
          </button>
          <button
            onClick={() => setViewMode('high-value')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'high-value'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            High Value ({keywords.filter((k) => k.high_value_score >= 60).length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-lg border-2 border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm shadow-sm placeholder:text-gray-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-brand-500"
              />
            </div>
          </div>

          <div className="w-[200px]">
            <Select
              options={competitionOptions}
              defaultValue={competitionFilter}
              onChange={(val: string) => setCompetitionFilter(val as typeof competitionFilter)}
              placeholder="Filter competition"
            />
          </div>
        </div>

        {selectedKeywords.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-brand-50 dark:bg-brand-500/10 rounded-lg mt-4">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {selectedKeywords.length} keywords selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader className="bg-gray-100 dark:bg-gray-700">
            <TableRow className="border-b border-gray-300 dark:border-gray-600">
              <TableCell isHeader className="px-6 py-4 w-[50px]">
                <Checkbox
                  checked={allSelected}
                  onChange={(checked) => {
                    if (checked) {
                      onSelectAll();
                    } else {
                      onClearSelection();
                    }
                  }}
                />
              </TableCell>
              <TableCell isHeader className="px-6 py-4">
                <button
                  onClick={() => handleSort('keyword')}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Keyword
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-right">
                <button
                  onClick={() => handleSort('search_volume')}
                  className="flex items-center gap-2 ml-auto text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  MSV
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-right">
                <button
                  onClick={() => handleSort('keyword_difficulty')}
                  className="flex items-center gap-2 ml-auto text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Difficulty
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableCell>
              <TableCell isHeader className="px-6 py-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Competition</span>
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-right">
                <button
                  onClick={() => handleSort('easy_win_score')}
                  className="flex items-center gap-2 ml-auto text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Easy Win
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-right">
                <button
                  onClick={() => handleSort('high_value_score')}
                  className="flex items-center gap-2 ml-auto text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  High Value
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-right">
                <button
                  onClick={() => handleSort('cpc')}
                  className="flex items-center gap-2 ml-auto text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  CPC
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </TableCell>
              <TableCell isHeader className="px-6 py-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Intent</span>
              </TableCell>
              <TableCell isHeader className="px-6 py-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</span>
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <td className="px-6 py-8 text-center" colSpan={10}>
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                    <span className="ml-3 text-gray-500 dark:text-gray-400">Loading keywords...</span>
                  </div>
                </td>
              </TableRow>
            ) : filteredAndSortedKeywords.length === 0 ? (
              <TableRow>
                <td className="px-6 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={10}>
                  No keywords found. Try adjusting your filters.
                </td>
              </TableRow>
            ) : (
              filteredAndSortedKeywords.map((keyword) => (
                <TableRow 
                  key={keyword.keyword} 
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors bg-white dark:bg-gray-800"
                >
                  <TableCell className="px-6 py-4">
                    <Checkbox
                      checked={selectedKeywords.includes(keyword.keyword)}
                      onChange={() => onToggleKeyword(keyword.keyword)}
                    />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-medium text-gray-900 dark:text-white cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex-1"
                        onClick={() => onToggleKeyword(keyword.keyword)}
                      >
                        {keyword.keyword}
                      </span>
                      {(onSendToContentIdeas || onSendToContentClusters) && (
                        <div className="flex items-center gap-1">
                          {onSendToContentIdeas && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSendToContentIdeas([keyword.keyword]);
                              }}
                              className="px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                              title="Send to Content Ideas"
                            >
                              Ideas
                            </button>
                          )}
                          {onSendToContentClusters && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSendToContentClusters([keyword.keyword]);
                              }}
                              className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              title="Send to Content Clusters"
                            >
                              Clusters
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {keyword.search_volume.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <span className="text-gray-700 dark:text-gray-300">{keyword.keyword_difficulty}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge color={getCompetitionBadgeColor(keyword.competition_level)} size="sm">
                      {keyword.competition_level}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <span className={getScoreColor(keyword.easy_win_score)}>
                      {keyword.easy_win_score}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <span className={getScoreColor(keyword.high_value_score)}>
                      {keyword.high_value_score}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <span className="text-gray-700 dark:text-gray-300">
                      ${keyword.cpc?.toFixed(2) || '0.00'}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {keyword.search_intent ? (
                      <Badge 
                        color={
                          keyword.search_intent === 'informational' ? 'info' :
                          keyword.search_intent === 'commercial' ? 'warning' :
                          keyword.search_intent === 'transactional' ? 'success' : 'light'
                        } 
                        size="sm"
                      >
                        {keyword.search_intent}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {keyword.is_question ? (
                      <Badge color="info" size="sm">
                        Question
                      </Badge>
                    ) : keyword.parent_topic ? (
                      <span className="text-xs text-gray-600 dark:text-gray-400" title={keyword.parent_topic}>
                        {keyword.parent_topic.length > 20 ? `${keyword.parent_topic.substring(0, 20)}...` : keyword.parent_topic}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

const MemoizedMasterKeywordTable = React.memo(MasterKeywordTable);
export default MemoizedMasterKeywordTable;
export { MasterKeywordTable };
