/**
 * Content Ideas Generation Service
 * Phase 2: Content Cluster Strategy Engine
 * 
 * This service handles:
 * - Generating content ideas from keyword clusters
 * - Creating pillar and supporting content strategies
 * - Content gap analysis
 * - Title and meta description generation
 */

import { createClient } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';

// =====================================================
// Types and Interfaces
// =====================================================

export interface ContentIdea {
  id?: string;
  cluster_id?: string;
  content_type: 'pillar' | 'supporting' | 'long_tail';
  target_keyword: string;
  title: string;
  meta_description: string;
  url_slug: string;
  outline?: ContentOutline;
  word_count_target: number;
  tone: string;
  status: 'idea' | 'planned' | 'in_progress' | 'draft' | 'review' | 'published' | 'archived';
  priority: number;
  search_volume?: number;
  keyword_difficulty?: number;
  content_gap_score?: number;
  internal_links_planned?: InternalLinkPlan[];
  external_links_planned?: ExternalLinkPlan[];
}

export interface ContentOutline {
  introduction: string;
  sections: OutlineSection[];
  conclusion: string;
  cta?: string;
}

export interface OutlineSection {
  heading: string;
  level: 'h2' | 'h3' | 'h4';
  description: string;
  keywords: string[];
  subsections?: OutlineSection[];
}

export interface InternalLinkPlan {
  target_content_id?: string;
  anchor_text: string;
  target_url?: string;
  context: string;
}

export interface ExternalLinkPlan {
  url: string;
  anchor_text: string;
  rel: 'nofollow' | 'dofollow';
  context: string;
}

export interface ContentCluster {
  id?: string;
  cluster_name: string;
  pillar_keyword: string;
  cluster_description?: string;
  cluster_status: 'planning' | 'in_progress' | 'completed' | 'archived';
  authority_score: number;
  total_keywords: number;
  content_count: number;
  pillar_content_count: number;
  supporting_content_count: number;
}

export interface ContentIdeaGenerationRequest {
  keywords: string[];
  pillar_keyword?: string;
  cluster_name?: string;
  tone?: string;
  target_audience?: string;
  industry?: string;
}

export interface ContentIdeaGenerationResponse {
  cluster: ContentCluster;
  pillar_ideas: ContentIdea[];
  supporting_ideas: ContentIdea[];
  long_tail_ideas: ContentIdea[];
}

// =====================================================
// Content Ideas Generation Service
// =====================================================

export class ContentIdeasService {
  /**
   * Generate content ideas from selected keywords
   */
  async generateContentIdeas(
    request: ContentIdeaGenerationRequest
  ): Promise<ContentIdeaGenerationResponse> {
    const { keywords, pillar_keyword, cluster_name, tone = 'professional', target_audience, industry } = request;

    // Identify the pillar keyword (highest search volume or explicitly provided)
    const primaryPillar = pillar_keyword || keywords[0];
    
    // Create cluster
    const cluster: ContentCluster = {
      cluster_name: cluster_name || this.generateClusterName(primaryPillar),
      pillar_keyword: primaryPillar,
      cluster_description: `Content cluster focused on ${primaryPillar} and related topics`,
      cluster_status: 'planning',
      authority_score: 0,
      total_keywords: keywords.length,
      content_count: 0,
      pillar_content_count: 0,
      supporting_content_count: 0,
    };

    // Generate pillar content ideas
    const pillar_ideas = this.generatePillarIdeas([primaryPillar], tone, target_audience);
    
    // Generate supporting content ideas
    const supporting_ideas = this.generateSupportingIdeas(
      keywords.filter(k => k !== primaryPillar),
      primaryPillar,
      tone,
      target_audience
    );
    
    // Generate long-tail content ideas
    const long_tail_ideas = this.generateLongTailIdeas(keywords, primaryPillar, tone);

    return {
      cluster,
      pillar_ideas,
      supporting_ideas,
      long_tail_ideas,
    };
  }

