/**
 * Multi-Phase Blog Creation Workflow Orchestrator
 * 
 * Phases:
 * 1. Content Generation - Generate blog content via enhanced endpoint
 * 2. Image Generation - Generate and optimize images
 * 3. Content Enhancement - SEO optimization, structure improvements
 * 4. Advanced Interlinking - Hybrid website analysis and link optimization
 * 5. Publishing Preparation - Webflow field mapping and validation
 */

import { logger } from '@/utils/logger';
import { blogWriterAPI } from '@/lib/blog-writer-api';
import { imageGenerator } from '@/lib/image-generation';
import { WebsiteCrawlerService, type CrawledPage } from '@/lib/interlinking/website-crawler';
import { ContentIndexerService, type IndexedContent } from '@/lib/interlinking/content-indexer';
import { ClusterAnalyzerService, type ClusterAnalysis } from '@/lib/interlinking/cluster-analyzer';
import { InterlinkingEngine, type InterlinkingAnalysis, type LinkOpportunity } from '@/lib/interlinking/interlinking-engine';
import { ExternalLinkFinderService, type ExternalLinkAnalysis } from '@/lib/interlinking/external-link-finder';

// Workflow Types
export type WorkflowPhase = 
  | 'idle'
  | 'content_generation'
  | 'image_generation'
  | 'content_enhancement'
  | 'interlinking'
  | 'publishing_preparation'
  | 'completed'
  | 'failed';

export interface WorkflowState {
  id: string;
  phase: WorkflowPhase;
  progress: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  
  // Phase-specific data
  contentGeneration?: ContentGenerationResult;
  imageGeneration?: ImageGenerationResult;
  contentEnhancement?: ContentEnhancementResult;
  interlinking?: InterlinkingResult;
  publishingPreparation?: PublishingPreparationResult;
}

export interface ContentGenerationResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  queueId?: string;
  jobId?: string;
  content?: string;
  title?: string;
  excerpt?: string;
  wordCount?: number;
  seoData?: Record<string, unknown>;
  error?: string;
}

export interface ImageGenerationResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  featuredImage?: GeneratedImageData;
  contentImages?: GeneratedImageData[];
  thumbnailImage?: GeneratedImageData;
  error?: string;
}

export interface GeneratedImageData {
  imageId: string;
  imageUrl?: string;
  altText?: string;
  width: number;
  height: number;
  format: string;
  placement?: 'featured' | 'thumbnail' | 'inline';
}

export interface ContentEnhancementResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  seoTitle?: string;
  metaDescription?: string;
  slug?: string;
  keywords?: string[];
  readabilityScore?: number;
  seoScore?: number;
  qualityScore?: number;
  structuredData?: Record<string, unknown>;
  recommendations?: string[];
  error?: string;
}

export interface InterlinkingResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  crawledAt?: string;
  indexedContentCount?: number;
  clusterAnalysis?: ClusterAnalysis;
  interlinkingAnalysis?: InterlinkingAnalysis;
  externalLinks?: ExternalLinkAnalysis;
  appliedLinks?: AppliedLink[];
  error?: string;
}

export interface AppliedLink {
  anchorText: string;
  url: string;
  type: 'internal' | 'external' | 'cluster';
  placement: 'introduction' | 'body' | 'conclusion';
  reason: string;
}

export interface PublishingPreparationResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fieldMappingValidation?: FieldMappingValidation;
  contentScore?: ContentScore;
  publishingReadiness?: PublishingReadiness;
  error?: string;
}

export interface FieldMappingValidation {
  isValid: boolean;
  requiredFields: FieldStatus[];
  recommendedFields: FieldStatus[];
  optionalFields: FieldStatus[];
  missingRequired: string[];
  missingRecommended: string[];
}

export interface FieldStatus {
  name: string;
  webflowField?: string;
  value?: unknown;
  status: 'filled' | 'empty' | 'invalid';
}

export interface ContentScore {
  overall: number;
  readability: number;
  seo: number;
  quality: number;
  interlinking: number;
  images: number;
}

export interface PublishingReadiness {
  isReady: boolean;
  issues: string[];
  warnings: string[];
  suggestions: string[];
}

