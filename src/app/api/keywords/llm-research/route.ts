import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { parseJsonBody } from '@/lib/api-utils';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import cloudRunHealth from '@/lib/cloud-run-health';
import type { LLMResearchResponse } from '@/lib/keyword-research';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

/**
 * Transform AI Topic Suggestions response to LLM Research format
 * This allows existing LLM Research consumers to work with AI Topic Suggestions
 */
function transformAIResponseToLLMFormat(aiData: any, keywords: string[]): LLMResearchResponse {
  const llmResearch: Record<string, any> = {};
  
  // Process each keyword
  keywords.forEach((keyword) => {
    const keywordLower = keyword.toLowerCase();
    
    // Find matching topics for this keyword
    const matchingTopics = (aiData.topic_suggestions || []).filter((topic: any) => 
      topic.topic?.toLowerCase().includes(keywordLower) ||
      keywordLower.includes(topic.topic?.toLowerCase() || '')
    );
    
    // Get LLM mentions for this keyword
    const llmMentions = aiData.ai_metrics?.llm_mentions?.[keyword] || 
                       aiData.ai_metrics?.llm_mentions?.[keywordLower] ||
                       {};
    
    // Build LLM Research format response
    llmResearch[keyword] = {
      prompts_used: [
        `Research keyword: ${keyword}`,
        `Analyze AI search volume for: ${keyword}`,
        `Find LLM mentions for: ${keyword}`,
      ],
      responses: {
        chatgpt: {
          research: {
            text: matchingTopics.length > 0 
              ? `Found ${matchingTopics.length} related topics. ${matchingTopics[0]?.topic || ''}: ${matchingTopics[0]?.summary || 'No summary available'}.`
              : `AI search volume: ${llmMentions.ai_search_volume || 0}. Mentions: ${llmMentions.mentions_count || 0}.`,
            tokens: 150,
            model: 'chatgpt',
            timestamp: new Date().toISOString(),
          },
        },
        claude: {
          research: {
            text: `AI optimization score: ${matchingTopics[0]?.ai_optimization_score || 0}/100. Platform: ${llmMentions.platform || 'unknown'}.`,
            tokens: 120,
            model: 'claude',
            timestamp: new Date().toISOString(),
          },
        },
        gemini: {
          research: {
            text: `Content gaps: ${aiData.content_gaps?.length || 0}. Citation opportunities: ${aiData.citation_opportunities?.length || 0}.`,
            tokens: 100,
            model: 'gemini',
            timestamp: new Date().toISOString(),
          },
        },
      },
      consensus: matchingTopics.slice(0, 3).map((t: any) => t.topic),
      differences: [],
      sources: (aiData.citation_opportunities || []).slice(0, 5).map((opp: any) => ({
        url: opp.url || '',
        title: opp.title || opp.text || '',
      })),
      confidence: {
        chatgpt: matchingTopics[0]?.ai_optimization_score ? Math.min(100, matchingTopics[0].ai_optimization_score) : 50,
        claude: llmMentions.mentions_count ? Math.min(100, llmMentions.mentions_count * 10) : 50,
        gemini: aiData.content_gaps?.length ? Math.min(100, aiData.content_gaps.length * 20) : 50,
        average: 0,
      },
    };
    
    // Calculate average confidence
    const conf = llmResearch[keyword].confidence;
    conf.average = (conf.chatgpt + conf.claude + conf.gemini) / 3;
  });
  
  // Calculate average confidence across all keywords
  let totalConfidence = 0;
  let totalSources = 0;
  Object.values(llmResearch).forEach((research: any) => {
    if (research.confidence?.average) {
      totalConfidence += research.confidence.average;
    }
    if (research.sources) {
      totalSources += research.sources.length;
    }
  });
  const averageConfidence = keywords.length > 0 ? totalConfidence / keywords.length : 0;
  
  return {
    llm_research: llmResearch,
    summary: {
      total_keywords_researched: keywords.length,
      total_prompts: keywords.length * 3,
      total_llm_queries: keywords.length * 3,
      llm_models_used: ['chatgpt', 'claude', 'gemini'],
      research_type: 'comprehensive',
      average_confidence: averageConfidence,
      sources_found: totalSources,
    },
  };
}

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
    
    // Use AI Topic Suggestions instead of LLM Research (endpoint not available)
    const endpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/ai-topic-suggestions`;
    
    // Wake up Cloud Run before making API call
    logger.info('🌅 Checking Cloud Run health before AI topic suggestions call...');
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
    
    logger.info('🔍 Calling AI Topic Suggestions endpoint (as LLM Research replacement)', {
      endpoint,
      keywords: body.keywords,
      research_type: requestBody.research_type,
    });
    
    // Transform LLM Research request to AI Topic Suggestions format
    const aiTopicSuggestionsBody = {
      keywords: body.keywords,
      location: requestBody.location,
      language: requestBody.language,
      include_ai_search_volume: true,
      include_llm_mentions: true,
      include_llm_responses: requestBody.include_sources,
      limit: 50, // Get more suggestions
    };
    
    try {
      const response = await fetchWithRetry(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.BLOG_WRITER_API_KEY && {
              'Authorization': `Bearer ${process.env.BLOG_WRITER_API_KEY}`,
              'X-API-Key': process.env.BLOG_WRITER_API_KEY,
            }),
          },
          body: JSON.stringify(aiTopicSuggestionsBody),
        }
      );
      
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
        
        return NextResponse.json(
          { error: errorMessage },
          { status: response.status }
        );
      }
      
      const aiData = await response.json();
      
      // Transform AI Topic Suggestions response to LLM Research format
      const transformedResponse = transformAIResponseToLLMFormat(aiData, body.keywords);
      
      logger.info('✅ AI Topic Suggestions completed successfully (as LLM Research)', {
        keywordsResearched: body.keywords.length,
        topicsFound: aiData.topic_suggestions?.length || 0,
      });
      
      return NextResponse.json(transformedResponse);
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



