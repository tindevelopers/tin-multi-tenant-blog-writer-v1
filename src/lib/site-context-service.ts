/**
 * Site Context Service
 * 
 * Provides site intelligence for content generation by leveraging stored Webflow scans.
 * This enables the content generation to:
 * - Avoid duplicate topics
 * - Understand existing content landscape
 * - Generate content with built-in link opportunities
 * - Fit new content into existing pillar/cluster structure
 */

import { logger } from '@/utils/logger';
import { createServiceClient } from '@/lib/supabase/service';
import type { ExistingContent } from '@/lib/integrations/webflow-structure-discovery';

/**
 * Site context for content generation
 */
export interface SiteContext {
  // Existing content for awareness
  existingTitles: string[];
  existingTopics: string[];
  existingKeywords: string[];
  
  // Link opportunities to embed during generation
  linkOpportunities: LinkOpportunity[];
  
  // Content gaps and recommendations
  contentGaps?: string[];
  suggestedTopics?: string[];
  
  // Site metadata
  siteId?: string;
  publishedDomain?: string;
  totalContentItems: number;
  lastScanDate?: string;
}

/**
 * Link opportunity to pass to content generation
 */
export interface LinkOpportunity {
  url: string;
  title: string;
  keywords: string[];
  type: 'cms' | 'static';
  suggestedAnchorText?: string;
}

/**
 * Options for fetching site context
 */
export interface SiteContextOptions {
  orgId: string;
  topic?: string;           // Current topic being generated
  keywords?: string[];      // Keywords for the new content
  maxLinkOpportunities?: number;
  includeContentGaps?: boolean;
}

/**
 * Fetch site context from stored Webflow scans
 */
