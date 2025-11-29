import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { createServiceClient } from '@/lib/supabase/server';
import { analyzeContent } from '@/lib/content-analysis-service';
import { calculateWordCountFromContent, extractExcerptFromContent } from '@/lib/content-extraction-utils';

/**
 * POST /api/workflow/prepare-publishing
 * 
 * Phase 5: Validate and prepare content for Webflow publishing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      content,
      title,
      excerpt,
      seo_data,
      enhanced_fields,
      featured_image,
      internal_links,
      external_links,
      target_platform,
      is_draft,
    } = body;

    if (!content || !title) {
      return NextResponse.json(
        { error: 'Content and title are required' },
        { status: 400 }
      );
    }

    logger.info('Phase 5: Starting publishing preparation', { title, platform: target_platform });

    // Get current user and org
    const supabase = createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_org_id')
      .eq('id', user.id)
      .single();

    const orgId = profile?.current_org_id;
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    // Calculate content scores
    const analysis = analyzeContent({
      content,
      title,
      meta_description: enhanced_fields?.meta_description || seo_data?.meta_description,
      keywords: seo_data?.keywords || [],
      target_keyword: seo_data?.keywords?.[0],
      featured_image: featured_image?.url,
    });

    // Calculate individual scores
    const seoScore = analysis.seo_score;
    const qualityScore = analysis.quality_score;
    const readabilityScore = analysis.readability_score;
    
    // Calculate interlinking score
    const internalLinksCount = internal_links?.length || 0;
    const externalLinksCount = external_links?.length || 0;
    const interlinkingScore = Math.min(100, (internalLinksCount * 15) + (externalLinksCount * 10));

    // Calculate image score
    const imagesScore = featured_image?.url ? 80 : 30;

    // Calculate overall score
    const overallScore = Math.round(
      (seoScore * 0.3) +
      (qualityScore * 0.25) +
      (readabilityScore * 0.2) +
      (interlinkingScore * 0.15) +
      (imagesScore * 0.1)
    );

    // Validate publishing readiness
    const warnings: string[] = [];
    const missingFields: string[] = [];

    // Required fields check
    if (!title) missingFields.push('title');
    if (!content || content.length < 100) missingFields.push('content');
    if (!enhanced_fields?.slug && !seo_data?.slug) missingFields.push('slug');

    // Recommended fields check
    if (!enhanced_fields?.meta_description && !seo_data?.meta_description) {
      warnings.push('Missing meta description - SEO impact');
    }
    if (!featured_image?.url) {
      warnings.push('No featured image - consider adding one');
    }
    if (internalLinksCount === 0) {
      warnings.push('No internal links - add links to related content');
    }
    if (analysis.word_count < 800) {
      warnings.push(`Content is short (${analysis.word_count} words) - consider expanding`);
    }
    if (seoScore < 60) {
      warnings.push('SEO score is low - review recommendations');
    }

    const isReady = missingFields.length === 0 && overallScore >= 50;

    // Prepare final content with inserted links
    let finalContent = content;
    
    // Insert internal links (simplified - in production, use smarter placement)
    if (internal_links && internal_links.length > 0) {
      // For now, we'll append a "Related Content" section
      const relatedLinks = internal_links.slice(0, 5).map((link: any) => 
        `<li><a href="${link.url}">${link.anchorText}</a></li>`
      ).join('\n');
      
      if (relatedLinks) {
        finalContent += `\n\n<h2>Related Content</h2>\n<ul>\n${relatedLinks}\n</ul>`;
      }
    }

    // Create blog post draft in database
    const slug = enhanced_fields?.slug || seo_data?.slug || title.toLowerCase().replace(/\s+/g, '-');
    const finalExcerpt = excerpt || enhanced_fields?.excerpt || extractExcerptFromContent(content);
    const wordCount = calculateWordCountFromContent(content);

    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .insert({
        org_id: orgId,
        author_id: user.id,
        title,
        slug,
        content: finalContent,
        excerpt: finalExcerpt,
        status: 'draft',
        seo_data: {
          ...seo_data,
          ...enhanced_fields,
          meta_title: enhanced_fields?.meta_title || seo_data?.meta_title || title,
          meta_description: enhanced_fields?.meta_description || seo_data?.meta_description || finalExcerpt,
        },
        metadata: {
          featured_image: featured_image?.url,
          featured_image_alt: featured_image?.alt || `Featured image for ${title}`,
          word_count: wordCount,
          reading_time: Math.ceil(wordCount / 200),
          internal_links: internal_links?.length || 0,
          external_links: external_links?.length || 0,
          content_score: overallScore,
          seo_score: seoScore,
          quality_score: qualityScore,
          workflow_generated: true,
          generated_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (postError) {
      logger.error('Failed to create blog post', { error: postError.message });
      throw new Error(`Failed to create blog post: ${postError.message}`);
    }

    // Create publishing record if publishing to platform
    let publishingRecordId: string | undefined;

    if (target_platform && post) {
      const { data: publishingRecord, error: pubError } = await supabase
        .from('blog_platform_publishing')
        .insert({
          org_id: orgId,
          post_id: post.post_id,
          platform: target_platform,
          status: is_draft ? 'draft' : 'pending',
          is_draft: is_draft !== false,
          field_mapping: enhanced_fields,
          sync_status: 'pending',
        })
        .select()
        .single();

      if (pubError) {
        logger.warn('Failed to create publishing record', { error: pubError.message });
      } else {
        publishingRecordId = publishingRecord?.publishing_id;
      }
    }

    const result = {
      post_id: post?.post_id,
      publishing_record_id: publishingRecordId,
      content_score: {
        overall: overallScore,
        seo: seoScore,
        quality: qualityScore,
        interlinking: interlinkingScore,
        images: imagesScore,
      },
      publishing_readiness: {
        isReady,
        warnings,
        missingFields,
      },
      final_content_preview: finalContent.substring(0, 500) + '...',
      word_count: wordCount,
    };

    logger.info('Phase 5: Publishing preparation completed', {
      postId: post?.post_id,
      overallScore,
      isReady,
      warningsCount: warnings.length,
    });

    return NextResponse.json(result);

  } catch (error: any) {
    logger.error('Phase 5 error', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Publishing preparation failed' },
      { status: 500 }
    );
  }
}

