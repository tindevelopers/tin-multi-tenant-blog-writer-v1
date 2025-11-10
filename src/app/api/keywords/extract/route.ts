import { NextRequest, NextResponse } from 'next/server';

const BLOG_WRITER_API_URL = process.env.BLOG_WRITER_API_URL || 
  'https://blog-writer-api-dev-613248238610.europe-west1.run.app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${BLOG_WRITER_API_URL}/api/v1/keywords/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Blog Writer API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in keywords/extract:', error);
    return NextResponse.json(
      { error: 'Failed to extract keywords' },
      { status: 500 }
    );
  }
}