  /**
   * Generate pillar content ideas
   */
  private generatePillarIdeas(
    keywords: string[],
    tone: string,
    target_audience?: string
  ): ContentIdea[] {
    return keywords.map((keyword, index) => ({
      content_type: 'pillar',
      target_keyword: keyword,
      title: this.generatePillarTitle(keyword, target_audience),
      meta_description: this.generateMetaDescription(keyword, 'pillar', target_audience),
      url_slug: this.generateUrlSlug(keyword),
      word_count_target: 3000 + (index * 500), // 3000-3500 words for pillar
      tone,
      status: 'idea',
      priority: 10 - index, // Higher priority for first pillars
      outline: this.generatePillarOutline(keyword),
    }));
  }

  /**
   * Generate supporting content ideas
   */
  private generateSupportingIdeas(
    keywords: string[],
    pillar_keyword: string,
    tone: string,
    target_audience?: string
  ): ContentIdea[] {
    return keywords.slice(0, 10).map((keyword, index) => ({
      content_type: 'supporting',
      target_keyword: keyword,
      title: this.generateSupportingTitle(keyword, target_audience),
      meta_description: this.generateMetaDescription(keyword, 'supporting', target_audience),
      url_slug: this.generateUrlSlug(keyword),
      word_count_target: 1500 + (index * 100), // 1500-2400 words
      tone,
      status: 'idea',
      priority: 7 - Math.floor(index / 3), // Group priority by threes
      internal_links_planned: [{
        anchor_text: pillar_keyword,
        context: `Learn more about ${pillar_keyword} in our comprehensive guide`,
      }],
    }));
  }

  /**
   * Generate long-tail content ideas
   */
  private generateLongTailIdeas(
    keywords: string[],
    pillar_keyword: string,
    tone: string
  ): ContentIdea[] {
    const longTailKeywords = keywords.filter(k => 
      k.length > pillar_keyword.length && k.includes(' ')
    ).slice(0, 25);

    return longTailKeywords.map((keyword, index) => ({
      content_type: 'long_tail',
      target_keyword: keyword,
      title: this.generateLongTailTitle(keyword),
      meta_description: this.generateMetaDescription(keyword, 'long_tail'),
      url_slug: this.generateUrlSlug(keyword),
      word_count_target: 1000 + (index * 50), // 1000-1700 words
      tone,
      status: 'idea',
      priority: 4 - Math.floor(index / 5), // Lower priority, grouped
    }));
  }

