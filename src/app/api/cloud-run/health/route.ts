/**
 * API Route: Cloud Run Health Check Proxy
 * 
 * GET /api/cloud-run/health
 * 
 * Proxies health check requests to Cloud Run to avoid CORS issues.
 * Returns the health status and tracks Cloud Run availability.
 */

import { NextRequest, NextResponse } from 'next/server';

const CLOUD_RUN_URL = process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west1.run.app';
const HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Proxying Cloud Run health check...');
    
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
        console.log('✅ Cloud Run is healthy');
        
        return NextResponse.json({
          isHealthy: true,
          isWakingUp: false,
          lastChecked: new Date().toISOString(),
          data: healthData,
        });
      } else {
        console.warn(`⚠️ Cloud Run health check returned status ${response.status}`);
        return NextResponse.json({
          isHealthy: false,
          isWakingUp: false,
          lastChecked: new Date().toISOString(),
          error: `Health check failed with status ${response.status}`,
        }, { status: response.status });
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Check if it's a timeout or network error (likely cold start)
      const isTimeout = fetchError.name === 'AbortError' || fetchError.message?.includes('timeout');
      const isNetworkError = fetchError.message?.includes('Failed to fetch') || 
                            fetchError.message?.includes('NetworkError') ||
                            fetchError.code === 'ECONNREFUSED';
      
      if (isTimeout || isNetworkError) {
        console.log('⏳ Cloud Run appears to be cold-starting (timeout/network error)');
        return NextResponse.json({
          isHealthy: false,
          isWakingUp: true, // Indicate it's likely starting up
          lastChecked: new Date().toISOString(),
          error: 'Cloud Run is starting up. Please wait...',
        }, { status: 503 }); // Service Unavailable
      }
      
      throw fetchError;
    }
  } catch (error: any) {
    console.error('❌ Error checking Cloud Run health:', error);
    
    // Extract a clean error message
    let errorMessage = 'Failed to check Cloud Run health';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
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

