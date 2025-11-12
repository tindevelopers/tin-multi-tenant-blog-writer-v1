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
    
    // Always use enhanced endpoint to get search volume data
    // Enhanced endpoint provides comprehensive keyword analysis including search_volume
    const endpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/enhanced`;
    
    // Ensure location is included (default to United States)
    const requestBody = {
      keywords: body.keywords || [],
      location: body.location || 'United States',
      language: body.language || 'en',
      include_serp: body.include_serp || false,
      // Set max_suggestions_per_keyword to 0 if not provided (for basic analysis)
      // or use provided value (for comprehensive research with suggestions)
      max_suggestions_per_keyword: body.max_suggestions_per_keyword || 0,
      // Include any additional fields from body
      ...(body.text && { text: body.text }),
    };
    
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
            
            // Handle different error formats
            if (errorData.error) {
              // If error is an object, stringify it properly
              if (typeof errorData.error === 'object' && errorData.error !== null) {
                errorMessage = JSON.stringify(errorData.error);
              } 
              // If error is already a string but contains [object Object], try to get more details
              else if (typeof errorData.error === 'string' && errorData.error.includes('[object Object]')) {
                // Try to get detail or message fields, or stringify the whole errorData
                errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
              } 
              // Otherwise use the error string as-is
              else {
                errorMessage = String(errorData.error);
              }
            } else if (errorData.detail) {
              errorMessage = typeof errorData.detail === 'object' 
                ? JSON.stringify(errorData.detail) 
                : String(errorData.detail);
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
    
    // Return full response including new fields: total_keywords, original_keywords, suggested_keywords
    // Map for backward compatibility
    return NextResponse.json({
      ...data,
      keyword_analysis: data.enhanced_analysis || data.keyword_analysis || data,
      total_keywords: data.total_keywords,
      original_keywords: data.original_keywords || [],
      suggested_keywords: data.suggested_keywords || []
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