  /**
   * Generate cluster name from pillar keyword
   */
  private generateClusterName(pillar_keyword: string): string {
    // Capitalize first letter of each word
    return pillar_keyword
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate pillar content title
   */
  private generatePillarTitle(keyword: string, target_audience?: string): string {
    const templates = [
      `The Complete Guide to ${keyword}${target_audience ? ` for ${target_audience}` : ''}`,
      `Everything You Need to Know About ${keyword}${target_audience ? ` (${target_audience} Edition)` : ''}`,
      `${keyword}: The Ultimate Guide${target_audience ? ` for ${target_audience}` : ''}`,
      `Master ${keyword}${target_audience ? `: A ${target_audience} Guide` : ': A Comprehensive Guide'}`,
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate supporting content title
   */
  private generateSupportingTitle(keyword: string, target_audience?: string): string {
    const isQuestion = keyword.toLowerCase().startsWith('how') || 
                       keyword.toLowerCase().startsWith('what') ||
                       keyword.toLowerCase().startsWith('why') ||
                       keyword.toLowerCase().startsWith('when');
    
    if (isQuestion) {
      return keyword.charAt(0).toUpperCase() + keyword.slice(1) + '?';
    }

    const templates = [
      `How to ${keyword}${target_audience ? ` for ${target_audience}` : ''}`,
      `${keyword}: A Practical Guide`,
      `Understanding ${keyword}${target_audience ? ` (${target_audience})` : ''}`,
      `${keyword} Explained: Tips and Best Practices`,
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate long-tail content title
   */
  private generateLongTailTitle(keyword: string): string {
    const isQuestion = keyword.toLowerCase().startsWith('how') || 
                       keyword.toLowerCase().startsWith('what') ||
                       keyword.toLowerCase().startsWith('why');
    
    if (isQuestion) {
      return keyword.charAt(0).toUpperCase() + keyword.slice(1) + '?';
    }

    return keyword
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate meta description
   */
  private generateMetaDescription(
    keyword: string,
    content_type: 'pillar' | 'supporting' | 'long_tail',
    target_audience?: string
  ): string {
    const audiencePart = target_audience ? ` for ${target_audience}` : '';
    
    const descriptions = {
      pillar: `Discover everything you need to know about ${keyword}${audiencePart}. This comprehensive guide covers best practices, strategies, and expert tips.`,
      supporting: `Learn ${keyword}${audiencePart} with this practical guide. Get actionable tips, step-by-step instructions, and expert insights.`,
      long_tail: `Find out ${keyword}${audiencePart}. Quick answers, practical tips, and expert recommendations to help you succeed.`,
    };

    const description = descriptions[content_type];
    
    // Ensure it's within 150-160 characters (ideal for SEO)
    return description.length > 160 
      ? description.substring(0, 157) + '...'
      : description;
  }

  /**
   * Generate URL slug from keyword
   */
  private generateUrlSlug(keyword: string): string {
    return keyword
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Generate pillar content outline
   */
  private generatePillarOutline(keyword: string): ContentOutline {
    return {
      introduction: `Introduction to ${keyword} and why it matters`,
      sections: [
        {
          heading: `What is ${keyword}?`,
          level: 'h2',
          description: `Define ${keyword} and provide context`,
          keywords: [keyword, 'definition', 'overview'],
        },
        {
          heading: `Why ${keyword} Matters`,
          level: 'h2',
          description: `Explain the importance and benefits`,
          keywords: [keyword, 'benefits', 'importance'],
        },
        {
          heading: `How to Get Started with ${keyword}`,
          level: 'h2',
          description: `Step-by-step guide for beginners`,
          keywords: [keyword, 'getting started', 'beginners guide'],
        },
        {
          heading: `Advanced ${keyword} Strategies`,
          level: 'h2',
          description: `Expert tips and advanced techniques`,
          keywords: [keyword, 'advanced', 'expert tips'],
        },
        {
          heading: `Common Mistakes to Avoid`,
          level: 'h2',
          description: `Pitfalls and how to avoid them`,
          keywords: [keyword, 'mistakes', 'avoid'],
        },
        {
          heading: `Best Practices for ${keyword}`,
          level: 'h2',
          description: `Industry best practices and recommendations`,
          keywords: [keyword, 'best practices', 'recommendations'],
        },
      ],
      conclusion: `Wrap up key points about ${keyword} and next steps`,
      cta: `Ready to master ${keyword}? Get started today!`,
    };
  }

  /**
   * Save content cluster and ideas to database
   */
  async saveContentCluster(
    userId: string,
    cluster: ContentCluster,
    content_ideas: ContentIdea[]
  ): Promise<{ success: boolean; cluster_id?: string; error?: string }> {
    try {
      const supabase = createClient();
      
      // Get user's org_id
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('org_id')
        .eq('user_id', userId)
        .single();

      if (userError || !userProfile) {
        logger.error('Failed to get user org_id:', userError);
        return { success: false, error: 'User organization not found' };
      }

      const orgId = userProfile.org_id;
      
      // Check if cluster with same name already exists for this org
      let clusterName = cluster.cluster_name;
      const { data: existingClusters } = await supabase
        .from('content_clusters')
        .select('cluster_name')
        .eq('org_id', orgId)
        .eq('cluster_name', clusterName);
      
      // If duplicate exists, append a short timestamp to make it unique
      if (existingClusters && existingClusters.length > 0) {
        const timestamp = new Date().toISOString().split('T')[0]; // Just the date: YYYY-MM-DD
        clusterName = `${cluster.cluster_name} (${timestamp})`;
        logger.debug('⚠️ Duplicate cluster name detected, appending date:', {
          original: cluster.cluster_name,
          new: clusterName
        });
      }
      
      // Insert cluster
      let clusterData: any = null;
      let clusterError: any = null;
      
      const { data: insertData, error: insertError } = await supabase
        .from('content_clusters')
        .insert({
          user_id: userId,
          org_id: orgId,
          cluster_name: clusterName,
          pillar_keyword: cluster.pillar_keyword,
          cluster_description: cluster.cluster_description,
          cluster_status: cluster.cluster_status,
          authority_score: cluster.authority_score,
          total_keywords: cluster.total_keywords,
          content_count: content_ideas.length,
          pillar_content_count: content_ideas.filter(i => i.content_type === 'pillar').length,
          supporting_content_count: content_ideas.filter(i => i.content_type === 'supporting').length,
        })
        .select()
        .single();

      clusterData = insertData;
      clusterError = insertError;

      // If there's a unique constraint violation, try with a more unique name
      if (clusterError && (clusterError.message?.includes('unique_cluster_per_org') || clusterError.code === '23505')) {
        logger.debug('🔄 Unique constraint violation detected, retrying with timestamp:', clusterError);
        const retryTimestamp = Date.now();
        const retryClusterName = `${cluster.cluster_name} (${retryTimestamp})`;
        
        const { data: retryData, error: retryError } = await supabase
          .from('content_clusters')
          .insert({
            user_id: userId,
            org_id: orgId,
            cluster_name: retryClusterName,
            pillar_keyword: cluster.pillar_keyword,
            cluster_description: cluster.cluster_description,
            cluster_status: cluster.cluster_status,
            authority_score: cluster.authority_score,
            total_keywords: cluster.total_keywords,
            content_count: content_ideas.length,
            pillar_content_count: content_ideas.filter(i => i.content_type === 'pillar').length,
            supporting_content_count: content_ideas.filter(i => i.content_type === 'supporting').length,
          })
          .select()
          .single();
        
        if (retryError) {
          logger.error('Failed to save cluster on retry:', retryError);
          return { success: false, error: `A cluster with this name already exists. Please use a different name.` };
        }
        
        clusterData = retryData;
        clusterError = null;
      }

      if (clusterError) {
        logger.error('Failed to save cluster:', clusterError);
        return { success: false, error: clusterError.message };
      }

      if (!clusterData) {
        logger.error('No cluster data returned from insert');
        return { success: false, error: 'Failed to save cluster: No data returned' };
      }

      // Check for existing content ideas in this cluster to determine sequence numbers
      const { data: existingIdeas } = await supabase
        .from('cluster_content_ideas')
        .select('target_keyword, keyword_sequence')
        .eq('cluster_id', clusterData.id);

      // Build a map of existing sequences per keyword
      const existingSequences = new Map<string, number>();
      if (existingIdeas) {
        for (const idea of existingIdeas) {
          const keyword = idea.target_keyword;
          const currentMax = existingSequences.get(keyword) || 0;
          const sequence = idea.keyword_sequence || 1;
          if (sequence > currentMax) {
            existingSequences.set(keyword, sequence);
          }
        }
      }

      // Group new ideas by target_keyword to assign sequence numbers
      const keywordGroups = new Map<string, number>();
      
      // Initialize keyword groups with existing max sequences
      for (const [keyword, maxSeq] of existingSequences.entries()) {
        keywordGroups.set(keyword, maxSeq);
      }

      // Insert content ideas with proper sequence numbers
      const ideasToInsert = content_ideas.map(idea => {
        const keyword = idea.target_keyword;
        const currentSequence = keywordGroups.get(keyword) || 0;
        const nextSequence = currentSequence + 1;
        keywordGroups.set(keyword, nextSequence);
        
        return {
          cluster_id: clusterData.id,
          org_id: orgId,
          content_type: idea.content_type,
          target_keyword: idea.target_keyword,
          keyword_sequence: nextSequence,
          title: idea.title,
          meta_description: idea.meta_description,
          url_slug: idea.url_slug,
          outline: idea.outline,
          word_count_target: idea.word_count_target,
          tone: idea.tone,
          status: idea.status,
          priority: idea.priority,
          search_volume: idea.search_volume,
          keyword_difficulty: idea.keyword_difficulty,
          content_gap_score: idea.content_gap_score,
          internal_links_planned: idea.internal_links_planned,
          external_links_planned: idea.external_links_planned,
        };
      });

      let ideasError: any = null;
      let retryAttempts = 0;
      const maxRetries = 3;

      // Try inserting with retry logic for race conditions
      while (retryAttempts < maxRetries) {
        const { error: insertError } = await supabase
          .from('cluster_content_ideas')
          .insert(ideasToInsert);

        ideasError = insertError;

        // If no error or not a unique constraint violation, break
        if (!ideasError || (!ideasError.message?.includes('unique_keyword_sequence_per_cluster') && ideasError.code !== '23505')) {
          break;
        }

        // If it's a unique constraint violation, refresh existing sequences and retry
        logger.debug(`⚠️ Unique constraint violation on content ideas, retry ${retryAttempts + 1}/${maxRetries}`);
        
        // Re-fetch existing ideas to get updated sequences
        const { data: updatedExistingIdeas } = await supabase
          .from('cluster_content_ideas')
          .select('target_keyword, keyword_sequence')
          .eq('cluster_id', clusterData.id);

        // Rebuild sequence map
        const updatedSequences = new Map<string, number>();
        if (updatedExistingIdeas) {
          for (const idea of updatedExistingIdeas) {
            const keyword = idea.target_keyword;
            const currentMax = updatedSequences.get(keyword) || 0;
            const sequence = idea.keyword_sequence || 1;
            if (sequence > currentMax) {
              updatedSequences.set(keyword, sequence);
            }
          }
        }

        // Reset keyword groups with updated sequences
        keywordGroups.clear();
        for (const [keyword, maxSeq] of updatedSequences.entries()) {
          keywordGroups.set(keyword, maxSeq);
        }

        // Rebuild ideasToInsert with updated sequences
        for (let i = 0; i < ideasToInsert.length; i++) {
          const idea = content_ideas[i];
          const keyword = idea.target_keyword;
          const currentSequence = keywordGroups.get(keyword) || 0;
          const nextSequence = currentSequence + 1;
          keywordGroups.set(keyword, nextSequence);
          ideasToInsert[i].keyword_sequence = nextSequence;
        }

        retryAttempts++;
      }

      if (ideasError) {
        logger.error('Failed to save content ideas after retries:', ideasError);
        return { success: false, error: `Failed to save content ideas: ${ideasError.message || 'Unknown error'}` };
      }

      logger.debug('✅ Successfully saved content cluster and ideas');
      return { success: true, cluster_id: clusterData.id };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error saving content cluster:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get user's content clusters
   */
  async getUserClusters(userId: string): Promise<ContentCluster[]> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('content_clusters')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch clusters:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error fetching clusters:', error);
      return [];
    }
  }

  /**
   * Get content ideas for a cluster
   */
  async getClusterContentIdeas(clusterId: string): Promise<ContentIdea[]> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('cluster_content_ideas')
        .select('*')
        .eq('cluster_id', clusterId)
        .order('priority', { ascending: false });

      if (error) {
        logger.error('Failed to fetch content ideas:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error fetching content ideas:', error);
      return [];
    }
  }
}

