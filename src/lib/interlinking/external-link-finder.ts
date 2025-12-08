/**
 * External Link Finder
 * Phase 4.5: External Link Finder - Authority domain discovery and citation opportunities
 * 
 * Finds external linking opportunities for authority building and citations
 */

import { logger } from '@/utils/logger';

export interface ExternalLinkOpportunity {
  url: string;
  domain: string;
  title: string;
  description?: string;
  anchorText: string;
  relevanceScore: number;
  authorityScore: number;
  linkType: 'authority' | 'citation' | 'resource' | 'reference';
  reason: string;
  context: string;
}

export interface ExternalLinkAnalysis {
  opportunities: ExternalLinkOpportunity[];
  authorityLinks: ExternalLinkOpportunity[];
  citationLinks: ExternalLinkOpportunity[];
  resourceLinks: ExternalLinkOpportunity[];
  totalOpportunities: number;
}

export interface ExternalLinkRequest {
  content: string;
  title: string;
  keywords: string[];
  topics: string[];
  maxLinks?: number;
}

export class ExternalLinkFinderService {
  /**
   * Find external link opportunities
   */
  async findExternalLinks(
    request: ExternalLinkRequest
  ): Promise<ExternalLinkAnalysis> {
    try {
      logger.debug('Finding external link opportunities', {
        title: request.title,
        keywordsCount: request.keywords.length,
        topicsCount: request.topics.length,
      });

      const maxLinks = request.maxLinks || 3;

      // Find authority links (high-authority domains)
      const authorityLinks = await this.findAuthorityLinks(request, maxLinks);

      // Find citation links (research papers, studies)
      const citationLinks = await this.findCitationLinks(request, maxLinks);

      // Find resource links (tools, services, related content)
      const resourceLinks = await this.findResourceLinks(request, maxLinks);

      // Combine all opportunities
      const allOpportunities = [...authorityLinks, ...citationLinks, ...resourceLinks];

      // Sort by relevance and authority
      const sortedOpportunities = allOpportunities.sort(
        (a, b) => b.relevanceScore + b.authorityScore - (a.relevanceScore + a.authorityScore)
      );

      // Take top N
      const topOpportunities = sortedOpportunities.slice(0, maxLinks);

      logger.info('External link analysis completed', {
        totalOpportunities: topOpportunities.length,
        authorityLinks: authorityLinks.length,
        citationLinks: citationLinks.length,
        resourceLinks: resourceLinks.length,
      });

      return {
        opportunities: topOpportunities,
        authorityLinks: authorityLinks.slice(0, Math.ceil(maxLinks / 3)),
        citationLinks: citationLinks.slice(0, Math.ceil(maxLinks / 3)),
        resourceLinks: resourceLinks.slice(0, Math.ceil(maxLinks / 3)),
        totalOpportunities: topOpportunities.length,
      };
    } catch (error: any) {
      logger.error('Error finding external links', { error: error.message });
      throw error;
    }
  }

  /**
   * Find authority links (high-authority domains)
   */
  private async findAuthorityLinks(
    request: ExternalLinkRequest,
    maxLinks: number
  ): Promise<ExternalLinkOpportunity[]> {
    // List of high-authority domains by topic (can be expanded)
    const authorityDomains: Record<string, string[]> = {
      technology: ['wikipedia.org', 'github.com', 'stackoverflow.com', 'techcrunch.com'],
      business: ['forbes.com', 'hbr.org', 'entrepreneur.com', 'inc.com'],
      marketing: ['hubspot.com', 'marketingland.com', 'moz.com', 'searchenginejournal.com'],
      health: ['mayoclinic.org', 'webmd.com', 'healthline.com', 'nih.gov'],
      education: ['ed.gov', 'khanacademy.org', 'coursera.org', 'edx.org'],
      general: ['wikipedia.org', 'britannica.com', 'investopedia.com'],
    };

    const opportunities: ExternalLinkOpportunity[] = [];

    // Find relevant authority domains
    for (const topic of request.topics) {
      const normalizedTopic = topic.toLowerCase();
      
      // Match topic to domain category
      let category = 'general';
      if (normalizedTopic.includes('tech') || normalizedTopic.includes('software')) {
        category = 'technology';
      } else if (normalizedTopic.includes('business') || normalizedTopic.includes('entrepreneur')) {
        category = 'business';
      } else if (normalizedTopic.includes('marketing') || normalizedTopic.includes('seo')) {
        category = 'marketing';
      } else if (normalizedTopic.includes('health') || normalizedTopic.includes('medical')) {
        category = 'health';
      } else if (normalizedTopic.includes('education') || normalizedTopic.includes('learn')) {
        category = 'education';
      }

      const domains = authorityDomains[category] || authorityDomains.general;

      for (const domain of domains.slice(0, 2)) {
        // Generate a search URL or specific page URL
        const url = `https://${domain}/wiki/${topic.replace(/\s+/g, '_')}`;
        
        opportunities.push({
          url,
          domain,
          title: `${topic} - ${domain}`,
          description: `Authoritative information about ${topic}`,
          anchorText: `Learn more about ${topic}`,
          relevanceScore: 0.7,
          authorityScore: 0.9,
          linkType: 'authority',
          reason: `High-authority domain for ${topic}`,
          context: `For authoritative information about ${topic}, see ${domain}.`,
        });
      }
    }

    return opportunities.slice(0, maxLinks);
  }

