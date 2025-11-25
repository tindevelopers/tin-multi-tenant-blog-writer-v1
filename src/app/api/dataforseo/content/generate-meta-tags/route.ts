/**
 * API Route: DataForSEO Content Generation - Generate Meta Tags
 * 
 * POST /api/dataforseo/content/generate-meta-tags
 * 
 * Generates meta title and description tags using DataForSEO
 * Pricing: $0.001 per task ($1,000 for 1M tasks)
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
      language = 'en',
    } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    logger.debug('DataForSEO generate meta tags request', {
      userId: user.id,
      textLength: text.length,
      language,
    });

    const response = await dataForSEOContentGeneration.generateMetaTags({
      text,
      language,
    });

    logger.debug('DataForSEO generate meta tags response', {
      status_code: response.status_code,
      cost: response.cost,
      hasMetaTitle: !!response.tasks?.[0]?.result?.[0]?.meta_title,
    });

    const metaResult = response.tasks?.[0]?.result?.[0];

    return NextResponse.json({
      success: true,
      data: response,
      meta_title: metaResult?.meta_title || '',
      meta_description: metaResult?.meta_description || '',
      cost: response.cost || 0,
    });
  } catch (error) {
    logger.error('Error generating meta tags with DataForSEO', { error });
    return handleApiError(error);
  }
}

