import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { parseJsonBody } from '@/lib/api-utils';
import { createClient } from '@/lib/supabase/server';
import { applyTestingLimits, limitResponseData, TESTING_MODE, getTestingModeIndicator } from '@/lib/testing-config';

import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 40000); // 40 second timeout for analyze
      
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
  logger.info('📥 Keywords analyze request received', {
    url: request.url,
    method: request.method,
  });
  
  try {
    const body = await parseJsonBody<{
      keywords: Array<string | { keyword?: string; [key: string]: unknown }>;
      location?: string;
      language?: string;
      max_suggestions_per_keyword?: number;
      include_search_volume?: boolean;
      include_serp?: boolean;
      include_trends?: boolean;
      include_keyword_ideas?: boolean;
      include_relevant_pages?: boolean;
      include_serp_ai_summary?: boolean;
      competitor_domain?: string;
      // New fields for search persistence
      search_query?: string;
      search_type?: 'how_to' | 'listicle' | 'product' | 'brand' | 'comparison' | 'qa' | 'evergreen' | 'seasonal' | 'general';
      niche?: string;
      search_mode?: 'keywords' | 'matching_terms' | 'related_terms' | 'questions' | 'ads_ppc';
      save_search?: boolean;
      filters?: Record<string, unknown>;
    }>(request);
    
    // Validate required fields per FRONTEND_API_INTEGRATION_GUIDE.md
    if (!body.keywords || !Array.isArray(body.keywords) || body.keywords.length === 0) {
      return NextResponse.json(
        { error: 'keywords array is required and must not be empty' },
        { status: 422 }
      );
    }
    
    // Normalize keywords array: extract strings from objects if needed
    // Frontend may send objects like {keyword: "text", search_volume: null, ...} or strings
    const normalizedKeywords: string[] = body.keywords.map((kw: string | { keyword?: string; [key: string]: unknown }) => {
      if (typeof kw === 'string') {
        return kw;
      }
      if (typeof kw === 'object' && kw !== null && 'keyword' in kw && typeof kw.keyword === 'string') {
        return kw.keyword;
      }
      // Fallback: try to stringify if it's an object with other properties
      if (typeof kw === 'object' && kw !== null) {
        const stringified = String(kw);
        if (stringified !== '[object Object]') {
          return stringified;
        }
      }
      return String(kw);
    }).filter((kw: string) => kw && kw.trim().length > 0); // Remove empty strings
    
    if (normalizedKeywords.length === 0) {
      return NextResponse.json(
        { error: 'No valid keywords found after normalization. Keywords must be strings or objects with a "keyword" property.' },
        { status: 422 }
      );
    }
    
    // Validate optimal batch size for long-tail keyword research
    // Apply testing limits if in testing mode
    const OPTIMAL_BATCH_SIZE = TESTING_MODE ? 5 : 20; // Reduced to 5 in testing mode
    if (normalizedKeywords.length > OPTIMAL_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Cannot analyze more than ${OPTIMAL_BATCH_SIZE} keywords at once${TESTING_MODE ? ' (testing mode)' : ' for optimal long-tail results'}. Received ${normalizedKeywords.length} keywords. Please batch your requests.` },
        { status: 422 }
      );
    }
    
    // Try enhanced endpoint first, fallback to regular if unavailable
    // Enhanced endpoint requires max_suggestions_per_keyword >= 5
    // Apply testing limits if in testing mode
    const DEFAULT_MAX_SUGGESTIONS = TESTING_MODE ? 5 : 75; // Reduced to 5 in testing mode
    const MAX_SUGGESTIONS_CAP = TESTING_MODE ? 5 : 150; // Reduced cap in testing mode
    
    const maxSuggestions = body.max_suggestions_per_keyword !== undefined && body.max_suggestions_per_keyword >= 5
      ? Math.min(MAX_SUGGESTIONS_CAP, body.max_suggestions_per_keyword) // Cap at testing limit or API maximum
      : DEFAULT_MAX_SUGGESTIONS; // Default based on testing mode
    
    const requestBody: {
      keywords: string[];
      location?: string;
      language?: string;
      include_serp?: boolean;
      max_suggestions_per_keyword: number;
      include_search_volume?: boolean; // Explicitly request search volume data
      // Enhanced endpoint parameters (v1.3.0)
      include_trends?: boolean;
      include_keyword_ideas?: boolean;
      include_relevant_pages?: boolean;
      include_serp_ai_summary?: boolean;
      competitor_domain?: string;
    } = {
      keywords: normalizedKeywords,
      location: body.location || 'United States',
      language: body.language || 'en',
      include_serp: body.include_serp || false,
      max_suggestions_per_keyword: maxSuggestions,
      include_search_volume: true, // Always request search volume for enhanced endpoint
      // Forward enhanced endpoint parameters if provided
      include_trends: body.include_trends,
      include_keyword_ideas: body.include_keyword_ideas,
      include_relevant_pages: body.include_relevant_pages,
      include_serp_ai_summary: body.include_serp_ai_summary,
      competitor_domain: body.competitor_domain,
    };
    
    // Apply testing limits if in testing mode
    const limitedRequestBody = applyTestingLimits(requestBody);
    
    if (TESTING_MODE) {
      logger.info('🧪 Testing Mode: Applying data limits', {
        originalKeywords: Array.isArray(requestBody.keywords) ? requestBody.keywords.length : 1,
        limitedKeywords: Array.isArray(limitedRequestBody.keywords) ? limitedRequestBody.keywords.length : 1,
        maxSuggestions: limitedRequestBody.max_suggestions_per_keyword,
      });
    }
    
    // Strategy: Call both endpoints to get comprehensive results
    // Enhanced endpoint provides richer data, regular endpoint provides baseline data
    // We'll merge them intelligently
    
    let enhancedResponse: Response | null = null;
    let regularResponse: Response | null = null;
    let enhancedData: any = null;
    let regularData: any = null;
    
    // Try enhanced endpoint first
    const enhancedEndpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/enhanced`;
    logger.info('🔍 Calling enhanced endpoint', {
      endpoint: enhancedEndpoint,
      keywords: normalizedKeywords,
      location: body.location,
      language: body.language,
    });
    
    try {
      enhancedResponse = await fetchWithRetry(
        enhancedEndpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(limitedRequestBody),
        }
      );
      
      if (enhancedResponse.ok) {
        enhancedData = await enhancedResponse.json();
        logger.debug('✅ Enhanced endpoint returned data', {
          hasEnhancedAnalysis: !!enhancedData.enhanced_analysis,
          keywordCount: Object.keys(enhancedData.enhanced_analysis || {}).length,
        });
      } else if (enhancedResponse.status !== 503) {
        // If it's not 503, log the error but continue to try regular endpoint
        logger.warn('Enhanced endpoint returned non-OK status', { 
          status: enhancedResponse.status 
        });
      }
    } catch (error) {
      logger.debug('Enhanced endpoint failed, will try regular endpoint', { error });
    }
    
    // Always try regular endpoint to get baseline data and fill any gaps
    const regularEndpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/analyze`;
    logger.info('🔍 Calling regular endpoint', {
      endpoint: regularEndpoint,
      keywords: normalizedKeywords,
      location: body.location,
      language: body.language,
    });
    
    try {
      // Regular endpoint doesn't support enhanced features, remove them
      const { 
        max_suggestions_per_keyword, 
        include_search_volume,
        include_serp,
        include_trends,
        include_keyword_ideas,
        include_relevant_pages,
        include_serp_ai_summary,
        competitor_domain,
        ...regularRequestBody 
      } = requestBody;
      
      // Add include_search_volume to regular endpoint if it supports it
      const regularRequestWithVolume = {
        ...regularRequestBody,
        include_search_volume: true, // Try to get search volume from regular endpoint too
      };
      
      // Apply testing limits to regular request as well
      const limitedRegularRequest = applyTestingLimits(regularRequestWithVolume);
      
      regularResponse = await fetchWithRetry(
        regularEndpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(limitedRegularRequest),
        }
      );
      
      if (regularResponse.ok) {
        try {
          regularData = await regularResponse.json();
          logger.debug('✅ Regular endpoint returned data', {
            hasKeywordAnalysis: !!regularData.keyword_analysis,
            keywordCount: Object.keys(regularData.keyword_analysis || {}).length,
            status: regularResponse.status,
          });
        } catch (parseError) {
          logger.error('Failed to parse regular endpoint response', { 
            error: parseError,
            status: regularResponse.status 
          });
          // Try to get text response for debugging
          const text = await regularResponse.text();
          logger.error('Regular endpoint response text', { 
            text: text.substring(0, 500) 
          });
        }
      } else {
        logger.warn('Regular endpoint returned non-OK status', { 
          status: regularResponse.status,
          statusText: regularResponse.statusText,
        });
        try {
          const errorText = await regularResponse.text();
          logger.warn('Regular endpoint error response', { 
            errorText: errorText.substring(0, 500) 
          });
        } catch {
          // Ignore parse errors
        }
      }
    } catch (error) {
      logger.debug('Regular endpoint failed', { error });
    }
    
    // Merge results: Enhanced takes priority, but fill gaps from regular
    let mergedData: any = {};
    let response: Response;
    let hasData = false;
    
    if (enhancedData && enhancedResponse?.ok) {
      // Use enhanced data as base
      mergedData = { ...enhancedData };
      response = enhancedResponse;
      hasData = true;
      
      logger.debug('✅ Enhanced endpoint returned data', {
        hasEnhancedAnalysis: !!mergedData.enhanced_analysis,
        keywordCount: Object.keys(mergedData.enhanced_analysis || {}).length,
      });
      
      // Merge in any missing data from regular endpoint
      if (regularData && regularResponse?.ok) {
        logger.debug('🔄 Merging enhanced and regular endpoint results');
        
        // Merge keyword_analysis if enhanced doesn't have it or has gaps
        if (regularData.keyword_analysis) {
          const enhancedAnalysis = mergedData.enhanced_analysis || {};
          const regularAnalysis = regularData.keyword_analysis || {};
          
          // For each keyword in regular, add if missing in enhanced or fill gaps
          Object.entries(regularAnalysis).forEach(([keyword, kwData]: [string, any]) => {
            if (!enhancedAnalysis[keyword]) {
              // Keyword not in enhanced, add from regular
              enhancedAnalysis[keyword] = kwData;
            } else {
              // Keyword exists in both, merge data (enhanced takes priority, but fill nulls)
              const enhancedKw = enhancedAnalysis[keyword];
              Object.entries(kwData).forEach(([field, value]: [string, any]) => {
                if (enhancedKw[field] === null || enhancedKw[field] === undefined || enhancedKw[field] === 0) {
                  if (value !== null && value !== undefined) {
                    enhancedKw[field] = value;
                  }
                }
              });
            }
          });
          
          mergedData.enhanced_analysis = enhancedAnalysis;
        }
        
        // Merge clusters if enhanced doesn't have them
        if (!mergedData.clusters && regularData.clusters) {
          mergedData.clusters = regularData.clusters;
        }
        
        // Merge other fields
        if (!mergedData.suggested_keywords && regularData.suggested_keywords) {
          mergedData.suggested_keywords = regularData.suggested_keywords;
        }
        
        if (!mergedData.original_keywords && regularData.original_keywords) {
          mergedData.original_keywords = regularData.original_keywords;
        }
        
        // Merge location info if enhanced doesn't have it
        if (!mergedData.location && regularData.location) {
          mergedData.location = regularData.location;
        }
      }
    } else if (regularData && regularResponse?.ok) {
      // Fallback to regular data if enhanced failed
      mergedData = { ...regularData };
      response = regularResponse;
      hasData = true;
      logger.debug('⚠️ Using regular endpoint data only (enhanced unavailable)', {
        hasKeywordAnalysis: !!mergedData.keyword_analysis,
        keywordCount: Object.keys(mergedData.keyword_analysis || {}).length,
      });
    } else {
      // Both failed - use whichever response we have for error handling
      response = enhancedResponse || regularResponse || new Response(null, { status: 503 });
      hasData = false;
      logger.warn('❌ Both endpoints failed', {
        enhancedStatus: enhancedResponse?.status,
        regularStatus: regularResponse?.status,
      });
    }

    // If we don't have data and response is not OK, handle error
    if (!hasData || !response.ok) {
      // Clone the response so we can read it multiple times
      const responseClone = response.clone();
      let errorMessage = `Blog Writer API error: ${response.status} ${response.statusText}`;
      
      try {
        // Try to get the response text first
        const responseText = await response.text();
        logger.error('Blog Writer API error response body', { 
          status: response.status,
          responseText 
        });
        
        if (responseText) {
          try {
            // Try to parse as JSON
            const errorData = JSON.parse(responseText);
            logger.error('Blog Writer API error data (parsed)', { 
              status: response.status,
              errorData 
            });
            
            // Per FRONTEND_API_INTEGRATION_GUIDE.md: errors can have 'detail', 'error', or 'message' fields
            // Priority: detail > error > message (per guide's error handling pattern)
            if (errorData.detail) {
              errorMessage = typeof errorData.detail === 'object' 
                ? JSON.stringify(errorData.detail) 
                : String(errorData.detail);
            } else if (errorData.error) {
              // If error is an object, stringify it properly
              if (typeof errorData.error === 'object' && errorData.error !== null) {
                errorMessage = JSON.stringify(errorData.error);
              } 
              // If error is already a string but contains [object Object], try to get more details
              else if (typeof errorData.error === 'string' && errorData.error.includes('[object Object]')) {
                // Try to get message field or stringify the whole errorData
                errorMessage = errorData.message || JSON.stringify(errorData);
              } 
              // Otherwise use the error string as-is
              else {
                errorMessage = String(errorData.error);
              }
            } else if (errorData.message) {
              errorMessage = typeof errorData.message === 'object'
                ? JSON.stringify(errorData.message)
                : String(errorData.message);
            } else {
              // If it's a JSON object but no standard error fields, stringify it
              errorMessage = JSON.stringify(errorData);
            }
          } catch {
            // If not JSON, use the text directly
            errorMessage = responseText;
          }
        }
      } catch (parseError) {
        logger.error('Failed to parse error response', { 
          status: response.status,
          error: parseError 
        });
        // Use default error message
      }
      
      logger.error('Blog Writer API error', { 
        status: response.status,
        errorMessage,
        requestBody 
      });
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // Use merged data (already parsed from both endpoints)
    let data = mergedData;
    
    // Apply testing limits to response data
    data = limitResponseData(data);
    
    if (TESTING_MODE) {
      logger.info('🧪 Testing Mode: Limited response data', {
        originalKeywords: Object.keys(data.enhanced_analysis || data.keyword_analysis || {}).length,
        limitedKeywords: Object.keys(data.enhanced_analysis || data.keyword_analysis || {}).length,
        clusters: Array.isArray(data.clusters) ? data.clusters.length : 0,
      });
    }
    
    // Save search to database if save_search is true (default) and user is authenticated
    let savedSearchId: string | null = null;
    const shouldSaveSearch = body.save_search !== false; // Default to true
    
    if (shouldSaveSearch) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Calculate aggregate metrics from response
          const enhancedAnalysis = data.enhanced_analysis || data.keyword_analysis || {};
          const keywordEntries = Object.entries(enhancedAnalysis);
          const keywordCount = keywordEntries.length;
          
          let totalSearchVolume = 0;
          let difficultySum = 0;
          let competitionSum = 0;
          let difficultyCount = 0;
          let competitionCount = 0;
          
          keywordEntries.forEach(([_, kwData]: [string, any]) => {
            if (kwData.search_volume) {
              totalSearchVolume += Number(kwData.search_volume) || 0;
            }
            if (kwData.difficulty) {
              // Convert difficulty to numeric for averaging
              const diffMap: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
              difficultySum += diffMap[kwData.difficulty] || 2;
              difficultyCount++;
            }
            if (kwData.competition !== undefined && kwData.competition !== null) {
              competitionSum += Number(kwData.competition) || 0;
              competitionCount++;
            }
          });
          
          const avgDifficulty = difficultyCount > 0 
            ? (difficultySum / difficultyCount <= 1.5 ? 'easy' : difficultySum / difficultyCount <= 2.5 ? 'medium' : 'hard')
            : null;
          const avgCompetition = competitionCount > 0 ? competitionSum / competitionCount : null;
          
          // Extract primary keyword from search query or first keyword
          const searchQuery = body.search_query || normalizedKeywords[0] || '';
          
          const { data: savedSession, error: saveError } = await supabase
            .from('keyword_research_sessions')
            .insert({
              user_id: user.id,
              topic: searchQuery,
              search_query: searchQuery,
              location: body.location || 'United States',
              language: body.language || 'en',
              search_type: body.search_type || 'general',
              niche: body.niche || null,
              search_mode: body.search_mode || 'keywords',
              save_search: shouldSaveSearch,
              filters: body.filters || {},
              research_results: data,
              full_api_response: data,
              keyword_count: keywordCount,
              total_search_volume: totalSearchVolume,
              avg_difficulty: avgDifficulty,
              avg_competition: avgCompetition ? Number(avgCompetition.toFixed(2)) : null,
            })
            .select('id')
            .single();
          
          if (saveError) {
            logger.warn('Failed to save keyword search to database', { error: saveError });
            // Don't fail the request if save fails
          } else if (savedSession) {
            savedSearchId = savedSession.id;
            logger.debug('✅ Saved keyword search to database', { searchId: savedSearchId });
          }
        }
      } catch (saveError) {
        logger.warn('Error saving keyword search', { error: saveError });
        // Don't fail the request if save fails
      }
    }
    
    // Handle response from both endpoints
    // Enhanced endpoint response format per FRONTEND_API_INTEGRATION_GUIDE.md:
    // - enhanced_analysis: Record<string, KeywordAnalysis>
    // - total_keywords: number
    // - original_keywords: string[]
    // - suggested_keywords: string[]
    // - clusters: Array<{ parent_topic, keywords, cluster_score, category_type, keyword_count }>
    // - cluster_summary: { total_keywords, cluster_count, unclustered_count }
    // Regular endpoint returns:
    // - keyword_analysis: Record<string, KeywordAnalysis>
    
    // Return full response including all fields
    // Map for backward compatibility (some code may still expect keyword_analysis)
    const responseData: Record<string, unknown> = {
      ...data,
      // Backward compatibility mapping - use enhanced_analysis if available, otherwise keyword_analysis
      keyword_analysis: data.enhanced_analysis || data.keyword_analysis || data,
      // Enhanced endpoint fields (may be undefined for regular endpoint)
      enhanced_analysis: data.enhanced_analysis,
      total_keywords: data.total_keywords,
      original_keywords: data.original_keywords || [],
      suggested_keywords: data.suggested_keywords || [],
      clusters: data.clusters || [],
      cluster_summary: data.cluster_summary || null,
      // Include saved search ID if search was saved
      saved_search_id: savedSearchId,
    };
    
    // Add testing mode indicator if in testing mode
    const testingIndicator = getTestingModeIndicator();
    if (testingIndicator) {
      responseData.testing_mode = true;
      responseData.testing_mode_indicator = testingIndicator;
    }
    
    return NextResponse.json(responseData);
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'keywords-analyze',
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to analyze keywords: ${errorMessage}` },
      { status: 500 }
    );
  }
}

