/**
 * API Route: Interlinking Recommend (Backend v2 proxy)
 *
 * POST /api/interlinking/recommend
 *
 * Proxies to Blog Writer API /api/v1/integrations/connect-and-recommend-v2
 * Accepts provider, connection, keywords, optional tenant_id/site context.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { parseJsonBody, validateRequiredFields, handleApiError } from '@/lib/api-utils';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

const BLOG_WRITER_API_KEY = process.env.BLOG_WRITER_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody<{
      provider: 'webflow' | 'wordpress' | 'shopify';
      connection: Record<string, unknown>;
      keywords: string[];
      tenant_id?: string;
    }>(request);

    validateRequiredFields(body, ['provider', 'connection', 'keywords']);

    if (!Array.isArray(body.keywords) || body.keywords.length === 0) {
      return NextResponse.json(
        { error: 'keywords must be a non-empty array' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BLOG_WRITER_API_URL}/api/v1/integrations/connect-and-recommend-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(BLOG_WRITER_API_KEY && { Authorization: `Bearer ${BLOG_WRITER_API_KEY}` }),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }));
      logger.error('Backend API error for /interlinking/recommend', {
        status: response.status,
        error: errorData,
      });
      const message =
        (errorData as { detail?: string; error?: string; message?: string }).detail ||
        (errorData as { detail?: string; error?: string; message?: string }).error ||
        (errorData as { detail?: string; error?: string; message?: string }).message ||
        `API returned ${response.status}`;
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const data = await response.json();

    // Pass through, but surface pillar/static buckets if provided
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'interlinking-recommend',
    });

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout. The recommendation request took too long.' },
        { status: 504 }
      );
    }

    return handleApiError(error);
  }
}

