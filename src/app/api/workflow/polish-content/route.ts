/**
 * Polish Content API
 * 
 * Phase 2 Implementation: Content Polish & Refinement
 * 
 * Unlike generate-content (which creates from scratch), polish-content
 * focuses on refining EXISTING content:
 * 
 * - Improve readability and flow
 * - Fix grammar and style issues
 * - Enhance SEO without changing meaning
 * - Add/optimize internal links using stored scan data
 * - Strengthen transitions and conclusions
 * - Ensure consistent tone and voice
 * 
 * This is the "edit mode" counterpart to the "creation mode" generate-content.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { createServiceClient } from '@/lib/supabase/service';
import { analyzeInterlinkingEnhanced } from '@/lib/interlinking/enhanced-interlinking-service';

/**
 * Polish operation types
 */
type PolishOperation = 
  | 'improve_readability'   // Fix flow, transitions, paragraph structure
  | 'fix_grammar'           // Grammar, spelling, punctuation
  | 'enhance_seo'           // SEO optimization without changing meaning
  | 'add_internal_links'    // Add internal links from stored scan
  | 'strengthen_intro'      // Improve introduction hook
  | 'strengthen_conclusion' // Improve conclusion and CTA
  | 'ensure_tone'           // Ensure consistent brand voice
  | 'full_polish';          // All of the above

interface PolishRequest {
  content: string;
  title: string;
  keywords?: string[];
  operations?: PolishOperation[];
  org_id?: string;
  target_tone?: string;
  brand_voice?: string;
  max_internal_links?: number;
}

interface PolishResult {
  polished_content: string;
  changes_made: string[];
  improvements: {
    readability_score_before?: number;
    readability_score_after?: number;
    seo_score_before?: number;
    seo_score_after?: number;
    internal_links_added: number;
    grammar_fixes: number;
    style_improvements: number;
  };
  suggestions: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: PolishRequest = await request.json();
    const {
      content,
      title,
      keywords = [],
      operations = ['full_polish'],
      org_id,
      target_tone = 'professional',
      max_internal_links = 5,
    } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required for polishing' },
        { status: 400 }
      );
    }

    logger.info('Starting content polish operation', {
      operations,
      contentLength: content.length,
      hasOrgId: !!org_id,
    });

    const isFullPolish = operations.includes('full_polish');
    const changesMade: string[] = [];
    const suggestions: string[] = [];
    let polishedContent = content;
    let internalLinksAdded = 0;
    let grammarFixes = 0;
    let styleImprovements = 0;

    // Get organization ID from auth if not provided
    let orgId = org_id;
    if (!orgId) {
      const supabase = createServiceClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('org_id')
          .eq('user_id', user.id)
          .single();
        orgId = userProfile?.org_id;
      }
    }

    // Step 1: Add internal links (most valuable for SEO)
    if (isFullPolish || operations.includes('add_internal_links') || operations.includes('enhance_seo')) {
      try {
        const linkResult = await addInternalLinks(
          polishedContent,
          title,
          keywords,
          orgId,
          max_internal_links
        );
        
        if (linkResult.linksAdded > 0) {
          polishedContent = linkResult.content;
          internalLinksAdded = linkResult.linksAdded;
          changesMade.push(`Added ${linkResult.linksAdded} internal links`);
          
          if (linkResult.linkDetails.length > 0) {
            suggestions.push(
              `Internal links added to: ${linkResult.linkDetails.slice(0, 3).map(l => l.anchorText).join(', ')}${linkResult.linkDetails.length > 3 ? ` and ${linkResult.linkDetails.length - 3} more` : ''}`
            );
          }
        }
      } catch (linkError: any) {
        logger.warn('Failed to add internal links', { error: linkError.message });
        suggestions.push('Could not analyze internal linking opportunities. Try running a site scan first.');
      }
    }

    // Step 2: LLM-based polishing operations
    const llmOperations: PolishOperation[] = [];
    if (isFullPolish) {
      llmOperations.push('improve_readability', 'fix_grammar', 'strengthen_intro', 'strengthen_conclusion');
    } else {
      if (operations.includes('improve_readability')) llmOperations.push('improve_readability');
      if (operations.includes('fix_grammar')) llmOperations.push('fix_grammar');
      if (operations.includes('strengthen_intro')) llmOperations.push('strengthen_intro');
      if (operations.includes('strengthen_conclusion')) llmOperations.push('strengthen_conclusion');
      if (operations.includes('ensure_tone')) llmOperations.push('ensure_tone');
    }

    if (llmOperations.length > 0) {
      try {
        const llmResult = await polishWithLLM(
          polishedContent,
          title,
          llmOperations,
          target_tone
        );
        
        if (llmResult.content !== polishedContent) {
          polishedContent = llmResult.content;
          grammarFixes = llmResult.grammarFixes;
          styleImprovements = llmResult.styleImprovements;
          
          if (llmResult.changes.length > 0) {
            changesMade.push(...llmResult.changes);
          }
          if (llmResult.suggestions.length > 0) {
            suggestions.push(...llmResult.suggestions);
          }
        }
      } catch (llmError: any) {
        logger.warn('LLM polish failed', { error: llmError.message });
        suggestions.push('Some polish operations could not be completed. Manual review recommended.');
      }
    }

    // Step 3: SEO optimization (meta enhancements)
    if (isFullPolish || operations.includes('enhance_seo')) {
      const seoSuggestions = generateSEOSuggestions(polishedContent, title, keywords);
      if (seoSuggestions.length > 0) {
        suggestions.push(...seoSuggestions);
      }
    }

    const result: PolishResult = {
      polished_content: polishedContent,
      changes_made: changesMade,
      improvements: {
        internal_links_added: internalLinksAdded,
        grammar_fixes: grammarFixes,
        style_improvements: styleImprovements,
      },
      suggestions,
    };

    logger.info('Content polish completed', {
      changesMade: changesMade.length,
      internalLinksAdded,
      grammarFixes,
      styleImprovements,
      suggestionsCount: suggestions.length,
    });

    return NextResponse.json(result);

  } catch (error: any) {
    logger.error('Polish content error', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to polish content' },
      { status: 500 }
    );
  }
}

