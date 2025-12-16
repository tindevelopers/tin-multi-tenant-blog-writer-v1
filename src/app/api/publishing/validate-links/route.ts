/**
 * API Route: Validate Links Before Publishing
 * 
 * POST /api/publishing/validate-links
 * 
 * Validates all internal links in content to ensure they point
 * to content on the correct target publishing site.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LinkValidationService } from '@/lib/interlinking/link-validation-service';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(request);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.org_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 404 }
      );
    }

    const orgId = userProfile.org_id;

    // Parse request body
    const body = await request.json();
    const {
      content,
      post_id,
      target_site_id,
      target_site_url,
      strict_mode = false,
      auto_fix = false,
    } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!target_site_id) {
      return NextResponse.json(
        { error: 'Target site ID is required' },
        { status: 400 }
      );
    }

    logger.info('Validating links before publishing', {
      orgId,
      postId: post_id,
      targetSiteId: target_site_id,
      strictMode: strict_mode,
    });

    const validationService = new LinkValidationService();

    // Validate links
    const result = await validationService.validateLinks({
      content,
      targetSiteId: target_site_id,
      targetSiteUrl: target_site_url,
      postId: post_id,
      orgId,
      strictMode: strict_mode,
    });

    // Auto-fix if requested
    let fixedContent: string | undefined;
    let fixedCount = 0;
    let unfixableLinks: typeof result.links = [];

    if (auto_fix && result.wrongSiteLinks > 0) {
      const fixResult = validationService.autoFixLinks(content, result.links);
      fixedContent = fixResult.fixedContent;
      fixedCount = fixResult.fixedCount;
      unfixableLinks = fixResult.unfixableLinks;

      logger.info('Auto-fixed links', {
        postId: post_id,
        fixedCount,
        unfixableCount: unfixableLinks.length,
      });
    }

    // Generate report if there are issues
    let report: string | undefined;
    if (!result.isValid || result.warnings.length > 0) {
      report = validationService.generateReport(result);
    }

    return NextResponse.json({
      success: true,
      validation: {
        isValid: result.isValid,
        canPublish: result.canPublish,
        totalLinks: result.totalLinks,
        validLinks: result.validLinks,
        brokenLinks: result.brokenLinks,
        wrongSiteLinks: result.wrongSiteLinks,
        externalLinks: result.externalLinks,
        links: result.links,
        warnings: result.warnings,
        errors: result.errors,
      },
      autoFix: auto_fix ? {
        fixedContent,
        fixedCount,
        unfixableLinks,
      } : undefined,
      report,
    });

  } catch (error: any) {
    logger.error('Error validating links', { error: error.message });

    return NextResponse.json(
      { error: error.message || 'Failed to validate links' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/publishing/validate-links?post_id=xxx&target_site_id=xxx
 * 
 * Get the last validation result for a post
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(request);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('post_id');
    const targetSiteId = searchParams.get('target_site_id');

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    const validationService = new LinkValidationService();
    const result = await validationService.getLastValidationResult(
      postId,
      targetSiteId || undefined
    );

    if (!result) {
      return NextResponse.json(
        { error: 'No validation result found', hasResult: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      validation: result,
    });

  } catch (error: any) {
    logger.error('Error getting validation result', { error: error.message });

    return NextResponse.json(
      { error: error.message || 'Failed to get validation result' },
      { status: 500 }
    );
  }
}