  /**
   * Find citation links (research papers, studies)
   */
  private async findCitationLinks(
    request: ExternalLinkRequest,
    maxLinks: number
  ): Promise<ExternalLinkOpportunity[]> {
    const opportunities: ExternalLinkOpportunity[] = [];

    // Extract potential research topics from keywords
    const researchKeywords = request.keywords.filter(k => k.length > 5);

    for (const keyword of researchKeywords.slice(0, 2)) {
      // Generate search URLs for research databases
      const googleScholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(keyword)}`;
      const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(keyword)}`;

      opportunities.push({
        url: googleScholarUrl,
        domain: 'scholar.google.com',
        title: `Research on ${keyword}`,
        description: `Academic research and studies about ${keyword}`,
        anchorText: `Research on ${keyword}`,
        relevanceScore: 0.6,
        authorityScore: 0.95,
        linkType: 'citation',
        reason: `Academic research source for ${keyword}`,
        context: `Research studies on ${keyword} provide additional context.`,
      });

      // Only add PubMed for health-related topics
      if (request.topics.some(t => t.toLowerCase().includes('health'))) {
        opportunities.push({
          url: pubmedUrl,
          domain: 'pubmed.ncbi.nlm.nih.gov',
          title: `Medical research on ${keyword}`,
          description: `Medical and health research about ${keyword}`,
          anchorText: `Medical research on ${keyword}`,
          relevanceScore: 0.7,
          authorityScore: 0.95,
          linkType: 'citation',
          reason: `Medical research source for ${keyword}`,
          context: `Medical research on ${keyword} supports this information.`,
        });
      }
    }

    return opportunities.slice(0, maxLinks);
  }

  /**
   * Find resource links (tools, services, related content)
   */
  private async findResourceLinks(
    request: ExternalLinkRequest,
    maxLinks: number
  ): Promise<ExternalLinkOpportunity[]> {
    const opportunities: ExternalLinkOpportunity[] = [];

    // Common resource domains by topic
    const resourceDomains: Record<string, string[]> = {
      technology: ['github.com', 'stackoverflow.com', 'dev.to'],
      marketing: ['hubspot.com', 'buffer.com', 'sproutsocial.com'],
      business: ['entrepreneur.com', 'inc.com', 'smallbiztrends.com'],
      general: ['wikipedia.org'],
    };

    // Find relevant resource domains
    for (const topic of request.topics.slice(0, 2)) {
      const normalizedTopic = topic.toLowerCase();
      
      let category = 'general';
      if (normalizedTopic.includes('tech') || normalizedTopic.includes('software')) {
        category = 'technology';
      } else if (normalizedTopic.includes('marketing')) {
        category = 'marketing';
      } else if (normalizedTopic.includes('business')) {
        category = 'business';
      }

      const domains = resourceDomains[category] || resourceDomains.general;

      for (const domain of domains.slice(0, 1)) {
        const url = `https://${domain}/search?q=${encodeURIComponent(topic)}`;
        
        opportunities.push({
          url,
          domain,
          title: `Resources for ${topic}`,
          description: `Tools and resources related to ${topic}`,
          anchorText: `Explore ${topic} resources`,
          relevanceScore: 0.5,
          authorityScore: 0.7,
          linkType: 'resource',
          reason: `Useful resources for ${topic}`,
          context: `Additional resources for ${topic} are available.`,
        });
      }
    }

    return opportunities.slice(0, maxLinks);
  }
}