/**
 * Add internal links using enhanced interlinking service
 */
async function addInternalLinks(
  content: string,
  title: string,
  keywords: string[],
  orgId: string | undefined,
  maxLinks: number
): Promise<{
  content: string;
  linksAdded: number;
  linkDetails: Array<{ anchorText: string; url: string }>;
}> {
  if (!orgId) {
    return { content, linksAdded: 0, linkDetails: [] };
  }

  const supabase = createServiceClient();

  // Get Webflow config
  const { data: orgSettings } = await supabase
    .from('organization_settings')
    .select('webflow_config')
    .eq('org_id', orgId)
    .single();

  const webflowConfig = orgSettings?.webflow_config as any;
  if (!webflowConfig?.siteId) {
    return { content, linksAdded: 0, linkDetails: [] };
  }

  // Get latest scan
  const { data: latestScan } = await supabase
    .from('webflow_structure_scans')
    .select('existing_content, published_domain')
    .eq('org_id', orgId)
    .eq('site_id', webflowConfig.siteId)
    .eq('status', 'completed')
    .order('scan_completed_at', { ascending: false })
    .limit(1)
    .single();

  if (!latestScan?.existing_content) {
    return { content, linksAdded: 0, linkDetails: [] };
  }

  // Fix URLs in existing content to use published domain
  const existingContentWithFixedUrls = (latestScan.existing_content as any[]).map((item: any) => {
    const publishedDomain = latestScan.published_domain as string | undefined;
    if (publishedDomain && item.url && item.url.includes('.webflow.io')) {
      try {
        const urlObj = new URL(item.url);
        const path = urlObj.pathname;
        return {
          ...item,
          url: `${publishedDomain.replace(/\/$/, '')}${path}`,
        };
      } catch (e) {
        return item;
      }
    }
    return item;
  });

  // Use enhanced interlinking service
  const suggestions = await analyzeInterlinkingEnhanced(
    content,
    title,
    keywords,
    existingContentWithFixedUrls,
    {
      maxLinks,
      enableLazyLoading: false,
    }
  );

  if (suggestions.length === 0) {
    return { content, linksAdded: 0, linkDetails: [] };
  }

  // Insert links into content
  let modifiedContent = content;
  const insertedLinks: Array<{ anchorText: string; url: string }> = [];

  for (const suggestion of suggestions.slice(0, maxLinks)) {
    const anchorText = suggestion.anchor_text;
    const url = suggestion.url;
    
    // Find the anchor text in content (case-insensitive, word boundary)
    const regex = new RegExp(`\\b(${escapeRegExp(anchorText)})\\b(?![^<]*>)`, 'gi');
    const match = regex.exec(modifiedContent);
    
    if (match) {
      // Only replace first occurrence
      const before = modifiedContent.substring(0, match.index);
      const after = modifiedContent.substring(match.index + match[0].length);
      modifiedContent = `${before}<a href="${url}" target="_blank" rel="noopener">${match[1]}</a>${after}`;
      insertedLinks.push({ anchorText: match[1], url });
    }
  }

  return {
    content: modifiedContent,
    linksAdded: insertedLinks.length,
    linkDetails: insertedLinks,
  };
}

