/**
 * API Route: Blog Polish
 *
 * POST /api/blog-polish
 *
 * Proxies to Blog Writer API /api/v1/blog/polish
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import cloudRunHealthManager from '@/lib/cloud-run-health';
import { logger } from '@/utils/logger';
import { parseJsonBody, validateRequiredFields, handleApiError } from '@/lib/api-utils';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

const BLOG_WRITER_API_KEY = process.env.BLOG_WRITER_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Optional auth (mirrors /api/blog-writer/analyze behavior)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.debug('No authenticated user for blog-polish, proceeding with system defaults');
    }

    // Parse and validate
    const body = await parseJsonBody<{
      content: string;
      title?: string;
      keywords?: string[];
      operations?: string[];
      org_id?: string;
      target_tone?: string;
      brand_voice?: string;
      max_internal_links?: number;
      site_id?: string;
    }>(request);

    validateRequiredFields(body, ['content']);

    // Health check
    const healthStatus = await cloudRunHealthManager.checkHealth();
    if (!healthStatus.isHealthy) {
      return NextResponse.json(
        { error: healthStatus.error || 'API service is unavailable' },
        { status: 503 }
      );
    }

    // Backend expects query parameters, not JSON body
    const url = new URL(`${BLOG_WRITER_API_URL}/api/v1/blog/polish`);
    url.searchParams.set('content', body.content);
    if (body.operations && body.operations.length > 0) {
      // Convert operations array to instructions string
      url.searchParams.set('instructions', body.operations.join(', '));
    }
    if (body.org_id) {
      url.searchParams.set('org_id', body.org_id);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        ...(BLOG_WRITER_API_KEY && { Authorization: `Bearer ${BLOG_WRITER_API_KEY}` }),
      },
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }));
      logger.error('Backend API error for /blog-polish', {
        status: response.status,
        error: errorData,
      });

      const errorMessage =
        (errorData as { detail?: string; error?: string; message?: string }).detail ||
        (errorData as { detail?: string; error?: string; message?: string }).error ||
        (errorData as { detail?: string; error?: string; message?: string }).message ||
        `API returned ${response.status}`;

      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'blog-polish',
    });

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout. The polish operation took too long.' },
        { status: 504 }
      );
    }

    return handleApiError(error);
  }
}

