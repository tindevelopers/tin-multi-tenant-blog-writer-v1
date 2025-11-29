import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cluster, primary_keyword, search_type, serp_data } = body;

    if (!cluster || !primary_keyword) {
      return NextResponse.json(
        { error: 'Missing required fields: cluster and primary_keyword' },
        { status: 400 }
      );
    }

    // Get user for saving brief
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Generate content brief
    const brief = {
      title: `${cluster.parent_topic}: Complete Guide`,
      primary_keyword: primary_keyword,
      target_keywords: cluster.keywords || [],
      search_type: search_type || 'general',
      outline: generateOutline(cluster, serp_data),
      serp_insights: {
        featured_snippet: serp_data?.featured_snippet,
        people_also_ask: serp_data?.people_also_ask?.map((q: { question: string }) => q.question),
        top_competitors: serp_data?.top_domains?.map((d: { domain: string }) => d.domain),
      },
      keyword_distribution: generateKeywordDistribution(cluster, primary_keyword),
      content_goals: generateContentGoals(search_type),
      seo_recommendations: generateSEORecommendations(cluster, primary_keyword, serp_data),
      created_at: new Date().toISOString(),
    };

    // Save brief to database if user is authenticated
    if (user) {
      try {
        const { error: saveError } = await supabase
          .from('content_briefs')
          .insert({
            user_id: user.id,
            primary_keyword: primary_keyword,
            brief_data: brief,
            search_type: search_type,
          });

        if (saveError) {
          logger.warn('Failed to save content brief', { error: saveError });
        }
      } catch (saveError) {
        logger.warn('Error saving content brief', { error: saveError });
      }
    }

    return NextResponse.json({ brief });
  } catch (error) {
    logger.error('Error generating content brief', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateOutline(cluster: any, serpData: any): Array<{ heading: string; keywords: string[]; notes: string }> {
  const outline: Array<{ heading: string; keywords: string[]; notes: string }> = [];

  // Introduction
  outline.push({
    heading: 'Introduction',
    keywords: [cluster.parent_topic, ...(cluster.keywords || []).slice(0, 2)],
    notes: `Introduce the topic of ${cluster.parent_topic} and why it matters.`,
  });

  // Main sections
  const mainKeywords = (cluster.keywords || []).slice(0, 6);
  mainKeywords.forEach((keyword: string, idx: number) => {
    outline.push({
      heading: `Section ${idx + 1}: ${keyword}`,
      keywords: [keyword],
      notes: `Cover ${keyword} in detail. Include practical examples and actionable advice.`,
    });
  });

  // FAQ section
  if (serpData?.people_also_ask && serpData.people_also_ask.length > 0) {
    outline.push({
      heading: 'Frequently Asked Questions',
      keywords: serpData.people_also_ask.map((q: { question: string }) => q.question),
      notes: 'Answer common questions from SERP data.',
    });
  }

  // Conclusion
  outline.push({
    heading: 'Conclusion',
    keywords: [cluster.parent_topic],
    notes: 'Summarize key points and provide next steps.',
  });

  return outline;
}

function generateKeywordDistribution(cluster: any, primaryKeyword: string): Array<{ keyword: string; placement: string; priority: string }> {
  return [
    { keyword: primaryKeyword, placement: 'Title, H1, first paragraph', priority: 'high' },
    ...(cluster.keywords || []).slice(0, 5).map((kw: string) => ({
      keyword: kw,
      placement: 'H2 headings, body paragraphs',
      priority: 'medium',
    })),
    ...(cluster.keywords || []).slice(5, 10).map((kw: string) => ({
      keyword: kw,
      placement: 'Body text, alt tags',
      priority: 'low',
    })),
  ];
}

function generateContentGoals(searchType?: string): string[] {
  const goals: string[] = [];
  
  if (searchType === 'how_to') {
    goals.push('Provide step-by-step instructions');
    goals.push('Include practical examples');
    goals.push('Add troubleshooting tips');
  } else if (searchType === 'listicle') {
    goals.push('Create numbered list format');
    goals.push('Include detailed explanations for each item');
    goals.push('Add visual elements where possible');
  } else if (searchType === 'product') {
    goals.push('Compare multiple products/services');
    goals.push('Include pros and cons');
    goals.push('Add buying recommendations');
  } else {
    goals.push('Provide comprehensive coverage of the topic');
    goals.push('Include actionable insights');
    goals.push('Add relevant examples and case studies');
  }

  return goals;
}

function generateSEORecommendations(cluster: any, primaryKeyword: string, serpData: any): string[] {
  const recommendations: string[] = [
    `Target primary keyword "${primaryKeyword}" in title and H1`,
    `Include ${(cluster.keywords || []).length} related keywords naturally`,
    'Optimize for featured snippet (if available)',
    'Add internal links to related content',
    'Include schema markup for better visibility',
  ];

  if (serpData?.serp_features?.has_videos) {
    recommendations.push('Consider adding video content');
  }
  if (serpData?.serp_features?.has_images) {
    recommendations.push('Include relevant images with alt text');
  }

  return recommendations;
}

