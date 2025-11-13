import { NextRequest, NextResponse } from 'next/server';

const BLOG_WRITER_API_URL = process.env.BLOG_WRITER_API_URL || 
  'https://blog-writer-api-dev-613248238610.europe-west1.run.app';

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
        console.log(`⚠️ Cloud Run returned 503, retrying (${attempt}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        continue;
      }
      
      return response;
    } catch (error: unknown) {
      const isTimeout = error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'));
      const isNetworkError = error instanceof TypeError;
      
      if ((isTimeout || isNetworkError) && attempt < retries) {
        console.log(`⚠️ Network error, retrying (${attempt}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
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
    
    // Validate optimal batch size for long-tail keyword research (20 keywords max)
    // Reduced from 30 to improve performance and reduce timeout risk with higher suggestion counts
    const OPTIMAL_BATCH_SIZE = 20;
    if (normalizedKeywords.length > OPTIMAL_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Cannot analyze more than ${OPTIMAL_BATCH_SIZE} keywords at once for optimal long-tail results. Received ${normalizedKeywords.length} keywords. Please batch your requests.` },
        { status: 422 }
      );
    }
    
    // Try enhanced endpoint first, fallback to regular if unavailable
    // Enhanced endpoint requires max_suggestions_per_keyword >= 5
    // Default to 75 for optimal long-tail keyword research
    const DEFAULT_MAX_SUGGESTIONS = 75; // Optimal for long-tail keyword discovery
    
    const maxSuggestions = body.max_suggestions_per_keyword !== undefined && body.max_suggestions_per_keyword >= 5
      ? Math.min(150, body.max_suggestions_per_keyword) // Cap at API maximum
      : DEFAULT_MAX_SUGGESTIONS; // Default to 75 for optimal long-tail results
    
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
    
    // Try enhanced endpoint first
    let endpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/enhanced`;
    let response = await fetchWithRetry(
      endpoint,
      {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
        body: JSON.stringify(requestBody),
      }
    );
    
    // If enhanced endpoint returns 503 (not available), fallback to regular endpoint
    if (response.status === 503) {
      console.log('⚠️ Enhanced endpoint unavailable, falling back to regular endpoint');
      endpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/analyze`;
      // Regular endpoint doesn't support enhanced features, remove them
      const { 
        max_suggestions_per_keyword, 
        include_search_volume,
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
      response = await fetchWithRetry(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(regularRequestWithVolume),
        }
      );
    }

    if (!response.ok) {
      // Clone the response so we can read it multiple times
      const responseClone = response.clone();
      let errorMessage = `Blog Writer API error: ${response.status} ${response.statusText}`;
      
      try {
        // Try to get the response text first
        const responseText = await response.text();
        console.error(`❌ Blog Writer API error response body (raw):`, responseText);
        
        if (responseText) {
          try {
            // Try to parse as JSON
            const errorData = JSON.parse(responseText);
            console.error(`❌ Blog Writer API error data (parsed):`, errorData);
            
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
        console.error(`❌ Failed to parse error response:`, parseError);
        // Use default error message
      }
      
      console.error(`❌ Blog Writer API error (${response.status}):`, errorMessage);
      console.error(`❌ Request body sent:`, JSON.stringify(requestBody, null, 2));
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    
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
    return NextResponse.json({
      ...data,
      // Backward compatibility mapping - use enhanced_analysis if available, otherwise keyword_analysis
      keyword_analysis: data.enhanced_analysis || data.keyword_analysis || data,
      // Enhanced endpoint fields (may be undefined for regular endpoint)
      enhanced_analysis: data.enhanced_analysis,
      total_keywords: data.total_keywords,
      original_keywords: data.original_keywords || [],
      suggested_keywords: data.suggested_keywords || [],
      clusters: data.clusters || [],
      cluster_summary: data.cluster_summary || null
    });
  } catch (error: unknown) {
    console.error('Error in keywords/analyze:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to analyze keywords: ${errorMessage}` },
      { status: 500 }
    );
  }
}

