/**
 * React Hook: Cloud Run Status Tracking
 * 
 * Tracks the health and wake-up status of the Cloud Run API.
 * Provides UI-friendly state for showing loading indicators and disabling actions.
 */

import { useState, useEffect, useCallback } from 'react';

export interface CloudRunStatus {
  isHealthy: boolean;
  isWakingUp: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  error: string | null;
}

const CHECK_INTERVAL = 30000; // Check every 30 seconds
const WAKEUP_RETRY_DELAY = 2000; // 2 seconds between wake-up attempts
const MAX_WAKEUP_ATTEMPTS = 5; // More attempts for cold starts

export function useCloudRunStatus() {
  const [status, setStatus] = useState<CloudRunStatus>({
    isHealthy: false,
    isWakingUp: false,
    isChecking: false,
    lastChecked: null,
    error: null,
  });

  const checkHealth = useCallback(async (): Promise<CloudRunStatus> => {
    setStatus(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      const response = await fetch('/api/cloud-run/health', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      const newStatus: CloudRunStatus = {
        isHealthy: data.isHealthy === true,
        isWakingUp: data.isWakingUp === true,
        isChecking: false,
        lastChecked: new Date(),
        error: data.error || null,
      };

      setStatus(newStatus);
      return newStatus;
    } catch (error: any) {
      const newStatus: CloudRunStatus = {
        isHealthy: false,
        isWakingUp: false,
        isChecking: false,
        lastChecked: new Date(),
        error: error.message || 'Failed to check Cloud Run status',
      };
      setStatus(newStatus);
      return newStatus;
    }
  }, []);

  const wakeUpAndWait = useCallback(async (): Promise<CloudRunStatus> => {
    console.log('🌅 Starting Cloud Run wake-up process...');
    setStatus(prev => ({ ...prev, isWakingUp: true, isChecking: true, error: null }));

    let attempts = 0;
    let lastError: string | null = null;

    while (attempts < MAX_WAKEUP_ATTEMPTS) {
      attempts++;
      console.log(`🔄 Wake-up attempt ${attempts}/${MAX_WAKEUP_ATTEMPTS}`);

      const healthStatus = await checkHealth();

      if (healthStatus.isHealthy) {
        console.log('✅ Cloud Run is awake and healthy');
        setStatus(prev => ({
          ...prev,
          isHealthy: true,
          isWakingUp: false,
          isChecking: false,
          error: null,
        }));
        return healthStatus;
      }

      // If it's still waking up, continue retrying
      if (healthStatus.isWakingUp && attempts < MAX_WAKEUP_ATTEMPTS) {
        lastError = healthStatus.error || 'Cloud Run is starting up...';
        console.log(`⏳ Waiting ${WAKEUP_RETRY_DELAY/1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, WAKEUP_RETRY_DELAY));
        continue;
      }

      // If it's not waking up but still unhealthy, it might be a different error
      if (!healthStatus.isWakingUp) {
        lastError = healthStatus.error || 'Cloud Run is not available';
        break;
      }
    }

    // If we've exhausted attempts and it's still waking up, give it more time
    if (attempts >= MAX_WAKEUP_ATTEMPTS) {
      console.warn('⚠️ Cloud Run wake-up attempts exhausted. It may still be starting up.');
      setStatus(prev => ({
        ...prev,
        isWakingUp: true, // Keep showing as waking up
        isChecking: false,
        error: lastError || 'Cloud Run is taking longer than expected to start. Please wait...',
      }));
    }

    return {
      isHealthy: false,
      isWakingUp: true,
      isChecking: false,
      lastChecked: new Date(),
      error: lastError || 'Failed to wake up Cloud Run',
    };
  }, [checkHealth]);

  // Initial health check on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Periodic health checks
  useEffect(() => {
    const interval = setInterval(() => {
      // Only check if not currently checking and not waking up
      if (!status.isChecking && !status.isWakingUp) {
        checkHealth();
      }
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [checkHealth, status.isChecking, status.isWakingUp]);

  return {
    ...status,
    checkHealth,
    wakeUpAndWait,
  };
}

