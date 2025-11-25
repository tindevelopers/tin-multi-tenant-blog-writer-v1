/**
 * API Route: DataForSEO Content Generation - Generate Subtopics
 * 
 * POST /api/dataforseo/content/generate-subtopics
 * 
 * Generates subtopics from input text using DataForSEO
 * Pricing: $0.0001 per task ($100 for 1M tasks)
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
      max_subtopics = 10,
      language = 'en',
    } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    logger.debug('DataForSEO generate subtopics request', {
      userId: user.id,
      textLength: text.length,
      max_subtopics,
      language,
    });

    const response = await dataForSEOContentGeneration.generateSubtopics({
      text,
      max_subtopics,
      language,
    });

    logger.debug('DataForSEO generate subtopics response', {
      status_code: response.status_code,
      cost: response.cost,
      subtopicsCount: response.tasks?.[0]?.result?.[0]?.subtopics?.length || 0,
    });

    return NextResponse.json({
      success: true,
      data: response,
      subtopics: response.tasks?.[0]?.result?.[0]?.subtopics || [],
      cost: response.cost || 0,
    });
  } catch (error) {
    logger.error('Error generating subtopics with DataForSEO', { error });
    return handleApiError(error);
  }
}

