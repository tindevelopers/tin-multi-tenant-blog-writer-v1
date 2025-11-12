import { NextRequest, NextResponse } from 'next/server';

const BLOG_WRITER_API_URL = process.env.BLOG_WRITER_API_URL || 
  'https://blog-writer-api-dev-613248238610.europe-west1.run.app';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
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
    
    // Cloud Run API expects 'keyword' (singular), not 'keywords' (array)
    // If keywords array is provided, use the first one
    // If keyword is provided, use it directly
    const keyword = body.keywords && Array.isArray(body.keywords) && body.keywords.length > 0
      ? body.keywords[0] // Use first keyword from array
      : body.keyword || null;
    
    if (!keyword) {
      return NextResponse.json(
        { error: 'Keyword is required' },
        { status: 400 }
      );
    }
    
    // Request 150 keywords by default (can be overridden by limit in body)
    const limit = body.limit || 150;
    
    const requestBody: any = {
      keyword: keyword,
      limit: limit,
      include_search_volume: true, // Explicitly request search volume data
      include_difficulty: true,
      include_competition: true,
      include_cpc: true
    };
    
    // Add location if provided (defaults to United States)
    if (body.location) {
      requestBody.location = body.location;
    } else {
      requestBody.location = 'United States'; // Default location
    }
    
    const response = await fetchWithRetry(
      `${BLOG_WRITER_API_URL}/api/v1/keywords/suggest`,
      {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Blog Writer API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Return full response including new fields: suggestions_with_topics, total_suggestions, clusters, cluster_summary
    // Map for backward compatibility
    return NextResponse.json({
      suggestions: data.keyword_suggestions || data.suggestions || [],
      suggestions_with_topics: data.suggestions_with_topics || [],
      keyword_suggestions: data.keyword_suggestions || data.suggestions || [],
      total_suggestions: data.total_suggestions || (data.keyword_suggestions?.length || data.suggestions?.length || 0),
      clusters: data.clusters || [],
      cluster_summary: data.cluster_summary || {}
    });
  } catch (error: unknown) {
    console.error('Error in keywords/suggest:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to fetch keyword suggestions: ${errorMessage}` },
      { status: 500 }
    );
  }
}

