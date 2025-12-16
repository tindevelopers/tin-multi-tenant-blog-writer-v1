/**
 * Link Validation Service
 * 
 * Validates internal links in content before publishing.
 * Ensures all links point to content on the correct target site.
 */

import { logger } from '@/utils/logger';
import { createServiceClient } from '@/lib/supabase/service';
import { SiteAwareInterlinkingService } from './site-aware-interlinking-service';

export interface LinkInfo {
  url: string;
  anchorText: string;
  position: number; // Character position in content
}

export interface ValidatedLink extends LinkInfo {
  isValid: boolean;
  status: 'valid' | 'broken' | 'wrong_site' | 'not_published' | 'not_indexed' | 'external';
  issue?: string;
  suggestion?: string;
  suggestedUrl?: string;
}

export interface LinkValidationResult {
  isValid: boolean;
  totalLinks: number;
  validLinks: number;
  brokenLinks: number;
  wrongSiteLinks: number;
  externalLinks: number;
  links: ValidatedLink[];
  warnings: string[];
  errors: string[];
  canPublish: boolean; // true if no blocking issues
}

export interface LinkValidationRequest {
  content: string;
  targetSiteId: string;
  targetSiteUrl?: string;
  postId?: string;
  orgId: string;
  strictMode?: boolean; // If true, wrong_site links are errors, not warnings
}

export class LinkValidationService {
  private supabase;

  constructor() {
    this.supabase = createServiceClient();
  }

