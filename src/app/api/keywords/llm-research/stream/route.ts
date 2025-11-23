import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { parseJsonBody } from '@/lib/api-utils';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import cloudRunHealth from '@/lib/cloud-run-health';

export async function POST(request: NextRequest) {
  logger.info('📥 LLM Research streaming request received', {
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
      return new Response(
        JSON.stringify({ error: 'keywords array is required and must not be empty' }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate max keywords (10 per API spec)
    if (body.keywords.length > 10) {
      return new Response(
        JSON.stringify({ error: 'Cannot research more than 10 keywords at once. Received ' + body.keywords.length + ' keywords.' }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const requestBody = {
      keywords: body.keywords,
      prompts: body.prompts,
      llm_models: body.llm_models || ["chatgpt", "claude", "gemini"],
      max_tokens: body.max_tokens || 500,
      location: body.location || 'United States',
      language: body.language || 'en',
      include_consensus: body.include_consensus !== false,
      include_sources: body.include_sources !== false,
      research_type: body.research_type || 'comprehensive',
    };
    
    const endpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/llm-research/stream`;
    
    // Wake up Cloud Run before making API call
    logger.info('🌅 Checking Cloud Run health before LLM research streaming call...');
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
    
    logger.info('🔍 Calling LLM research streaming endpoint', {
      endpoint,
      keywords: body.keywords,
    });
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const errorText = await response.text();
        let errorMessage = `LLM Research API error: ${response.status} ${response.statusText}`;
        
        // Check if endpoint doesn't exist (404)
        if (response.status === 404 || contentType.includes('text/html') || errorText.includes('Not Found')) {
          logger.warn('⚠️ LLM Research streaming endpoint not found on backend (404)', {
            endpoint,
            status: response.status,
          });
          return new Response(
            JSON.stringify({ 
              type: 'error', 
              error: 'LLM Research endpoint is not available on the backend. This feature may not be implemented yet.',
              endpoint_not_found: true,
            }),
            { 
              status: 404,
              headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
              }
            }
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
        
        return new Response(
          JSON.stringify({ type: 'error', error: errorMessage }),
          { 
            status: response.status,
            headers: { 
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
            }
          }
        );
      }
      
      // Stream the response back to the client
      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          
          if (!reader) {
            controller.close();
            return;
          }
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                controller.close();
                break;
              }
              
              // Forward the chunk to the client
              controller.enqueue(value);
            }
          } catch (error) {
            logger.error('Error streaming LLM research response', { error });
            controller.error(error);
          }
        },
      });
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ LLM Research streaming error', {
        error: errorMessage,
      });
      
      return new Response(
        JSON.stringify({ type: 'error', error: `Failed to stream LLM research: ${errorMessage}` }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('❌ LLM Research streaming request error', {
      error: errorMessage,
      context: 'llm-research-stream',
    });
    return new Response(
      JSON.stringify({ type: 'error', error: `Failed to process LLM research streaming request: ${errorMessage}` }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}



