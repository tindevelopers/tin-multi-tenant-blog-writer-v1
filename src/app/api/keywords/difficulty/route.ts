import { NextRequest, NextResponse } from 'next/server';

const BLOG_WRITER_API_URL = process.env.BLOG_WRITER_API_URL || 
  'https://blog-writer-api-dev-613248238610.europe-west1.run.app';

export interface KeywordDifficultyRequest {
  keyword: string;
  search_volume?: number;
  difficulty?: number;
  competition?: number;
  location?: string;
  language?: string;
}

export interface KeywordDifficultyResponse {
  keyword: string;
  overall_difficulty: number;
  domain_authority_required: number;
  backlink_requirements: "low" | "medium" | "high";
  content_length_needed: number;
  competition_level: "low" | "medium" | "high";
  time_to_rank: string;
  ranking_probability: {
    "1_month": number;
    "3_months": number;
    "6_months": number;
  };
  recommendations: string[];
  metadata: {
    keyword: string;
    search_volume: number;
    competition_index: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: KeywordDifficultyRequest = await request.json();
    
    // Validate required fields
    if (!body.keyword || typeof body.keyword !== 'string' || body.keyword.trim().length === 0) {
      return NextResponse.json(
        { error: 'keyword is required and must be a non-empty string' },
        { status: 422 }
      );
    }

    const endpoint = `${BLOG_WRITER_API_URL}/api/v1/keywords/difficulty`;
    
    const requestBody = {
      keyword: body.keyword.trim(),
      search_volume: body.search_volume ?? 0,
      difficulty: body.difficulty ?? 50.0,
      competition: body.competition ?? 0.5,
      location: body.location || 'United States',
      language: body.language || 'en',
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      let errorMessage = `API returned ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorData.detail || errorMessage;
      } catch {
        const text = await response.text();
        if (text) errorMessage = text;
      }

      console.error(`❌ Keyword difficulty API error (${response.status}):`, errorMessage);
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data: KeywordDifficultyResponse = await response.json();
    
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error in keywords/difficulty:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to analyze keyword difficulty: ${errorMessage}` },
      { status: 500 }
    );
  }
}

