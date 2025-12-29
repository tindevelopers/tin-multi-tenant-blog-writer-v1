/**
 * API Route: LLM Generation
 * 
 * POST /api/llm/generate
 * 
 * Proxies LLM generation requests to the backend Blog Writer API.
 * Used by the workflow engine for phase execution.
 * Supports multiple LLM models via LiteLLM backend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { handleApiError } from '@/lib/api-utils';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

/**
 * Message format for chat completions
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Request body for LLM generation
 */
interface GenerateRequest {
  /** Model to use (e.g., 'gpt-4o', 'claude-3-5-sonnet') */
  model: string;
  /** Chat messages */
  messages: ChatMessage[];
  /** Temperature (0-1) */
  temperature?: number;
  /** Maximum tokens to generate */
  max_tokens?: number;
  /** Stop sequences */
  stop?: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: GenerateRequest = await request.json();
    const {
      model = 'gpt-4o',
      messages,
      temperature = 0.7,
      max_tokens = 4000,
      stop,
    } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    logger.debug('LLM generate request', {
      userId: user.id,
      model,
      messageCount: messages.length,
      temperature,
      maxTokens: max_tokens,
    });

    // Try the backend LLM chat endpoint
    const backendEndpoint = `${BLOG_WRITER_API_URL}/api/v1/llm/chat`;

    try {
      const backendResponse = await fetch(backendEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens,
          ...(stop && { stop }),
        }),
        signal: AbortSignal.timeout(120000), // 2 minute timeout
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json().catch(() => ({ 
          detail: backendResponse.statusText 
        }));
        
        logger.error('Backend LLM generation failed', {
          status: backendResponse.status,
          error: errorData,
          userId: user.id,
        });

        // If backend LLM endpoint doesn't exist, try the generate endpoint
        if (backendResponse.status === 404) {
          return await handleFallbackGeneration(body, user.id);
        }

        return NextResponse.json(
          { 
            error: 'LLM generation failed', 
            details: errorData.detail || errorData.error || 'Unknown error' 
          },
          { status: backendResponse.status }
        );
      }

      const backendData = await backendResponse.json();

      // Extract content from response
      // Backend may return in different formats depending on the model
      let content = '';
      if (backendData.content) {
        content = backendData.content;
      } else if (backendData.choices?.[0]?.message?.content) {
        content = backendData.choices[0].message.content;
      } else if (backendData.text) {
        content = backendData.text;
      } else if (typeof backendData === 'string') {
        content = backendData;
      }

      logger.debug('LLM generation completed', {
        userId: user.id,
        model: backendData.model || model,
        contentLength: content.length,
        cached: backendData.cached,
      });

      return NextResponse.json({
        content,
        model: backendData.model || model,
        usage: backendData.usage ? {
          prompt_tokens: backendData.usage.prompt_tokens || 0,
          completion_tokens: backendData.usage.completion_tokens || 0,
          total_tokens: backendData.usage.total_tokens || 0,
        } : undefined,
        cached: backendData.cached || false,
      });
    } catch (backendError: unknown) {
      const errorMessage = backendError instanceof Error 
        ? backendError.message 
        : String(backendError);
      
      logger.error('Backend LLM request error', {
        error: errorMessage,
        userId: user.id,
      });

      // Try fallback generation
      return await handleFallbackGeneration(body, user.id);
    }
  } catch (error) {
    logger.error('Error in LLM generate route', { error });
    return handleApiError(error);
  }
}

/**
 * Fallback generation using the blog writer generate endpoint
 */
async function handleFallbackGeneration(
  body: GenerateRequest, 
  userId: string
): Promise<NextResponse> {
  const { model, messages, temperature, max_tokens } = body;

  logger.debug('Attempting fallback generation', { userId, model });

  // Extract the user message content for the prompt
  const userMessage = messages.find(m => m.role === 'user');
  const systemMessage = messages.find(m => m.role === 'system');

  if (!userMessage) {
    return NextResponse.json(
      { error: 'No user message found' },
      { status: 400 }
    );
  }

  // Try using the content generation endpoint as fallback
  const fallbackEndpoint = `${BLOG_WRITER_API_URL}/api/v1/content/generate`;

  try {
    const fallbackResponse = await fetch(fallbackEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        prompt: userMessage.content,
        system_prompt: systemMessage?.content,
        model,
        temperature,
        max_tokens,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!fallbackResponse.ok) {
      const errorData = await fallbackResponse.json().catch(() => ({}));
      
      return NextResponse.json(
        { 
          error: 'Fallback LLM generation failed',
          details: errorData.detail || errorData.error || 'All LLM endpoints unavailable',
        },
        { status: fallbackResponse.status }
      );
    }

    const fallbackData = await fallbackResponse.json();

    // Extract content from fallback response
    let content = '';
    if (fallbackData.content) {
      content = fallbackData.content;
    } else if (fallbackData.generated_content) {
      content = fallbackData.generated_content;
    } else if (fallbackData.text) {
      content = fallbackData.text;
    } else if (typeof fallbackData === 'string') {
      content = fallbackData;
    }

    logger.debug('Fallback generation completed', {
      userId,
      model: fallbackData.model || model,
      contentLength: content.length,
    });

    return NextResponse.json({
      content,
      model: fallbackData.model || model,
      usage: fallbackData.usage,
      fallback: true,
    });
  } catch (fallbackError: unknown) {
    const errorMessage = fallbackError instanceof Error 
      ? fallbackError.message 
      : String(fallbackError);
    
    logger.error('Fallback generation failed', {
      error: errorMessage,
      userId,
    });

    return NextResponse.json(
      { 
        error: 'All LLM generation methods failed',
        details: errorMessage,
      },
      { status: 503 }
    );
  }
}

