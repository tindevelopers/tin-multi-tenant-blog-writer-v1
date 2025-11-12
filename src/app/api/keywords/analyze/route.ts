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
    
    // Support enhanced analysis with max_suggestions_per_keyword
    // If max_suggestions_per_keyword is provided, use enhanced endpoint
    const useEnhanced = body.max_suggestions_per_keyword && body.max_suggestions_per_keyword > 0;
    const endpoint = useEnhanced 
      ? `${BLOG_WRITER_API_URL}/api/v1/keywords/enhanced`
      : `${BLOG_WRITER_API_URL}/api/v1/keywords/analyze`;
    
    const response = await fetchWithRetry(
      endpoint,
      {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