/**
 * Polish content using LLM
 * Note: For now, returns suggestions only - full LLM polishing can be added later
 */
async function polishWithLLM(
  content: string,
  title: string,
  operations: PolishOperation[],
  targetTone: string
): Promise<{
  content: string;
  changes: string[];
  suggestions: string[];
  grammarFixes: number;
  styleImprovements: number;
}> {
  // For now, we provide suggestions rather than auto-applying LLM changes
  // This gives the user more control over the polish process
  const suggestions: string[] = [];
  
  if (operations.includes('improve_readability')) {
    suggestions.push('Consider reviewing paragraph transitions for better flow');
  }
  if (operations.includes('fix_grammar')) {
    suggestions.push('Run content through a grammar checker for final polish');
  }
  if (operations.includes('strengthen_intro')) {
    suggestions.push('Review your introduction - does it hook the reader in the first sentence?');
  }
  if (operations.includes('strengthen_conclusion')) {
    suggestions.push('Ensure your conclusion has a clear call-to-action');
  }
  if (operations.includes('ensure_tone')) {
    suggestions.push(`Review content to ensure consistent ${targetTone} tone throughout`);
  }
  
  return {
    content, // Return unchanged - suggestions only mode
    changes: [],
    suggestions,
    grammarFixes: 0,
    styleImprovements: 0,
  };
}

/**
 * Generate SEO suggestions based on content analysis
 */
function generateSEOSuggestions(
  content: string,
  title: string,
  keywords: string[]
): string[] {
  const suggestions: string[] = [];
  const contentLower = content.toLowerCase();
  const titleLower = title.toLowerCase();

  // Check keyword presence
  for (const keyword of keywords.slice(0, 3)) {
    const keywordLower = keyword.toLowerCase();
    const count = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
    
    if (count === 0) {
      suggestions.push(`Consider adding the keyword "${keyword}" to your content`);
    } else if (count < 2) {
      suggestions.push(`Keyword "${keyword}" appears only ${count} time(s). Consider adding it 1-2 more times naturally.`);
    }
    
    if (!titleLower.includes(keywordLower)) {
      suggestions.push(`Consider including "${keyword}" in your title for better SEO`);
    }
  }

  // Check content length
  const wordCount = content.split(/\s+/).length;
  if (wordCount < 800) {
    suggestions.push('Content is under 800 words. Consider expanding for better SEO performance.');
  }

  // Check for headings
  const h2Count = (content.match(/<h2/gi) || []).length;
  if (h2Count < 3) {
    suggestions.push('Consider adding more H2 headings to improve content structure');
  }

  // Check for images
  const imgCount = (content.match(/<img/gi) || []).length;
  if (imgCount === 0) {
    suggestions.push('No images detected. Consider adding relevant images with alt text.');
  }

  return suggestions;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

