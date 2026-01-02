/**
 * API Route: Blog Meta Tags
 *
 * POST /api/blog-meta-tags
 *
 * Proxies to Blog Writer API /api/v1/blog/meta-tags
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
    // Optional auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.debug('No authenticated user for blog-meta-tags, proceeding with system defaults');
    }

    const body = await parseJsonBody<{
      content: string;
      title?: string;
      keywords?: string[];
      canonical_url?: string;
      featured_image?: string;
    }>(request);

    validateRequiredFields(body, ['content']);

    const healthStatus = await cloudRunHealthManager.checkHealth();
    if (!healthStatus.isHealthy) {
      return NextResponse.json(
        { error: healthStatus.error || 'API service is unavailable' },
        { status: 503 }
      );
    }

    const response = await fetch(`${BLOG_WRITER_API_URL}/api/v1/blog/meta-tags`, {
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
      logger.error('Backend API error for /blog-meta-tags', {
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
      context: 'blog-meta-tags',
    });

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout. The meta-tags generation took too long.' },
        { status: 504 }
      );
    }

    return handleApiError(error);
  }
}

