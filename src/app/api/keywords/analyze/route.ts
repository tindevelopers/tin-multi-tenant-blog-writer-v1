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
    
    // Validate batch size limit per guide (30 keywords max)
    if (body.keywords.length > 30) {
      return NextResponse.json(
        { error: `Cannot analyze more than 30 keywords at once. Received ${body.keywords.length} keywords. Please batch your requests.` },
        { status: 422 }
      );
    }
    
    // Determine which endpoint to use based on max_suggestions_per_keyword
    // Enhanced endpoint requires max_suggestions_per_keyword >= 5
    // If 0 or undefined, use regular analyze endpoint for basic analysis
    const useEnhanced = body.max_suggestions_per_keyword !== undefined && body.max_suggestions_per_keyword >= 5;
    const endpoint = useEnhanced
      ? `${BLOG_WRITER_API_URL}/api/v1/keywords/enhanced`
      : `${BLOG_WRITER_API_URL}/api/v1/keywords/analyze`;
    
    // Request body - per FRONTEND_API_INTEGRATION_GUIDE.md
    // Note: 'text' field is ignored if keywords are provided, so we don't include it
    const requestBody: {
      keywords: string[];
      location?: string;
      language?: string;
      include_serp?: boolean;
      max_suggestions_per_keyword?: number;
    } = {
      keywords: body.keywords,
      location: body.location || 'United States',
      language: body.language || 'en',
      include_serp: body.include_serp || false,
    };
    
    // Only include max_suggestions_per_keyword for enhanced endpoint (>= 5)
    // Range: 5-150, default: 20 (per guide)
    if (useEnhanced) {
      requestBody.max_suggestions_per_keyword = body.max_suggestions_per_keyword;
    }
    
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
    
    // Enhanced endpoint response format per FRONTEND_API_INTEGRATION_GUIDE.md:
    // - enhanced_analysis: Record<string, KeywordAnalysis>
    // - total_keywords: number
    // - original_keywords: string[]
    // - suggested_keywords: string[]
    // - clusters: Array<{ parent_topic, keywords, cluster_score, category_type, keyword_count }>
    // - cluster_summary: { total_keywords, cluster_count, unclustered_count }
    
    // Return full response including all enhanced fields
    // Map for backward compatibility (some code may still expect keyword_analysis)
    return NextResponse.json({
      ...data,
      // Backward compatibility mapping
      keyword_analysis: data.enhanced_analysis || data.keyword_analysis || data,
      // Enhanced endpoint fields
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

