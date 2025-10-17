import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import cloudRunHealth from '@/lib/cloud-run-health';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Blog generation API route called');
    
    // Parse request body
    const body = await request.json();
    const { topic, keywords, target_audience, tone, word_count } = body;
    
    console.log('📝 Generation parameters:', {
      topic,
      keywords,
      target_audience,
      tone,
      word_count
    });
    
    // Validate required fields
    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }
    
    // Get current user and organization
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();
    
    if (userError || !userData) {
      console.error('❌ User data error:', userError);
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 400 }
      );
    }
    
    console.log('✅ User authenticated:', user.id, 'Org:', userData.org_id);
    
    // First, ensure Cloud Run is awake and healthy
    console.log('🌅 Checking Cloud Run health...');
    const healthStatus = await cloudRunHealth.wakeUpAndWait();
    
    if (!healthStatus.isHealthy) {
      console.error('❌ Cloud Run is not healthy:', healthStatus.error);
      return NextResponse.json(
        { error: `Cloud Run is not healthy: ${healthStatus.error}` },
        { status: 503 }
      );
    }
    
    console.log('✅ Cloud Run is healthy, proceeding with blog generation...');
    
    // Call the external blog writer API
    const API_BASE_URL = process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west1.run.app';
    const API_KEY = process.env.BLOG_WRITER_API_KEY;
    
    const response = await fetch(`${API_BASE_URL}/api/v1/blog/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
      },
      body: JSON.stringify({
        topic,
        keywords,
        target_audience,
        tone,
        word_count
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ External API error:', response.status, errorText);
      return NextResponse.json(
        { error: `External API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    console.log('✅ Blog generated successfully');
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ Error in blog generation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
