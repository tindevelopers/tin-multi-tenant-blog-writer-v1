import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { parseJsonBody } from '@/lib/api-utils';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

export async function POST(request: NextRequest) {
  logger.info('📥 Keyword analysis streaming request received', {
    url: request.url,
    method: request.method,
  });
  
  try {
    const body = await parseJsonBody<{
      keywords: string[];
      location?: string;
      language?: string;
      search_type?: string;
      include_serp?: boolean;
      max_suggestions_per_keyword?: number;
      serp_depth?: number;
      serp_prompt?: string;
      include_serp_features?: string[];
      serp_analysis_type?: "basic" | "ai_summary" | "both";
      related_keywords_depth?: number;
      related_keywords_limit?: number;
      keyword_ideas_limit?: number;
      keyword_ideas_type?: "all" | "questions" | "topics";
      include_ai_volume?: boolean;
      ai_volume_timeframe?: number;
    }>(request);
    
    // Validate required fields
    if (!body.keywords || !Array.isArray(body.keywords) || body.keywords.length === 0) {
      return new Response(
        JSON.stringify({ error: 'keywords array is required and must not be empty' }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const requestBody = {
      keywords: body.keywords,
      location: body.location || 'United States',
      language: body.language || 'en',
      search_type: body.search_type,
      include_serp: body.include_serp || false,
      max_suggestions_per_keyword: body.max_suggestions_per_keyword || 75,
      serp_depth: body.serp_depth,
      serp_prompt: body.serp_prompt,
      include_serp_features: body.include_serp_features,
      serp_analysis_type: body.serp_analysis_type,
      related_keywords_depth: body.related_keywords_depth,
      related_keywords_limit: body.related_keywords_limit,
      keyword_ideas_limit: body.keyword_ideas_limit,
      keyword_ideas_type: body.keyword_ideas_type,
      include_ai_volume: body.include_ai_volume,
      ai_volume_timeframe: body.ai_volume_timeframe,
    };
    
    const endpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/enhanced/stream`;
    logger.info('🔍 Calling keyword analysis streaming endpoint', {
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
        const errorText = await response.text();
        let errorMessage = `Keyword Analysis API error: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        logger.error('Keyword Analysis API error', {
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
            logger.error('Error streaming keyword analysis response', { error });
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
      logger.error('❌ Keyword analysis streaming error', {
        error: errorMessage,
      });
      
      return new Response(
        JSON.stringify({ type: 'error', error: `Failed to stream keyword analysis: ${errorMessage}` }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('❌ Keyword analysis streaming request error', {
      error: errorMessage,
      context: 'keywords-analyze-stream',
    });
    return new Response(
      JSON.stringify({ type: 'error', error: `Failed to process keyword analysis streaming request: ${errorMessage}` }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}



