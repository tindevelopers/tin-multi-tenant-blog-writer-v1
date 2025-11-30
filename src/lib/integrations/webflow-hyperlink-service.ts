/**
 * Webflow Hyperlink Service
 * 
 * Service for analyzing Webflow site structure and inserting intelligent hyperlinks
 */

import { logger } from '@/utils/logger';
import { discoverWebflowStructure, ExistingContent } from './webflow-structure-discovery';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import { createServiceClient } from '@/lib/supabase/service';

export interface HyperlinkSuggestion {
  anchor_text: string;
  url: string;
  type: 'cms' | 'static';
  relevance_score: number;
  context: string;
}

export interface WebflowHyperlinkConfig {
  apiToken: string;
  siteId: string;
  orgId: string;
}

/**
 * Get Webflow integration credentials for an organization
 */
export async function getWebflowIntegration(
  orgId: string
): Promise<WebflowHyperlinkConfig | null> {
  try {
    const supabase = createServiceClient();
    
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('config, metadata')
      .eq('org_id', orgId)
      .eq('type', 'webflow')
      .eq('status', 'active')
      .single();
    
    if (error || !integration) {
      logger.debug('No active Webflow integration found', { orgId, error: error?.message });
      return null;
    }
    
    const config = integration.config as any;
    const metadata = integration.metadata as any;
    
    // Extract credentials from config
    const apiToken = config.api_key || config.apiToken || config.token;
    const siteId = config.site_id || config.siteId || metadata?.site_id;
    
    if (!apiToken || !siteId) {
      logger.warn('Webflow integration missing required credentials', { orgId });
      return null;
    }
    
    return {
      apiToken,
      siteId,
      orgId,
    };
  } catch (error: any) {
    logger.error('Error fetching Webflow integration', { orgId, error: error.message });
    return null;
  }
}

/**
 * Analyze content and find relevant hyperlink opportunities
 * Uses OpenAI to intelligently match anchor text with relevant pages
 */
export async function analyzeHyperlinkOpportunities(
  content: string,
  title: string,
  keywords: string[],
  webflowContent: ExistingContent[]
): Promise<HyperlinkSuggestion[]> {
  try {
    // Extract potential anchor text from content
    const anchorTexts: string[] = [];
    
    // Extract from headings
    const headingRegex = /<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const headingText = match[1].replace(/<[^>]+>/g, '').trim();
      if (headingText && headingText.length > 5 && headingText.length < 50) {
        anchorTexts.push(headingText);
      }
    }
    
    // Extract from keywords
    keywords.forEach(keyword => {
      if (keyword.length > 3 && keyword.length < 30) {
        anchorTexts.push(keyword);
      }
    });
    
    // Use OpenAI to match anchor texts with relevant Webflow pages
    const suggestions: HyperlinkSuggestion[] = [];
    
    for (const anchorText of anchorTexts.slice(0, 20)) { // Limit to top 20 anchor texts
      // Find best matching Webflow pages
      const matches = findBestMatches(anchorText, webflowContent, title);
      
      if (matches.length > 0) {
        // Take the best match
        const bestMatch = matches[0];
        suggestions.push({
          anchor_text: anchorText,
          url: bestMatch.url,
          type: bestMatch.type,
          relevance_score: bestMatch.score,
          context: bestMatch.context || '',
        });
      }
    }
    
    // Remove duplicates (same URL)
    const uniqueSuggestions = suggestions.reduce((acc, suggestion) => {
      const existing = acc.find(s => s.url === suggestion.url);
      if (!existing || suggestion.relevance_score > existing.relevance_score) {
        if (existing) {
          const index = acc.indexOf(existing);
          acc[index] = suggestion;
        } else {
          acc.push(suggestion);
        }
      }
      return acc;
    }, [] as HyperlinkSuggestion[]);
    
    logger.info('Hyperlink opportunities analyzed', {
      anchorTextsCount: anchorTexts.length,
      suggestionsCount: uniqueSuggestions.length,
      cmsLinks: uniqueSuggestions.filter(s => s.type === 'cms').length,
      staticLinks: uniqueSuggestions.filter(s => s.type === 'static').length,
    });
    
    return uniqueSuggestions.slice(0, 10); // Limit to top 10 suggestions
  } catch (error: any) {
    logger.error('Error analyzing hyperlink opportunities', { error: error.message });
    return [];
  }
}

/**
 * Find best matching Webflow pages for an anchor text
 */