  /**
   * Extract all links from HTML content
   */
  extractLinks(htmlContent: string): LinkInfo[] {
    const links: LinkInfo[] = [];
    
    // Match <a> tags with href attributes
    const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(htmlContent)) !== null) {
      const url = match[1];
      const anchorText = match[2].trim();
      const position = match.index;

      // Skip anchor links and javascript
      if (url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:')) {
        continue;
      }

      links.push({ url, anchorText, position });
    }

    return links;
  }

  /**
   * Validate all links in content against the target site
   */
  async validateLinks(request: LinkValidationRequest): Promise<LinkValidationResult> {
    const { content, targetSiteId, targetSiteUrl, postId, orgId, strictMode = false } = request;

    try {
      logger.info('Starting link validation', {
        targetSiteId,
        postId,
        orgId,
      });

      const extractedLinks = this.extractLinks(content);
      const validatedLinks: ValidatedLink[] = [];
      const warnings: string[] = [];
      const errors: string[] = [];

      let validCount = 0;
      let brokenCount = 0;
      let wrongSiteCount = 0;
      let externalCount = 0;

      const interlinkingService = new SiteAwareInterlinkingService(orgId);

      for (const link of extractedLinks) {
        const validationResult = await this.validateSingleLink(
          link,
          targetSiteId,
          targetSiteUrl,
          interlinkingService
        );

        validatedLinks.push(validationResult);

        switch (validationResult.status) {
          case 'valid':
            validCount++;
            break;
          case 'external':
            externalCount++;
            break;
          case 'broken':
            brokenCount++;
            errors.push(`Broken link: "${link.anchorText}" → ${link.url}`);
            break;
          case 'wrong_site':
            wrongSiteCount++;
            const message = `Link points to wrong site: "${link.anchorText}" → ${link.url}`;
            if (strictMode) {
              errors.push(message);
            } else {
              warnings.push(message);
            }
            if (validationResult.suggestedUrl) {
              warnings.push(`  Suggested replacement: ${validationResult.suggestedUrl}`);
            }
            break;
          case 'not_published':
            brokenCount++;
            warnings.push(`Link target not published: "${link.anchorText}" → ${link.url}`);
            break;
        }
      }

      // Determine if publishing can proceed
      const hasBlockingErrors = errors.length > 0 || (strictMode && wrongSiteCount > 0);
      const canPublish = !hasBlockingErrors;

      // Add summary warnings
      if (wrongSiteCount > 0) {
        warnings.unshift(`⚠️ ${wrongSiteCount} link(s) point to content on a different site`);
      }
      if (brokenCount > 0) {
        warnings.unshift(`❌ ${brokenCount} broken link(s) found`);
      }

      const result: LinkValidationResult = {
        isValid: validCount === extractedLinks.length - externalCount,
        totalLinks: extractedLinks.length,
        validLinks: validCount,
        brokenLinks: brokenCount,
        wrongSiteLinks: wrongSiteCount,
        externalLinks: externalCount,
        links: validatedLinks,
        warnings,
        errors,
        canPublish,
      };

      // Save validation result to database
      if (postId) {
        await this.saveValidationResult(orgId, postId, targetSiteId, result);
      }

      logger.info('Link validation completed', {
        targetSiteId,
        postId,
        totalLinks: result.totalLinks,
        validLinks: result.validLinks,
        brokenLinks: result.brokenLinks,
        wrongSiteLinks: result.wrongSiteLinks,
        canPublish: result.canPublish,
      });

      return result;
    } catch (error: any) {
      logger.error('Error validating links', {
        error: error.message,
        targetSiteId,
        postId,
      });
      throw error;
    }
  }

  /**
   * Validate a single link
   */
  private async validateSingleLink(
    link: LinkInfo,
    targetSiteId: string,
    targetSiteUrl: string | undefined,
    interlinkingService: SiteAwareInterlinkingService
  ): Promise<ValidatedLink> {
    const { url, anchorText, position } = link;

    // Check if external link
    if (this.isExternalLink(url, targetSiteUrl)) {
      return {
        ...link,
        isValid: true,
        status: 'external',
      };
    }

    // Validate internal link
    const validation = await interlinkingService.validateExistingLink(
      url,
      targetSiteId,
      targetSiteUrl
    );

    if (validation.isValid) {
      return {
        ...link,
        isValid: true,
        status: 'valid',
      };
    }

    return {
      ...link,
      isValid: false,
      status: validation.issue || 'broken',
      issue: validation.suggestion,
      suggestion: validation.suggestion,
      suggestedUrl: validation.correctSiteUrl,
    };
  }

  /**
   * Check if a URL is external
   */
  private isExternalLink(url: string, targetSiteUrl?: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Protocol-relative URLs starting with // are external
      if (url.startsWith('//')) {
        return true;
      }

      // If we have a target site URL, compare hostnames
      if (targetSiteUrl) {
        const targetObj = new URL(targetSiteUrl);
        return urlObj.hostname !== targetObj.hostname;
      }

      // Without target URL, use heuristics
      // If URL has a full hostname and it's not localhost, consider it external
      if (urlObj.hostname && !urlObj.hostname.includes('localhost')) {
        return true;
      }

      return false;
    } catch {
      // If URL parsing fails, assume it's a relative URL (internal)
      return false;
    }
  }

  /**
   * Save validation result to database
   */
  private async saveValidationResult(
    orgId: string,
    postId: string,
    targetSiteId: string,
    result: LinkValidationResult
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('link_validation_results')
        .upsert({
          org_id: orgId,
          post_id: postId,
          target_site_id: targetSiteId,
          is_valid: result.isValid,
          total_links: result.totalLinks,
          valid_links: result.validLinks,
          broken_links: result.brokenLinks,
          wrong_site_links: result.wrongSiteLinks,
          link_details: result.links,
          warnings: result.warnings,
          errors: result.errors,
          validated_at: new Date().toISOString(),
        }, {
          onConflict: 'post_id,target_site_id',
          ignoreDuplicates: false,
        });

      if (error) {
        // Log but don't throw - validation results are supplementary
        logger.warn('Failed to save validation result', { error: error.message, postId });
      }
    } catch (error: any) {
      logger.warn('Error saving validation result', { error: error.message, postId });
    }
  }

  /**
   * Get the last validation result for a post
   */
  async getLastValidationResult(
    postId: string,
    targetSiteId?: string
  ): Promise<LinkValidationResult | null> {
    try {
      let query = this.supabase
        .from('link_validation_results')
        .select('*')
        .eq('post_id', postId)
        .order('validated_at', { ascending: false })
        .limit(1);

      if (targetSiteId) {
        query = query.eq('target_site_id', targetSiteId);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      return {
        isValid: data.is_valid,
        totalLinks: data.total_links,
        validLinks: data.valid_links,
        brokenLinks: data.broken_links,
        wrongSiteLinks: data.wrong_site_links,
        externalLinks: data.total_links - data.valid_links - data.broken_links - data.wrong_site_links,
        links: data.link_details || [],
        warnings: data.warnings || [],
        errors: data.errors || [],
        canPublish: data.errors?.length === 0,
      };
    } catch (error: any) {
      logger.error('Error getting validation result', { error: error.message, postId });
      return null;
    }
  }

  /**
   * Auto-fix links in content by replacing wrong-site links with suggestions
   */
  autoFixLinks(content: string, validatedLinks: ValidatedLink[]): {
    fixedContent: string;
    fixedCount: number;
    unfixableLinks: ValidatedLink[];
  } {
    let fixedContent = content;
    let fixedCount = 0;
    const unfixableLinks: ValidatedLink[] = [];

    // Process links in reverse order to preserve positions
    const linksToFix = validatedLinks
      .filter(link => link.status === 'wrong_site' && link.suggestedUrl)
      .sort((a, b) => b.position - a.position);

    for (const link of linksToFix) {
      if (link.suggestedUrl) {
        // Replace the URL in the content
        const oldLinkPattern = new RegExp(
          `<a\\s+([^>]*)href=["']${this.escapeRegex(link.url)}["']([^>]*)>`,
          'gi'
        );
        
        const newContent = fixedContent.replace(
          oldLinkPattern,
          `<a $1href="${link.suggestedUrl}"$2>`
        );

        if (newContent !== fixedContent) {
          fixedContent = newContent;
          fixedCount++;
        } else {
          unfixableLinks.push(link);
        }
      }
    }

    // Add links that couldn't be auto-fixed
    const noSuggestionLinks = validatedLinks.filter(
      link => (link.status === 'wrong_site' || link.status === 'broken') && !link.suggestedUrl
    );
    unfixableLinks.push(...noSuggestionLinks);

    return { fixedContent, fixedCount, unfixableLinks };
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate a link validation report
   */
  generateReport(result: LinkValidationResult): string {
    const lines: string[] = [];
    
    lines.push('# Link Validation Report\n');
    lines.push(`**Total Links:** ${result.totalLinks}`);
    lines.push(`**Valid Internal Links:** ${result.validLinks}`);
    lines.push(`**External Links:** ${result.externalLinks}`);
    lines.push(`**Broken Links:** ${result.brokenLinks}`);
    lines.push(`**Wrong Site Links:** ${result.wrongSiteLinks}`);
    lines.push(`**Can Publish:** ${result.canPublish ? '✅ Yes' : '❌ No'}\n`);

    if (result.errors.length > 0) {
      lines.push('## Errors\n');
      result.errors.forEach(err => lines.push(`- ❌ ${err}`));
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push('## Warnings\n');
      result.warnings.forEach(warn => lines.push(`- ⚠️ ${warn}`));
      lines.push('');
    }

    if (result.links.filter(l => l.status === 'wrong_site').length > 0) {
      lines.push('## Links Pointing to Wrong Site\n');
      lines.push('| Anchor Text | Current URL | Suggested URL |');
      lines.push('|-------------|-------------|---------------|');
      
      result.links
        .filter(l => l.status === 'wrong_site')
        .forEach(link => {
          lines.push(`| ${link.anchorText} | ${link.url} | ${link.suggestedUrl || 'N/A'} |`);
        });
      lines.push('');
    }

    return lines.join('\n');
  }
}