// Workflow Configuration
export interface WorkflowConfig {
  topic: string;
  keywords: string[];
  targetAudience?: string;
  tone?: string;
  wordCount?: number;
  qualityLevel?: string;
  
  // Image options
  generateFeaturedImage?: boolean;
  generateContentImages?: boolean;
  imageStyle?: string;
  
  // Enhancement options
  optimizeForSeo?: boolean;
  generateStructuredData?: boolean;
  
  // Interlinking options
  crawlWebsite?: boolean;
  maxInternalLinks?: number;
  maxExternalLinks?: number;
  includeClusterLinks?: boolean;
  
  // Publishing options
  targetPlatform?: 'webflow' | 'wordpress' | 'shopify';
  collectionId?: string;
  isDraft?: boolean;
  
  // Organization context
  orgId: string;
  webflowApiKey?: string;
  webflowSiteId?: string;
}

/**
 * Multi-Phase Workflow Orchestrator
 */
export class MultiPhaseWorkflow {
  private state: WorkflowState;
  private config: WorkflowConfig;
  private onStateChange?: (state: WorkflowState) => void;

  constructor(config: WorkflowConfig, onStateChange?: (state: WorkflowState) => void) {
    this.config = config;
    this.onStateChange = onStateChange;
    this.state = {
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      phase: 'idle',
      progress: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get current workflow state
   */
  getState(): WorkflowState {
    return { ...this.state };
  }

  /**
   * Update workflow state
   */
  private updateState(updates: Partial<WorkflowState>): void {
    this.state = {
      ...this.state,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
    
    logger.debug('Workflow state updated', {
      workflowId: this.state.id,
      phase: this.state.phase,
      progress: this.state.progress,
    });
  }

  /**
   * Execute the full workflow
   */
  async execute(): Promise<WorkflowState> {
    try {
      logger.info('Starting multi-phase workflow', {
        workflowId: this.state.id,
        topic: this.config.topic,
      });

      // Phase 1: Content Generation
      await this.executePhase1();
      
      // Phase 2: Image Generation
      await this.executePhase2();
      
      // Phase 3: Content Enhancement
      await this.executePhase3();
      
      // Phase 4: Advanced Interlinking
      await this.executePhase4();
      
      // Phase 5: Publishing Preparation
      await this.executePhase5();

      this.updateState({
        phase: 'completed',
        progress: 100,
        completedAt: new Date().toISOString(),
      });

      logger.info('Multi-phase workflow completed', {
        workflowId: this.state.id,
        duration: Date.now() - new Date(this.state.startedAt).getTime(),
      });

      return this.getState();
    } catch (error: any) {
      logger.error('Workflow failed', {
        workflowId: this.state.id,
        phase: this.state.phase,
        error: error.message,
      });

      this.updateState({
        phase: 'failed',
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Phase 1: Content Generation
   */
  private async executePhase1(): Promise<void> {
    this.updateState({
      phase: 'content_generation',
      progress: 0,
      contentGeneration: { status: 'processing' },
    });

    try {
      logger.info('Phase 1: Starting content generation', {
        topic: this.config.topic,
        keywords: this.config.keywords,
      });

      // Create async job for content generation
      const jobResult = await blogWriterAPI.createJob({
        topic: this.config.topic,
        keywords: this.config.keywords,
        target_audience: this.config.targetAudience,
        tone: this.config.tone,
        word_count: this.config.wordCount,
        quality_level: this.config.qualityLevel,
        use_enhanced: true,
        use_semantic_keywords: true,
        use_quality_scoring: true,
      });

      if (!jobResult) {
        throw new Error('Failed to create content generation job');
      }

      this.updateState({
        progress: 10,
        contentGeneration: {
          status: 'processing',
          queueId: jobResult.queue_id,
          jobId: jobResult.job_id,
        },
      });

      // Poll for job completion
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max (5 second intervals)
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const status = await blogWriterAPI.pollJobStatus(jobResult.job_id);
        
        if (!status) {
          attempts++;
          continue;
        }

        const progress = 10 + (status.progress_percentage * 0.1); // 10-20% of overall
        this.updateState({ progress });

        if (status.status === 'completed') {
          const result = status.result as Record<string, unknown> | undefined;
          this.updateState({
            progress: 20,
            contentGeneration: {
              status: 'completed',
              queueId: jobResult.queue_id,
              jobId: jobResult.job_id,
              content: result?.content as string,
              title: result?.title as string,
              excerpt: result?.excerpt as string,
              wordCount: result?.word_count as number,
              seoData: result?.seo_data as Record<string, unknown>,
            },
          });
          
          logger.info('Phase 1 completed: Content generated', {
            wordCount: result?.word_count,
          });
          return;
        }

        if (status.status === 'failed') {
          throw new Error(status.error_message || 'Content generation failed');
        }

        attempts++;
      }

      throw new Error('Content generation timed out');
    } catch (error: any) {
      this.updateState({
        contentGeneration: {
          status: 'failed',
          error: error.message,
        },
      });
      throw error;
    }
  }

  /**
   * Phase 2: Image Generation
   */
  private async executePhase2(): Promise<void> {
    if (!this.config.generateFeaturedImage && !this.config.generateContentImages) {
      this.updateState({
        phase: 'image_generation',
        progress: 40,
        imageGeneration: { status: 'completed' },
      });
      return;
    }

    this.updateState({
      phase: 'image_generation',
      progress: 20,
      imageGeneration: { status: 'processing' },
    });

    try {
      logger.info('Phase 2: Starting image generation');

      const imageResults: ImageGenerationResult = { status: 'processing' };

      // Generate featured image
      if (this.config.generateFeaturedImage) {
        const featuredImage = await imageGenerator.generateFeaturedImage(
          this.config.topic,
          this.config.keywords,
          { style: this.config.imageStyle as any }
        );

        if (featuredImage) {
          imageResults.featuredImage = {
            imageId: featuredImage.image_id,
            imageUrl: featuredImage.image_url,
            altText: `Featured image for ${this.config.topic}`,
            width: featuredImage.width,
            height: featuredImage.height,
            format: featuredImage.format,
            placement: 'featured',
          };
        }

        this.updateState({ progress: 30 });
      }

      // Generate thumbnail
      if (this.config.generateFeaturedImage) {
        const thumbnailImage = await imageGenerator.generateFeaturedImage(
          this.config.topic,
          this.config.keywords,
          {
            style: this.config.imageStyle as any,
            aspect_ratio: '1:1',
            width: 400,
            height: 400,
          }
        );

        if (thumbnailImage) {
          imageResults.thumbnailImage = {
            imageId: thumbnailImage.image_id,
            imageUrl: thumbnailImage.image_url,
            altText: `Thumbnail for ${this.config.topic}`,
            width: thumbnailImage.width,
            height: thumbnailImage.height,
            format: thumbnailImage.format,
            placement: 'thumbnail',
          };
        }
      }

      this.updateState({
        progress: 40,
        imageGeneration: {
          ...imageResults,
          status: 'completed',
        },
      });

      logger.info('Phase 2 completed: Images generated', {
        hasFeatured: !!imageResults.featuredImage,
        hasThumbnail: !!imageResults.thumbnailImage,
      });
    } catch (error: any) {
      // Don't fail the workflow for image generation errors
      logger.warn('Image generation failed, continuing workflow', { error: error.message });
      this.updateState({
        progress: 40,
        imageGeneration: {
          status: 'failed',
          error: error.message,
        },
      });
    }
  }

  /**
   * Phase 3: Content Enhancement
   */
  private async executePhase3(): Promise<void> {
    this.updateState({
      phase: 'content_enhancement',
      progress: 40,
      contentEnhancement: { status: 'processing' },
    });

    try {
      logger.info('Phase 3: Starting content enhancement');

      const content = this.state.contentGeneration?.content || '';
      const title = this.state.contentGeneration?.title || this.config.topic;

      // Analyze content
      const analysis = await blogWriterAPI.analyzeContent({
        content,
        topic: this.config.topic,
        keywords: this.config.keywords,
        target_audience: this.config.targetAudience,
      });

      // Generate SEO-optimized fields
      const slug = this.generateSlug(title);
      const seoTitle = this.generateSeoTitle(title, this.config.keywords);
      const metaDescription = this.generateMetaDescription(content, this.config.keywords);

      // Generate structured data if enabled
      let structuredData: Record<string, unknown> | undefined;
      if (this.config.generateStructuredData) {
        structuredData = this.generateStructuredData(title, content, this.config.keywords);
      }

      this.updateState({
        progress: 60,
        contentEnhancement: {
          status: 'completed',
          seoTitle,
          metaDescription,
          slug,
          keywords: this.config.keywords,
          readabilityScore: analysis.readability_score,
          seoScore: analysis.seo_score,
          qualityScore: analysis.quality_score,
          structuredData,
          recommendations: analysis.recommendations,
        },
      });

      logger.info('Phase 3 completed: Content enhanced', {
        seoScore: analysis.seo_score,
        qualityScore: analysis.quality_score,
      });
    } catch (error: any) {
      this.updateState({
        contentEnhancement: {
          status: 'failed',
          error: error.message,
        },
      });
      throw error;
    }
  }

  /**
   * Phase 4: Advanced Interlinking (Hybrid Approach)
   */
  private async executePhase4(): Promise<void> {
    if (!this.config.crawlWebsite || !this.config.webflowApiKey) {
      this.updateState({
        phase: 'interlinking',
        progress: 80,
        interlinking: { status: 'completed', appliedLinks: [] },
      });
      return;
    }

    this.updateState({
      phase: 'interlinking',
      progress: 60,
      interlinking: { status: 'processing' },
    });

    try {
      logger.info('Phase 4: Starting advanced interlinking (Hybrid approach)');

      const content = this.state.contentGeneration?.content || '';
      const title = this.state.contentGeneration?.title || this.config.topic;

      // Step 1: Crawl website (if not recently indexed)
      const crawler = new WebsiteCrawlerService(this.config.webflowApiKey, this.config.webflowSiteId);
      const crawledContent = await crawler.crawlWebsite(this.config.webflowSiteId);

      this.updateState({ progress: 65 });

      // Step 2: Index content
      const indexer = new ContentIndexerService(this.config.orgId);
      const indexedContent = await indexer.indexContent(crawledContent.pages);

      this.updateState({ progress: 70 });

      // Step 3: Analyze clusters
      const clusterAnalyzer = new ClusterAnalyzerService();
      const clusterAnalysis = await clusterAnalyzer.analyzeClusters(indexedContent);

      this.updateState({ progress: 73 });

      // Step 4: Find internal linking opportunities
      const interlinkingEngine = new InterlinkingEngine();
      const interlinkingAnalysis = await interlinkingEngine.analyzeInterlinking(
        {
          content,
          title,
          keywords: this.config.keywords,
          topics: this.extractTopics(content, title),
          maxInternalLinks: this.config.maxInternalLinks,
          maxExternalLinks: this.config.maxExternalLinks,
        },
        indexedContent
      );

      this.updateState({ progress: 76 });

      // Step 5: Find external linking opportunities
      const externalLinkFinder = new ExternalLinkFinderService();
      const externalLinks = await externalLinkFinder.findExternalLinks({
        content,
        title,
        keywords: this.config.keywords,
        topics: this.extractTopics(content, title),
        maxLinks: this.config.maxExternalLinks,
      });

      this.updateState({ progress: 78 });

      // Step 6: Apply links to content
      const appliedLinks = this.applyLinksToContent(
        interlinkingAnalysis.opportunities,
        externalLinks.opportunities
      );

      this.updateState({
        progress: 80,
        interlinking: {
          status: 'completed',
          crawledAt: new Date().toISOString(),
          indexedContentCount: indexedContent.length,
          clusterAnalysis,
          interlinkingAnalysis,
          externalLinks,
          appliedLinks,
        },
      });

      logger.info('Phase 4 completed: Interlinking analysis done', {
        indexedContentCount: indexedContent.length,
        clustersFound: clusterAnalysis.totalClusters,
        internalLinks: interlinkingAnalysis.internalLinks.length,
        externalLinks: externalLinks.opportunities.length,
        appliedLinks: appliedLinks.length,
      });
    } catch (error: any) {
      logger.warn('Interlinking failed, continuing workflow', { error: error.message });
      this.updateState({
        progress: 80,
        interlinking: {
          status: 'failed',
          error: error.message,
        },
      });
    }
  }

  /**
   * Phase 5: Publishing Preparation
   */
  private async executePhase5(): Promise<void> {
    this.updateState({
      phase: 'publishing_preparation',
      progress: 80,
      publishingPreparation: { status: 'processing' },
    });

    try {
      logger.info('Phase 5: Starting publishing preparation');

      // Validate field mapping
      const fieldMappingValidation = this.validateFieldMapping();

      this.updateState({ progress: 85 });

      // Calculate content score
      const contentScore = this.calculateContentScore();

      this.updateState({ progress: 90 });

      // Check publishing readiness
      const publishingReadiness = this.checkPublishingReadiness(
        fieldMappingValidation,
        contentScore
      );

      this.updateState({
        progress: 95,
        publishingPreparation: {
          status: 'completed',
          fieldMappingValidation,
          contentScore,
          publishingReadiness,
        },
      });

      logger.info('Phase 5 completed: Publishing preparation done', {
        isReady: publishingReadiness.isReady,
        overallScore: contentScore.overall,
        issues: publishingReadiness.issues.length,
      });
    } catch (error: any) {
      this.updateState({
        publishingPreparation: {
          status: 'failed',
          error: error.message,
        },
      });
      throw error;
    }
  }

  // ========== Helper Methods ==========

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 60);
  }

  private generateSeoTitle(title: string, keywords: string[]): string {
    const primaryKeyword = keywords[0] || '';
    if (title.toLowerCase().includes(primaryKeyword.toLowerCase())) {
      return title.length > 60 ? title.substring(0, 57) + '...' : title;
    }
    return `${title} | ${primaryKeyword}`.substring(0, 60);
  }

  private generateMetaDescription(content: string, keywords: string[]): string {
    // Extract first paragraph
    const textContent = content.replace(/<[^>]+>/g, ' ').trim();
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    let description = sentences.slice(0, 2).join('. ').trim();
    if (description.length > 160) {
      description = description.substring(0, 157) + '...';
    }
    
    return description || `Learn about ${keywords[0] || 'this topic'} in our comprehensive guide.`;
  }

  private generateStructuredData(title: string, content: string, keywords: string[]): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      keywords: keywords.join(', '),
      articleSection: keywords[0] || 'General',
      inLanguage: 'en',
    };
  }

  private extractTopics(content: string, title: string): string[] {
    const text = `${title} ${content}`.toLowerCase();
    const words = text.split(/\s+/).filter(w => w.length > 3);
    
    // Count word frequency
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      const cleaned = word.replace(/[^a-z0-9]/g, '');
      if (cleaned.length > 3) {
        wordCounts.set(cleaned, (wordCounts.get(cleaned) || 0) + 1);
      }
    }
    
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private applyLinksToContent(
    internalOpportunities: LinkOpportunity[],
    externalOpportunities: any[]
  ): AppliedLink[] {
    const appliedLinks: AppliedLink[] = [];

    // Apply internal links (top 5)
    for (const opp of internalOpportunities.slice(0, 5)) {
      appliedLinks.push({
        anchorText: opp.anchorText,
        url: opp.targetPage.url,
        type: 'internal',
        placement: opp.placement,
        reason: opp.reason,
      });
    }

    // Apply external links (top 3)
    for (const opp of externalOpportunities.slice(0, 3)) {
      appliedLinks.push({
        anchorText: opp.anchorText,
        url: opp.url,
        type: 'external',
        placement: 'body',
        reason: opp.reason,
      });
    }

    return appliedLinks;
  }

  private validateFieldMapping(): FieldMappingValidation {
    const contentGen = this.state.contentGeneration;
    const imageGen = this.state.imageGeneration;
    const enhancement = this.state.contentEnhancement;

    const requiredFields: FieldStatus[] = [
      { name: 'title', value: contentGen?.title, status: contentGen?.title ? 'filled' : 'empty' },
      { name: 'content', value: contentGen?.content, status: contentGen?.content ? 'filled' : 'empty' },
      { name: 'slug', value: enhancement?.slug, status: enhancement?.slug ? 'filled' : 'empty' },
    ];

    const recommendedFields: FieldStatus[] = [
      { name: 'seo_title', value: enhancement?.seoTitle, status: enhancement?.seoTitle ? 'filled' : 'empty' },
      { name: 'meta_description', value: enhancement?.metaDescription, status: enhancement?.metaDescription ? 'filled' : 'empty' },
      { name: 'excerpt', value: contentGen?.excerpt, status: contentGen?.excerpt ? 'filled' : 'empty' },
      { name: 'featured_image', value: imageGen?.featuredImage?.imageUrl, status: imageGen?.featuredImage?.imageUrl ? 'filled' : 'empty' },
    ];

    const optionalFields: FieldStatus[] = [
      { name: 'thumbnail_image', value: imageGen?.thumbnailImage?.imageUrl, status: imageGen?.thumbnailImage?.imageUrl ? 'filled' : 'empty' },
      { name: 'keywords', value: enhancement?.keywords, status: enhancement?.keywords?.length ? 'filled' : 'empty' },
    ];

    const missingRequired = requiredFields.filter(f => f.status === 'empty').map(f => f.name);
    const missingRecommended = recommendedFields.filter(f => f.status === 'empty').map(f => f.name);

    return {
      isValid: missingRequired.length === 0,
      requiredFields,
      recommendedFields,
      optionalFields,
      missingRequired,
      missingRecommended,
    };
  }

  private calculateContentScore(): ContentScore {
    const enhancement = this.state.contentEnhancement;
    const interlinking = this.state.interlinking;
    const imageGen = this.state.imageGeneration;

    const readability = enhancement?.readabilityScore || 50;
    const seo = enhancement?.seoScore || 50;
    const quality = enhancement?.qualityScore || 50;
    
    const interlinkingScore = interlinking?.appliedLinks?.length 
      ? Math.min(100, (interlinking.appliedLinks.length / 8) * 100)
      : 0;
    
    const imagesScore = imageGen?.featuredImage ? 100 : 0;

    const overall = Math.round(
      (readability * 0.2) +
      (seo * 0.3) +
      (quality * 0.25) +
      (interlinkingScore * 0.15) +
      (imagesScore * 0.1)
    );

    return {
      overall,
      readability,
      seo,
      quality,
      interlinking: interlinkingScore,
      images: imagesScore,
    };
  }

  private checkPublishingReadiness(
    fieldValidation: FieldMappingValidation,
    contentScore: ContentScore
  ): PublishingReadiness {
    const issues: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check required fields
    if (!fieldValidation.isValid) {
      issues.push(`Missing required fields: ${fieldValidation.missingRequired.join(', ')}`);
    }

    // Check recommended fields
    if (fieldValidation.missingRecommended.length > 0) {
      warnings.push(`Missing recommended fields: ${fieldValidation.missingRecommended.join(', ')}`);
    }

    // Check content score
    if (contentScore.overall < 50) {
      warnings.push(`Low content score (${contentScore.overall}). Consider improving content quality.`);
    }

    if (contentScore.seo < 60) {
      suggestions.push('Improve SEO score by adding more keywords and optimizing meta tags.');
    }

    if (contentScore.interlinking < 50) {
      suggestions.push('Add more internal and external links to improve SEO.');
    }

    if (contentScore.images === 0) {
      suggestions.push('Add a featured image for better engagement.');
    }

    return {
      isReady: issues.length === 0,
      issues,
      warnings,
      suggestions,
    };
  }
}

/**
 * Create a new workflow instance
 */
export function createMultiPhaseWorkflow(
  config: WorkflowConfig,
  onStateChange?: (state: WorkflowState) => void
): MultiPhaseWorkflow {
  return new MultiPhaseWorkflow(config, onStateChange);
}

export default MultiPhaseWorkflow;

