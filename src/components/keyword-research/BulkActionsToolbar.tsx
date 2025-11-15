"use client";

import React from 'react';
import { Download, Send, Plus, Layers, FileText, CheckSquare, Square } from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onExportCSV: () => void;
  onSendToBrief: () => void;
  onAddToCluster: () => void;
  onCreateList: () => void;
  onExportJSON?: () => void;
  onExportGoogleSheets?: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onExportCSV,
  onSendToBrief,
  onAddToCluster,
  onCreateList,
  onExportJSON,
  onExportGoogleSheets,
}: BulkActionsToolbarProps) {
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={allSelected ? onClearSelection : onSelectAll}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title={allSelected ? 'Deselect All' : 'Select All'}
            >
              {allSelected ? (
                <CheckSquare className="h-5 w-5" />
              ) : (
                <Square className="h-5 w-5" />
              )}
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedCount} of {totalCount} selected
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <>
              <button
                onClick={onExportCSV}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>

              {onExportJSON && (
                <button
                  onClick={onExportJSON}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export JSON
                </button>
              )}

              {onExportGoogleSheets && (
                <button
                  onClick={onExportGoogleSheets}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Export to Sheets
                </button>
              )}

              <button
                onClick={onSendToBrief}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
              >
                <Send className="h-4 w-4" />
                Send to Brief
              </button>

              <button
                onClick={onAddToCluster}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Layers className="h-4 w-4" />
                Add to Cluster
              </button>

              <button
                onClick={onCreateList}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create List
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

