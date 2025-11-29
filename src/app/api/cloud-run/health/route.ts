/**
 * API Route: Cloud Run Health Check Proxy
 * 
 * GET /api/cloud-run/health
 * 
 * Proxies health check requests to Cloud Run to avoid CORS issues.
 * Returns the health status and tracks Cloud Run availability.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

const CLOUD_RUN_URL = BLOG_WRITER_API_URL;
const HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds

export async function GET(request: NextRequest) {
  try {
    logger.debug('Proxying Cloud Run health check');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    try {
      const response = await fetch(`${CLOUD_RUN_URL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const healthData = await response.json();
        logger.debug('Cloud Run is healthy');
        
        return NextResponse.json({
          isHealthy: true,
          isWakingUp: false,
          lastChecked: new Date().toISOString(),
          data: healthData,
        });
      } else {
        // If we got a response (even if error), the service is running
        // 503 might mean overloaded or temporarily unavailable, but not starting up
        const is503 = response.status === 503;
        logger.warn('Cloud Run health check returned non-OK status', { status: response.status });
        
        // Try to parse error response
        let errorMessage = `Health check failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error || errorData.message) {
            errorMessage = errorData.error || errorData.message;
          }
        } catch {
          // Ignore JSON parse errors
        }
        
        return NextResponse.json({
          isHealthy: false,
          // Only mark as waking up if it's a 503 AND the error message suggests startup
          isWakingUp: is503 && (errorMessage.includes('starting') || errorMessage.includes('cold')),
          lastChecked: new Date().toISOString(),
          error: errorMessage,
        }, { status: response.status });
      }
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      
      // Check if it's a timeout or network error (likely cold start)
      const error = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
      const isTimeout = error.name === 'AbortError' || error.message?.includes('timeout');
      const isNetworkError = error.message?.includes('Failed to fetch') || 
                            error.message?.includes('NetworkError') ||
                            (fetchError as { code?: string }).code === 'ECONNREFUSED';
      
      if (isTimeout || isNetworkError) {
        logger.debug('Cloud Run appears to be cold-starting', { isTimeout, isNetworkError });
        return NextResponse.json({
          isHealthy: false,
          isWakingUp: true, // Indicate it's likely starting up
          lastChecked: new Date().toISOString(),
          error: 'Cloud Run is starting up. Please wait...',
        }, { status: 503 }); // Service Unavailable
      }
      
      throw fetchError;
    }
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'cloud-run-health',
    });
    
    // Extract a clean error message
    let errorMessage = 'Failed to check Cloud Run health';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
    }
    
    // Don't include URL parsing errors in the message - they're misleading
    if (errorMessage.includes('Failed to parse URL')) {
      errorMessage = 'Cloud Run health check failed - service may be starting up';
    }
    
    return NextResponse.json({
      isHealthy: false,
      isWakingUp: errorMessage.includes('starting up') || errorMessage.includes('timeout'),
      lastChecked: new Date().toISOString(),
      error: errorMessage,
    }, { status: 500 });
  }
}

