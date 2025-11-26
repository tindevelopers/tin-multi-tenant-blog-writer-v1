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
    
    // Use AI Topic Suggestions streaming instead of LLM Research (endpoint not available)
    const endpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/ai-topic-suggestions/stream`;
    
    // Wake up Cloud Run before making API call
    logger.info('🌅 Checking Cloud Run health before AI topic suggestions streaming call...');
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
    
    // Transform LLM Research request to AI Topic Suggestions format
    const aiTopicSuggestionsBody = {
      keywords: body.keywords,
      location: requestBody.location,
      language: requestBody.language,
      include_ai_search_volume: true,
      include_llm_mentions: true,
      include_llm_responses: requestBody.include_sources,
      limit: 50,
    };
    
    logger.info('🔍 Calling AI Topic Suggestions streaming endpoint (as LLM Research replacement)', {
      endpoint,
      keywords: body.keywords,
    });
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (process.env.BLOG_WRITER_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.BLOG_WRITER_API_KEY}`;
        headers['X-API-Key'] = process.env.BLOG_WRITER_API_KEY;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(aiTopicSuggestionsBody),
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const errorText = await response.text();
        let errorMessage = `AI Topic Suggestions API error: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        logger.error('AI Topic Suggestions API error', {
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
      // Note: The response format from AI Topic Suggestions may differ from LLM Research
      // The client should handle the transformation or we transform it here
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          
          if (!reader) {
            controller.close();
            return;
          }
          
          try {
            let buffer = '';
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                // Send completion event
                const completeMessage = `data: ${JSON.stringify({ type: 'complete', message: 'Stream completed' })}\n\n`;
                controller.enqueue(encoder.encode(completeMessage));
                controller.close();
                break;
              }
              
              // Decode and forward chunks
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (line.trim()) {
                  // Forward SSE events as-is
                  controller.enqueue(encoder.encode(line + '\n'));
                }
              }
            }
          } catch (error) {
            logger.error('Error streaming AI topic suggestions response', { error });
            const errorMessage = `data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Streaming error' })}\n\n`;
            controller.enqueue(encoder.encode(errorMessage));
            controller.close();
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



