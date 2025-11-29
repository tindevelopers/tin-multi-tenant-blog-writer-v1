/**
 * API Route: DataForSEO Content Generation - Generate Text
 * 
 * POST /api/dataforseo/content/generate
 * 
 * Generates text content using DataForSEO's Content Generation API
 * Pricing: $0.00005 per new token ($50 for 1M tokens)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dataForSEOContentGeneration } from '@/lib/dataforseo-content-generation';
import { logger } from '@/utils/logger';
import { handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      text,
      creativity_index,
      text_length,
      tone,
      language,
    } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    logger.debug('DataForSEO generate text request', {
      userId: user.id,
      textLength: text.length,
      creativity_index,
      text_length,
      tone,
      language,
    });

    const response = await dataForSEOContentGeneration.generateText({
      text,
      creativity_index,
      text_length,
      tone,
      language,
    });

    logger.debug('DataForSEO generate text response', {
      status_code: response.status_code,
      cost: response.cost,
      result_count: response.tasks?.[0]?.result_count || 0,
    });

    return NextResponse.json({
      success: true,
      data: response,
      generated_text: response.tasks?.[0]?.result?.[0]?.text || '',
      cost: response.cost || 0,
    });
  } catch (error) {
    logger.error('Error generating text with DataForSEO', { error });
    return handleApiError(error);
  }
}

