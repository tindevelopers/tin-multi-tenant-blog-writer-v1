/**
 * API Route: Get Interlinking Recommendations
 * 
 * Retrieves integration structure from Supabase and calls backend API
 * Based on FRONTEND_INTERLINKING_IMPLEMENTATION_GUIDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/api-utils';
import { logger } from '@/utils/logger';

const API_BASE_URL = process.env.BLOG_WRITER_API_URL || 'https://blog-writer-api-dev-613248238610.europe-west1.run.app';
const API_KEY = process.env.BLOG_WRITER_API_KEY || '';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await request.json();
    const { keywords } = body;
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Keywords array is required' },
        { status: 400 }
      );
    }
    
    if (keywords.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 keywords allowed' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // Retrieve integration with structure
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('type, config, metadata')
      .eq('integration_id', id)
      .eq('org_id', user.org_id)
      .single();
    
    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }
    
    // Extract structure from metadata
    const structure = integration.metadata?.structure;
    
    if (!structure) {
      return NextResponse.json(
        { error: 'Integration structure not found. Please sync the integration first.' },
        { status: 400 }
      );
    }
    
    // Prepare connection object with structure
    const connection = {
      ...integration.config, // Credentials
      structure: structure   // Include structure
    };
    
    // Call backend API v2 endpoint for full interlink opportunities
    const backendResponse = await fetch(`${API_BASE_URL}/api/v1/integrations/connect-and-recommend-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
      },
      body: JSON.stringify({
        provider: integration.type,
        connection: connection,
        keywords: keywords,
        tenant_id: user.org_id
      }),
    });
    
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      logger.error('Backend API error', { 
        status: backendResponse.status, 
        error: errorText 
      });
      return NextResponse.json(
        { error: `Backend API error: ${backendResponse.status}` },
        { status: backendResponse.status }
      );
    }
    
    const backendResult = await backendResponse.json();
    
    // Transform backend response to match expected format
    // Backend returns per_keyword with interlink_opportunities
    return NextResponse.json({
      recommended_interlinks: backendResult.recommended_interlinks || 0,
      per_keyword: (backendResult.per_keyword || []).map((kw: any) => ({
        keyword: kw.keyword,
        suggested_interlinks: kw.suggested_interlinks || 0,
        interlink_opportunities: kw.interlink_opportunities || []
      }))
    });
    
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'interlinking-recommendations',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

