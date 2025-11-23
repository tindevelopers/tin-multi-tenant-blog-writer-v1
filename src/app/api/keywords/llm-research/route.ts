import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { parseJsonBody } from '@/lib/api-utils';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import cloudRunHealth from '@/lib/cloud-run-health';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for LLM research
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return response;
      }
      
      // If it's a 503 (Service Unavailable), retry
      if (response.status === 503 && attempt < retries) {
        logger.debug('Cloud Run returned 503, retrying', { attempt, retries });
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        continue;
      }
      
      return response;
    } catch (error: unknown) {
      const isTimeout = error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'));
      const isNetworkError = error instanceof TypeError;
      
      if ((isTimeout || isNetworkError) && attempt < retries) {
        logger.debug('Network error, retrying', { attempt, retries, isTimeout, isNetworkError });
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}

export async function POST(request: NextRequest) {
  logger.info('📥 LLM Research request received', {
    url: request.url,
    method: request.method,
  });
  
  try {
    const body = await parseJsonBody<{
      keywords: string[];
      prompts?: string[];
      llm_models?: string[];
      max_tokens?: number;
      location?: string;
      language?: string;
      include_consensus?: boolean;
      include_sources?: boolean;
      research_type?: "quick" | "comprehensive" | "fact_check" | "content_research";
    }>(request);
    
    // Validate required fields
    if (!body.keywords || !Array.isArray(body.keywords) || body.keywords.length === 0) {
      return NextResponse.json(
        { error: 'keywords array is required and must not be empty' },
        { status: 422 }
      );
    }
    
    // Validate max keywords (10 per API spec)
    if (body.keywords.length > 10) {
      return NextResponse.json(
        { error: 'Cannot research more than 10 keywords at once. Received ' + body.keywords.length + ' keywords.' },
        { status: 422 }
      );
    }
    
    const requestBody = {
      keywords: body.keywords,
      prompts: body.prompts,
      llm_models: body.llm_models || ["chatgpt", "claude", "gemini"],
      max_tokens: body.max_tokens || 500,
      location: body.location || 'United States',
      language: body.language || 'en',
      include_consensus: body.include_consensus !== false, // Default: true
      include_sources: body.include_sources !== false, // Default: true
      research_type: body.research_type || 'comprehensive',
    };
    
    const endpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/llm-research`;
    
    // Wake up Cloud Run before making API call
    logger.info('🌅 Checking Cloud Run health before LLM research call...');
    try {
      const healthStatus = await cloudRunHealth.checkHealth();
      logger.info('📊 Cloud Run Status:', {
        isHealthy: healthStatus.isHealthy,
        isWakingUp: healthStatus.isWakingUp,
        error: healthStatus.error,
      });

      if (!healthStatus.isHealthy && !healthStatus.isWakingUp) {
        logger.info('⏳ Cloud Run not healthy, attempting wake-up...');
        await cloudRunHealth.wakeUpAndWait();
      }
    } catch (healthError) {
      logger.warn('⚠️ Cloud Run health check failed, continuing anyway', {
        error: healthError instanceof Error ? healthError.message : String(healthError),
      });
    }
    
    logger.info('🔍 Calling LLM research endpoint', {
      endpoint,
      keywords: body.keywords,
      research_type: requestBody.research_type,
    });
    
    try {
      const response = await fetchWithRetry(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const errorText = await response.text();
        let errorMessage = `LLM Research API error: ${response.status} ${response.statusText}`;
        
        // Check if endpoint doesn't exist (404)
        if (response.status === 404 || contentType.includes('text/html') || errorText.includes('Not Found')) {
          logger.warn('⚠️ LLM Research endpoint not found on backend (404)', {
            endpoint,
            status: response.status,
          });
          return NextResponse.json(
            { 
              error: 'LLM Research endpoint is not available on the backend. This feature may not be implemented yet.',
              endpoint_not_found: true,
            },
            { status: 404 }
          );
        }
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        logger.error('LLM Research API error', {
          status: response.status,
          errorMessage,
        });
        
        return NextResponse.json(
          { error: errorMessage },
          { status: response.status }
        );
      }
      
      const data = await response.json();
      
      logger.info('✅ LLM Research completed successfully', {
        keywordsResearched: data.summary?.total_keywords_researched || 0,
        totalPrompts: data.summary?.total_prompts || 0,
      });
      
      return NextResponse.json(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ LLM Research error', {
        error: errorMessage,
      });
      
      return NextResponse.json(
        { error: `Failed to perform LLM research: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('❌ LLM Research request error', {
      error: errorMessage,
      stack: errorStack,
      context: 'llm-research',
    });
    return NextResponse.json(
      { error: `Failed to process LLM research request: ${errorMessage}` },
      { status: 500 }
    );
  }
}



