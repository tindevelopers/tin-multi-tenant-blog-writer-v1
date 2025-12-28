'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  LinkIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';

interface ScanInfo {
  hasScan: boolean;
  scanId?: string;
  status?: 'pending' | 'scanning' | 'completed' | 'failed';
  lastScanDate?: string;
  totalContentItems?: number;
  siteName?: string;
  publishedDomain?: string;
  error?: string;
}

interface SiteScanStatusProps {
  orgId: string;
  siteId?: string;
  siteName?: string;
  onScanComplete?: (scanInfo: ScanInfo) => void;
  compact?: boolean;
}

export const SiteScanStatus: React.FC<SiteScanStatusProps> = ({
  orgId,
  siteId,
  siteName,
  onScanComplete,
  compact = false,
}) => {
  const [scanInfo, setScanInfo] = useState<ScanInfo>({ hasScan: false });
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const fetchScanStatus = useCallback(async () => {
    if (!orgId || !siteId) {
      setScanInfo({ hasScan: false });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/integrations/webflow/scan-structure?site_id=${siteId}`
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.scan && data.scan.scan_id) {
          const info: ScanInfo = {
            hasScan: data.scan.status === 'completed',
            scanId: data.scan.scan_id,
            status: data.scan.status,
            lastScanDate: data.scan.scan_completed_at || data.scan.created_at || data.scan.scan_started_at,
            totalContentItems: data.scan.total_content_items || 0,
            siteName: data.scan.site_name || siteName,
            publishedDomain: data.scan.published_domain,
          };
          setScanInfo(info);
          
          if (info.status === 'scanning' || info.status === 'pending') {
            setScanning(true);
            // Poll for completion
            setTimeout(() => fetchScanStatus(), 5000);
          } else {
            setScanning(false);
          }
        } else {
          setScanInfo({ hasScan: false, siteName });
          setScanning(false);
        }
      } else {
        setScanInfo({ hasScan: false, error: 'Failed to fetch scan status' });
      }
    } catch (error) {
      logger.error('Error fetching scan status:', error);
      setScanInfo({ hasScan: false, error: 'Error checking scan status' });
    } finally {
      setLoading(false);
    }
  }, [orgId, siteId, siteName]);

  useEffect(() => {
    fetchScanStatus();
  }, [fetchScanStatus]);

  const handleTriggerScan = async () => {
    if (!siteId) return;

    setScanning(true);
    try {
      const response = await fetch('/api/integrations/webflow/scan-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: siteId }),
      });

      if (response.ok) {
        const data = await response.json();
        setScanInfo(prev => ({
          ...prev,
          status: 'scanning',
          scanId: data.scan_id,
        }));
        
        // Start polling for completion
        setTimeout(() => fetchScanStatus(), 3000);
      } else {
        const error = await response.json();
        setScanInfo(prev => ({
          ...prev,
          error: error.error || 'Failed to start scan',
        }));
        setScanning(false);
      }
    } catch (error) {
      logger.error('Error triggering scan:', error);
      setScanInfo(prev => ({
        ...prev,
        error: 'Error starting scan',
      }));
      setScanning(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const isScanStale = () => {
    if (!scanInfo.lastScanDate) return true;
    const scanDate = new Date(scanInfo.lastScanDate);
    const now = new Date();
    const diffDays = (now.getTime() - scanDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 7; // Consider stale after 7 days
  };

  if (!siteId) {
    return null;
  }

  if (loading && !scanInfo.hasScan) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
        <ArrowPathIcon className="w-4 h-4 animate-spin" />
        <span>Checking site scan...</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {scanInfo.hasScan ? (
          <>
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {scanInfo.totalContentItems} pages indexed
            </span>
            {isScanStale() && (
              <button
                onClick={handleTriggerScan}
                disabled={scanning}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                title="Refresh site scan"
              >
                {scanning ? (
                  <ArrowPathIcon className="w-3 h-3 animate-spin" />
                ) : (
                  <ArrowPathIcon className="w-3 h-3" />
                )}
              </button>
            )}
          </>
        ) : (
          <>
            <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              No scan available
            </span>
            <button
              onClick={handleTriggerScan}
              disabled={scanning}
              className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {scanning ? 'Scanning...' : 'Scan Now'}
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {scanInfo.hasScan ? (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          ) : scanning ? (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ArrowPathIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
          ) : (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          )}
          
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Internal Linking Data
            </h4>
            
            {scanning ? (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Scanning site structure... This may take a minute.
              </p>
            ) : scanInfo.hasScan ? (
              <div className="mt-1 space-y-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {scanInfo.totalContentItems}
                  </span>{' '}
                  pages available for internal linking
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    Last scan: {formatDate(scanInfo.lastScanDate)}
                  </span>
                  {scanInfo.publishedDomain && (
                    <span className="text-gray-400">
                      {scanInfo.publishedDomain}
                    </span>
                  )}
                </div>
                {isScanStale() && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Scan is over 7 days old. Consider refreshing for latest content.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                No site scan available. Scan your Webflow site to enable intelligent internal linking.
              </p>
            )}
          </div>
        </div>

        {!scanning && (
          <button
            onClick={handleTriggerScan}
            disabled={scanning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              scanInfo.hasScan
                ? 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <MagnifyingGlassIcon className="w-4 h-4" />
            {scanInfo.hasScan ? 'Refresh' : 'Scan Site'}
          </button>
        )}
      </div>

      {scanInfo.error && (
        <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2">
          {scanInfo.error}
        </div>
      )}
    </div>
  );
};

export default SiteScanStatus;

