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

/**
 * Fallback function to extract meta tags from content when DataForSEO is unavailable
 */
function extractMetaTagsFromContent(text: string, title?: string): { meta_title: string; meta_description: string } {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const words = cleanText.split(' ');
  
  // Generate SEO title from title or first 60 characters
  let metaTitle = title || cleanText.substring(0, 60);
  if (metaTitle.length > 60) {
    metaTitle = metaTitle.substring(0, 57) + '...';
  }
  
  // Generate meta description from first 155 characters
  let metaDescription = cleanText.substring(0, 155);
  if (cleanText.length > 155) {
    // Try to end at a sentence boundary
    const lastPeriod = metaDescription.lastIndexOf('.');
    const lastSpace = metaDescription.lastIndexOf(' ');
    if (lastPeriod > 120) {
      metaDescription = cleanText.substring(0, lastPeriod + 1);
    } else if (lastSpace > 120) {
      metaDescription = cleanText.substring(0, lastSpace) + '...';
    } else {
      metaDescription = cleanText.substring(0, 152) + '...';
    }
  }
  
  return {
    meta_title: metaTitle,
    meta_description: metaDescription,
  };
}

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
      title,
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
      hasTitle: !!title,
    });

    // Check if DataForSEO is configured
    if (!dataForSEOContentGeneration.isConfigured()) {
      logger.warn('DataForSEO not configured, using fallback extraction', {
        userId: user.id,
      });
      
      // Use fallback extraction
      const fallbackMeta = extractMetaTagsFromContent(text, title);
      
      return NextResponse.json({
        success: true,
        data: {
          meta_title: fallbackMeta.meta_title,
          meta_description: fallbackMeta.meta_description,
        },
        meta_title: fallbackMeta.meta_title,
        meta_description: fallbackMeta.meta_description,
        cost: 0,
        fallback: true,
        message: 'DataForSEO not configured. Using content extraction fallback.',
      });
    }

    try {
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

      if (!metaResult || !metaResult.meta_title) {
        logger.warn('DataForSEO returned empty meta tags, using fallback', {
          userId: user.id,
        });
        
        // Fallback if DataForSEO returns empty results
        const fallbackMeta = extractMetaTagsFromContent(text, title);
        
        return NextResponse.json({
          success: true,
          data: {
            meta_title: fallbackMeta.meta_title,
            meta_description: fallbackMeta.meta_description,
          },
          meta_title: fallbackMeta.meta_title,
          meta_description: fallbackMeta.meta_description,
          cost: response.cost || 0,
          fallback: true,
          message: 'DataForSEO returned empty results. Using content extraction fallback.',
        });
      }

      return NextResponse.json({
        success: true,
        data: response,
        meta_title: metaResult.meta_title || '',
        meta_description: metaResult.meta_description || '',
        cost: response.cost || 0,
        fallback: false,
      });
    } catch (dataForSEOError: any) {
      // If DataForSEO fails, use fallback
      logger.warn('DataForSEO API failed, using fallback extraction', {
        error: dataForSEOError.message,
        code: dataForSEOError.code,
        status: dataForSEOError.status,
        userId: user.id,
      });
      
      const fallbackMeta = extractMetaTagsFromContent(text, title);
      
      return NextResponse.json({
        success: true,
        data: {
          meta_title: fallbackMeta.meta_title,
          meta_description: fallbackMeta.meta_description,
        },
        meta_title: fallbackMeta.meta_title,
        meta_description: fallbackMeta.meta_description,
        cost: 0,
        fallback: true,
        message: `DataForSEO API error: ${dataForSEOError.message}. Using content extraction fallback.`,
        error: dataForSEOError.message,
      });
    }
  } catch (error) {
    logger.error('Error generating meta tags', { error });
    return handleApiError(error);
  }
}