function findBestMatches(
  anchorText: string,
  webflowContent: ExistingContent[],
  articleTitle: string
): Array<{ url: string; type: 'cms' | 'static'; score: number; context?: string }> {
  const anchorLower = anchorText.toLowerCase();
  const matches: Array<{ url: string; type: 'cms' | 'static'; score: number; context?: string }> = [];
  
  for (const page of webflowContent) {
    let score = 0;
    
    // Exact title match (highest score)
    if (page.title.toLowerCase() === anchorLower) {
      score = 100;
    }
    // Title contains anchor text
    else if (page.title.toLowerCase().includes(anchorLower)) {
      score = 80;
    }
    // Keywords match
    else if (page.keywords.some(k => k.toLowerCase() === anchorLower)) {
      score = 70;
    }
    // Keywords contain anchor text
    else if (page.keywords.some(k => k.toLowerCase().includes(anchorLower))) {
      score = 60;
    }
    // Slug match
    else if (page.slug.toLowerCase().includes(anchorLower.replace(/\s+/g, '-'))) {
      score = 50;
    }
    // Partial keyword match
    else {
      const anchorWords = anchorLower.split(/\s+/);
      const matchingKeywords = page.keywords.filter(k => 
        anchorWords.some(word => k.toLowerCase().includes(word))
      );
      if (matchingKeywords.length > 0) {
        score = 40 + (matchingKeywords.length * 5);
      }
    }
    
    // Boost CMS items slightly (they're usually more relevant for blog content)
    if (page.type === 'cms') {
      score += 5;
    }
    
    // Penalize if it's the same article
    if (page.title.toLowerCase() === articleTitle.toLowerCase()) {
      score = 0;
    }
    
    if (score > 30) { // Minimum relevance threshold
      matches.push({
        url: page.url,
        type: page.type,
        score,
        context: page.title,
      });
    }
  }
  
  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Insert hyperlinks into content using OpenAI polish function
 * Falls back to simple insertion if OpenAI is not available
 */
export async function insertHyperlinksWithPolish(
  content: string,
  title: string,
  keywords: string[],
  suggestions: HyperlinkSuggestion[]
): Promise<string> {
  try {
    // Try OpenAI polish function first
    const apiUrl = BLOG_WRITER_API_URL;
    const API_KEY = process.env.BLOG_WRITER_API_KEY || null;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }
    
    // Check if polish endpoint exists
    const polishEndpoint = `${apiUrl}/api/v1/content/polish`;
    
    try {
      const response = await fetch(polishEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content,
          title,
          keywords,
          hyperlink_suggestions: suggestions.map(s => ({
            anchor_text: s.anchor_text,
            url: s.url,
            type: s.type,
          })),
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        logger.info('✅ Content polished with hyperlinks via OpenAI', {
          linksInserted: result.links_inserted || 0,
        });
        return result.polished_content || result.content || content;
      } else {
        logger.debug('Polish endpoint not available, using fallback', {
          status: response.status,
        });
      }
    } catch (error: any) {
      logger.debug('Polish endpoint error, using fallback', { error: error.message });
    }
    
    // Fallback: Simple insertion without OpenAI
    return insertHyperlinksSimple(content, suggestions);
  } catch (error: any) {
    logger.error('Error inserting hyperlinks', { error: error.message });
    return content; // Return original content on error
  }
}

/**
 * Simple hyperlink insertion (fallback when OpenAI is not available)
 */
function insertHyperlinksSimple(
  content: string,
  suggestions: HyperlinkSuggestion[]
): string {
  let modifiedContent = content;
  
  // Sort suggestions by relevance score (highest first)
  const sortedSuggestions = [...suggestions].sort((a, b) => b.relevance_score - a.relevance_score);
  
  // Insert links (limit to top 5 to avoid over-linking)
  for (const suggestion of sortedSuggestions.slice(0, 5)) {
    const anchorText = suggestion.anchor_text;
    const url = suggestion.url;
    
    // Create regex to find anchor text in content (case-insensitive, word boundary)
    const regex = new RegExp(
      `(^|[^>])(${escapeRegex(anchorText)})(?![^<]*<\/a>)`,
      'gi'
    );
    
    // Replace with link if not already linked
    modifiedContent = modifiedContent.replace(regex, (match, before, text) => {
      // Check if this text is already inside a link tag
      if (match.includes('<a ')) {
        return match;
      }
      return `${before}<a href="${url}" rel="noopener noreferrer">${text}</a>`;
    });
  }
  
  logger.info('Hyperlinks inserted (simple method)', {
    suggestionsCount: suggestions.length,
    linksInserted: sortedSuggestions.slice(0, 5).length,
  });
  
  return modifiedContent;
}

/**
 * Escape special regex characters
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

