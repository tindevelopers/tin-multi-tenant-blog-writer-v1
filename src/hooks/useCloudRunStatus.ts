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

const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes to keep API alive
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
    const maxAttempts = 10; // More attempts for cold starts and CORS configuration
    const baseDelay = 2000;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 Wake-up attempt ${attempts}/${maxAttempts}`);

      const healthStatus = await checkHealth();

      if (healthStatus.isHealthy) {
        console.log('✅ Cloud Run is awake and healthy - API is ACTIVE');
        setStatus(prev => ({
          ...prev,
          isHealthy: true,
          isWakingUp: false,
          isChecking: false,
          error: null,
        }));
        return healthStatus;
      }

      // If it's still waking up, continue retrying with exponential backoff
      if (healthStatus.isWakingUp && attempts < maxAttempts) {
        lastError = healthStatus.error || 'Cloud Run is starting up...';
        const delay = Math.min(baseDelay * Math.pow(1.5, attempts - 1), 10000);
        console.log(`⏳ Waiting ${Math.round(delay/1000)} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If it's not waking up but still unhealthy, it might be a different error
      if (!healthStatus.isWakingUp) {
        lastError = healthStatus.error || 'Cloud Run is not available';
        break;
      }
    }

    // If we've exhausted attempts and it's still waking up, give it more time
    if (attempts >= maxAttempts) {
      const isStillWakingUp = Boolean(lastError?.includes('starting up') || lastError?.includes('CORS'));
      console.warn('⚠️ Cloud Run wake-up attempts exhausted. It may still be starting up.');
      setStatus(prev => ({
        ...prev,
        isWakingUp: isStillWakingUp, // Keep showing as waking up if it's a startup issue
        isChecking: false,
        error: lastError || 'Cloud Run is taking longer than expected to start. Please wait...',
      }));
    }

    return {
      isHealthy: false,
      isWakingUp: Boolean(lastError?.includes('starting up') || lastError?.includes('CORS')),
      isChecking: false,
      lastChecked: new Date(),
      error: lastError || 'Failed to wake up Cloud Run',
    };
  }, [checkHealth]);

  // Initial health check on mount - run immediately when page loads
  useEffect(() => {
    console.log('🔍 Running initial API health check...');
    checkHealth();
  }, [checkHealth]);

  // Auto-retry when waking up - check more frequently until healthy
  useEffect(() => {
    if (!status.isWakingUp || status.isHealthy) {
      return; // Don't retry if not waking up or already healthy
    }

    console.log('🔄 Auto-retrying health check while API is starting up...');
    const retryInterval = setInterval(async () => {
      const healthStatus = await checkHealth();
      
      // If it becomes healthy, stop retrying
      if (healthStatus.isHealthy) {
        console.log('✅ API became healthy - stopping auto-retry');
        clearInterval(retryInterval);
        setStatus(prev => ({
          ...prev,
          isHealthy: true,
          isWakingUp: false,
          isChecking: false,
          error: null,
        }));
      } else if (!healthStatus.isWakingUp) {
        // If it's no longer waking up but still not healthy, stop retrying
        console.log('⚠️ API is no longer waking up but still not healthy - stopping auto-retry');
        clearInterval(retryInterval);
      }
    }, 3000); // Check every 3 seconds when waking up

    return () => clearInterval(retryInterval);
  }, [status.isWakingUp, status.isHealthy, checkHealth]);

  // Periodic health checks (only when not waking up)
  useEffect(() => {
    if (status.isWakingUp) {
      return; // Skip periodic checks while waking up (handled by auto-retry above)
    }

    const interval = setInterval(() => {
      // Only check if not currently checking
      if (!status.isChecking) {
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

