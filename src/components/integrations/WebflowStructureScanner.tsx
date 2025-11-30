"use client";

import { useState, useEffect } from 'react';
import { 
  ArrowPathIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  DocumentTextIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';

interface WebflowScan {
  scan_id: string;
  site_id: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  scan_type: 'full' | 'incremental';
  collections_count: number;
  static_pages_count: number;
  cms_items_count: number;
  total_content_items: number;
  scan_started_at: string | null;
  scan_completed_at: string | null;
  error_message: string | null;
}

interface WebflowStructureScannerProps {
  siteId: string;
  integrationId?: string;
  onScanComplete?: () => void;
}

export function WebflowStructureScanner({
  siteId,
  integrationId,
  onScanComplete,
}: WebflowStructureScannerProps) {
  const [scans, setScans] = useState<WebflowScan[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch scan history
  const fetchScans = async () => {
    try {
      const response = await fetch(`/api/integrations/webflow/scan-structure?site_id=${siteId}`);
      const data = await response.json();
      
      if (data.success && Array.isArray(data.scans)) {
        setScans(data.scans);
        
        // Check if there's an active scan and update scanning state accordingly
        const hasActiveScan = data.scans.some(s => s.status === 'scanning' || s.status === 'pending');
        setScanning(hasActiveScan);
      }
    } catch (err) {
      logger.error('Failed to fetch scans', { error: err });
    }
  };

  useEffect(() => {
    if (siteId) {
      fetchScans();
    }
  }, [siteId]);

  // Poll for scan status when scanning
  useEffect(() => {
    if (!scanning) return;

    let pollCount = 0;
    const maxPolls = 150; // 5 minutes max (150 * 2 seconds)
    
    const interval = setInterval(async () => {
      pollCount++;
      
      // Timeout after max polls
      if (pollCount > maxPolls) {
        logger.warn('Scan polling timeout reached', { siteId, pollCount });
        setScanning(false);
        setError('Scan is taking longer than expected. Please check the scan status manually.');
        clearInterval(interval);
        return;
      }

      try {
        const response = await fetch(`/api/integrations/webflow/scan-structure?site_id=${siteId}`);
        const data = await response.json();
        
        if (data.success && Array.isArray(data.scans)) {
          const updatedScans = data.scans;
          setScans(updatedScans);
          
          // Check if any scan is still scanning using the fetched data
          const stillScanning = updatedScans.some(s => s.status === 'scanning' || s.status === 'pending');
          if (!stillScanning) {
            setScanning(false);
            clearInterval(interval);
            if (onScanComplete) {
              onScanComplete();
            }
          }
        }
      } catch (err) {
        logger.error('Failed to poll scan status', { error: err });
        // Don't stop polling on error - might be transient
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [scanning, siteId, onScanComplete]);

  const handleScan = async (rescan: boolean = false) => {
    setScanning(true);
    setError(null);
    
    try {
      const url = `/api/integrations/webflow/scan-structure${rescan ? '?rescan=true' : ''}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ site_id: siteId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to start scan');
      }

      // Refresh scans list
      await fetchScans();
    } catch (err: any) {
      setError(err.message || 'Failed to start scan');
      setScanning(false);
      logger.error('Scan failed', { error: err });
    }
  };

  const latestScan = scans[0];
  const isScanning = scanning || latestScan?.status === 'scanning' || latestScan?.status === 'pending';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <GlobeAltIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Webflow Structure Scanner
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Scan your Webflow site to discover CMS items and static pages for hyperlink insertion
            </p>
          </div>
        </div>
      </div>

      {/* Latest Scan Status */}
      {latestScan && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {latestScan.status === 'completed' && (
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              )}
              {latestScan.status === 'failed' && (
                <XCircleIcon className="w-5 h-5 text-red-500" />
              )}
              {(latestScan.status === 'scanning' || latestScan.status === 'pending') && (
                <ClockIcon className="w-5 h-5 text-yellow-500 animate-spin" />
              )}
              <span className="font-medium text-gray-900 dark:text-white">
                {latestScan.status === 'completed' && 'Last Scan: Completed'}
                {latestScan.status === 'failed' && 'Last Scan: Failed'}
                {(latestScan.status === 'scanning' || latestScan.status === 'pending') && 'Scanning...'}
              </span>
            </div>
            {latestScan.scan_completed_at && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(latestScan.scan_completed_at).toLocaleString()}
              </span>
            )}
          </div>

          {latestScan.status === 'completed' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {latestScan.collections_count}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Collections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {latestScan.static_pages_count}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Static Pages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {latestScan.cms_items_count}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">CMS Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {latestScan.total_content_items}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Items</div>
              </div>
            </div>
          )}

          {latestScan.status === 'failed' && latestScan.error_message && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                {latestScan.error_message}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleScan(false)}
          disabled={isScanning}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          <DocumentTextIcon className="w-5 h-5" />
          {isScanning ? 'Scanning...' : 'Scan Structure'}
        </button>
        
        <button
          onClick={() => handleScan(true)}
          disabled={isScanning}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          <ArrowPathIcon className="w-5 h-5" />
          {isScanning ? 'Scanning...' : 'Rescan'}
        </button>
      </div>

      {/* Info Text */}
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Scans discover CMS collections, items, and static pages from your Webflow site. 
        Phase 3 (Content Enhancement) uses this structure to insert intelligent hyperlinks.
        {latestScan?.status === 'completed' && (
          <span className="block mt-1">
            ✅ Structure is ready for Phase 3 hyperlink insertion.
          </span>
        )}
      </p>
    </div>
  );
}