export async function getSiteContext(
  options: SiteContextOptions
): Promise<SiteContext | null> {
  const {
    orgId,
    topic,
    keywords = [],
    maxLinkOpportunities = 10,
  } = options;

  try {
    const supabase = createServiceClient();

    // Get Webflow integration for this org
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('config, metadata')
      .eq('org_id', orgId)
      .eq('type', 'webflow')
      .eq('status', 'active')
      .single();

    if (integrationError || !integration) {
      logger.debug('No active Webflow integration found for site context', { orgId });
      return null;
    }

    const config = integration.config as any;
    const siteId = config?.site_id || config?.siteId;

    if (!siteId) {
      logger.debug('No site_id in Webflow integration', { orgId });
      return null;
    }

    // Get latest completed scan
    const { data: latestScan, error: scanError } = await supabase
      .from('webflow_structure_scans')
      .select('existing_content, published_domain, scan_completed_at, total_content_items')
      .eq('org_id', orgId)
      .eq('site_id', siteId)
      .eq('status', 'completed')
      .order('scan_completed_at', { ascending: false })
      .limit(1)
      .single();

    if (scanError || !latestScan?.existing_content) {
      logger.debug('No completed scan found for site context', { orgId, siteId });
      return null;
    }

    const existingContent = latestScan.existing_content as ExistingContent[];
    const publishedDomain = latestScan.published_domain as string | undefined;

    // Extract unique titles, topics (from keywords), and keywords
    const existingTitles = [...new Set(existingContent.map(c => c.title.toLowerCase()))];
    const existingKeywords = [...new Set(existingContent.flatMap(c => c.keywords || []))];
    
    // Group keywords into pseudo-topics (top keywords as topics)
    const keywordCounts: Record<string, number> = {};
    existingContent.forEach(c => {
      (c.keywords || []).forEach(k => {
        const normalized = k.toLowerCase();
        keywordCounts[normalized] = (keywordCounts[normalized] || 0) + 1;
      });
    });
    const existingTopics = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([keyword]) => keyword);

    // Find link opportunities relevant to the new topic/keywords
    const linkOpportunities = findLinkOpportunities(
      existingContent,
      topic || '',
      keywords,
      publishedDomain,
      maxLinkOpportunities
    );

    // Check for duplicate topics
    const topicLower = topic?.toLowerCase() || '';
    const isDuplicateTopic = existingTitles.some(title => 
      title.includes(topicLower) || topicLower.includes(title)
    );

    if (isDuplicateTopic) {
      logger.warn('Potential duplicate topic detected', {
        newTopic: topic,
        existingTitles: existingTitles.filter(t => 
          t.includes(topicLower) || topicLower.includes(t)
        ),
      });
    }

    logger.info('Site context fetched successfully', {
      orgId,
      siteId,
      existingTitlesCount: existingTitles.length,
      existingKeywordsCount: existingKeywords.length,
      linkOpportunitiesCount: linkOpportunities.length,
      lastScanDate: latestScan.scan_completed_at,
    });

    return {
      existingTitles,
      existingTopics,
      existingKeywords,
      linkOpportunities,
      siteId,
      publishedDomain: publishedDomain || undefined,
      totalContentItems: latestScan.total_content_items || existingContent.length,
      lastScanDate: latestScan.scan_completed_at,
    };
  } catch (error: any) {
    logger.error('Error fetching site context', {
      orgId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Find relevant link opportunities for the new content
 */
function findLinkOpportunities(
  existingContent: ExistingContent[],
  topic: string,
  keywords: string[],
  publishedDomain: string | undefined,
  maxOpportunities: number
): LinkOpportunity[] {
  const opportunities: Array<LinkOpportunity & { score: number }> = [];
  const topicLower = topic.toLowerCase();
  const keywordsLower = keywords.map(k => k.toLowerCase());

  for (const content of existingContent) {
    let score = 0;
    const contentKeywordsLower = (content.keywords || []).map(k => k.toLowerCase());
    const titleLower = content.title.toLowerCase();

    // Skip if title is too similar to new topic (would be self-referential)
    if (titleLower === topicLower || titleLower.includes(topicLower)) {
      continue;
    }

    // Score based on keyword overlap
    const keywordOverlap = keywordsLower.filter(k => 
      contentKeywordsLower.some(ck => ck.includes(k) || k.includes(ck))
    ).length;
    score += keywordOverlap * 20;

    // Score based on topic relevance
    if (contentKeywordsLower.some(k => topicLower.includes(k))) {
      score += 15;
    }

    // Score based on title word overlap
    const topicWords = topicLower.split(/\s+/).filter(w => w.length > 3);
    const titleWords = titleLower.split(/\s+/).filter(w => w.length > 3);
    const titleOverlap = topicWords.filter(w => titleWords.includes(w)).length;
    score += titleOverlap * 10;

    // Bonus for CMS content (usually more relevant for blog interlinking)
    if (content.type === 'cms') {
      score += 5;
    }

    if (score > 10) {
      // Fix URL domain if needed and ensure absolute
      let url = content.url;
      
      // Replace webflow.io staging URLs with published domain
      if (publishedDomain && url.includes('.webflow.io')) {
        const path = url.replace(/https?:\/\/[^\/]+/, '');
        url = `${publishedDomain.replace(/\/$/, '')}${path}`;
      }
      
      // Ensure URL is absolute
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (publishedDomain) {
          const base = publishedDomain.replace(/\/$/, '');
          url = url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
        }
      }
      
      // Ensure HTTPS for security
      if (url.startsWith('http://') && publishedDomain?.startsWith('https://')) {
        url = url.replace('http://', 'https://');
      }

      opportunities.push({
        url,
        title: content.title,
        keywords: content.keywords || [],
        type: content.type,
        suggestedAnchorText: content.title,
        score,
      });
    }
  }

  // Sort by score and return top opportunities
  return opportunities
    .sort((a, b) => b.score - a.score)
    .slice(0, maxOpportunities)
    .map(({ score, ...opp }) => opp);
}

/**
 * Build custom instructions with site context for content generation
 * 
 * @param baseInstructions - Base custom instructions
 * @param siteContext - Site context with link opportunities and existing content
 * @param topic - Current topic being generated
 * @param maxLength - Maximum total length (default: 5000 to match API limit)
 */
export function buildSiteAwareInstructions(
  baseInstructions: string,
  siteContext: SiteContext,
  topic: string,
  maxLength: number = 5000
): string {
  const contextInstructions: string[] = [];

  // Add link opportunities as specific instructions (up to 5 links with full details)
  if (siteContext.linkOpportunities.length > 0) {
    contextInstructions.push(`
INTERNAL LINKING REQUIREMENTS:
Include links to these existing pages where contextually relevant:
${siteContext.linkOpportunities.slice(0, 5).map((opp, i) => 
  `${i + 1}. "${opp.title}" - ${opp.url}
     Keywords: ${opp.keywords.slice(0, 3).join(', ')}
     Suggested anchor: "${opp.suggestedAnchorText || opp.title}"`
).join('\n')}

IMPORTANT: Naturally incorporate 2-4 of these internal links within the content body.
Use descriptive anchor text that flows naturally with the surrounding text.
`);
  }

  // Add awareness of existing content (up to 5 related titles)
  if (siteContext.existingTitles.length > 0) {
    const relatedTitles = siteContext.existingTitles
      .filter(t => {
        const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        return topicWords.some(w => t.includes(w));
      })
      .slice(0, 5);

    if (relatedTitles.length > 0) {
      contextInstructions.push(`
CONTENT DIFFERENTIATION:
The site already has content on related topics:
${relatedTitles.map(t => `- ${t}`).join('\n')}

Ensure this new content provides UNIQUE value and doesn't repeat information 
from existing articles. Reference and link to existing content where appropriate.
`);
    }
  }

  // Add topic cluster awareness (up to 10 relevant topics)
  if (siteContext.existingTopics.length > 0) {
    const relevantTopics = siteContext.existingTopics
      .filter(t => {
        const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        return topicWords.some(w => t.includes(w) || w.includes(t));
      })
      .slice(0, 10);

    if (relevantTopics.length > 0) {
      contextInstructions.push(`
TOPIC CLUSTER CONTEXT:
This content belongs to a cluster covering: ${relevantTopics.join(', ')}
Consider how this article fits into the broader topic ecosystem and reference
related concepts to strengthen the site's topical authority.
`);
    }
  }

  if (contextInstructions.length === 0) {
    return baseInstructions;
  }

  const result = `${baseInstructions}

=== SITE-AWARE GENERATION CONTEXT ===
${contextInstructions.join('\n')}
=== END SITE CONTEXT ===`;

  // Final safety check - truncate if exceeds max length
  if (result.length > maxLength) {
    logger.warn('Site-aware instructions exceeded max length, truncating', {
      resultLength: result.length,
      maxLength,
    });
    return result.substring(0, maxLength);
  }
  
  return result;
}

/**
 * Format link opportunities for the generation API
 */
export function formatLinkOpportunitiesForAPI(
  linkOpportunities: LinkOpportunity[]
): Array<{ anchor_text: string; url: string; keywords: string[] }> {
  return linkOpportunities.map(opp => ({
    anchor_text: opp.suggestedAnchorText || opp.title,
    url: opp.url,
    keywords: opp.keywords,
  }));
}

/**
 * Ensure a URL is absolute
 * Converts relative URLs to absolute using the provided base domain
 */
export function ensureAbsoluteUrl(url: string, baseDomain?: string): string {
  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // No base domain - return as-is
  if (!baseDomain) {
    return url;
  }
  
  // Normalize base domain
  const normalizedBase = baseDomain.replace(/\/$/, '');
  
  // Handle protocol-relative URLs
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  
  // Handle absolute paths
  if (url.startsWith('/')) {
    return `${normalizedBase}${url}`;
  }
  
  // Handle relative paths
  return `${normalizedBase}/${url}`;
}

/**
 * Convert link opportunities to absolute URLs
 * Used by workflow models to ensure all links are absolute
 */
export function normalizeLinksToAbsolute(
  linkOpportunities: LinkOpportunity[],
  baseDomain?: string
): LinkOpportunity[] {
  return linkOpportunities.map(opp => ({
    ...opp,
    url: ensureAbsoluteUrl(opp.url, baseDomain),
  }));
}

/**
 * Format site context as a string for workflow prompts
 * Creates a summary that can be injected into LLM prompts
 */
export function formatSiteContextForPrompt(
  siteContext: SiteContext | null,
  options: {
    maxLinks?: number;
    includeTopics?: boolean;
    includeGaps?: boolean;
  } = {}
): string {
  if (!siteContext) {
    return 'No site context available. Generate content independently.';
  }
  
  const { maxLinks = 8, includeTopics = true, includeGaps = false } = options;
  const sections: string[] = [];
  
  // Site metadata
  if (siteContext.publishedDomain) {
    sections.push(`**Website:** ${siteContext.publishedDomain}`);
  }
  sections.push(`**Total existing content:** ${siteContext.totalContentItems} items`);
  
  // Link opportunities (prioritize these)
  if (siteContext.linkOpportunities.length > 0) {
    const links = siteContext.linkOpportunities.slice(0, maxLinks);
    const linkList = links.map((opp, i) => 
      `${i + 1}. **${opp.title}**
   URL: ${opp.url}
   Keywords: ${opp.keywords.slice(0, 3).join(', ')}
   Anchor suggestion: "${opp.suggestedAnchorText || opp.title}"`
    ).join('\n');
    
    sections.push(`\n**Internal Linking Opportunities:**\n${linkList}`);
  }
  
  // Existing topics for awareness
  if (includeTopics && siteContext.existingTopics.length > 0) {
    sections.push(`\n**Related topics on site:** ${siteContext.existingTopics.slice(0, 10).join(', ')}`);
  }
  
  // Content gaps
  if (includeGaps && siteContext.contentGaps && siteContext.contentGaps.length > 0) {
    sections.push(`\n**Content gaps to address:** ${siteContext.contentGaps.join(', ')}`);
  }
  
  return sections.join('\n');
}

