'use client';

/**
 * useMultiPhaseWorkflow Hook
 * 
 * Manages the 5-phase blog creation workflow state and API interactions
 */

import { useState, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';

export interface WorkflowConfig {
  // Content Generation
  topic: string;
  keywords: string[];
  targetAudience?: string;
  tone?: string;
  wordCount?: number;
  qualityLevel?: string;
  customInstructions?: string;
  templateType?: string;

  // Image Generation
  generateFeaturedImage?: boolean;
  generateContentImages?: boolean;
  imageStyle?: string;

  // Content Enhancement
  optimizeForSeo?: boolean;
  generateStructuredData?: boolean;
  insertHyperlinks?: boolean; // Enable internal link insertion during enhancement
  deepInterlinking?: boolean; // Phase 2: Enable lazy-loading for deeper analysis

  // Interlinking
  crawlWebsite?: boolean;
  maxInternalLinks?: number;
  maxExternalLinks?: number;
  includeClusterLinks?: boolean;
  webflowSiteId?: string;
  webflowApiKey?: string;

  // Publishing
  targetPlatform?: 'webflow' | 'wordpress' | 'shopify';
  isDraft?: boolean;
  
  // Organization context
  orgId?: string; // Organization ID for Webflow integration lookup
}

export interface WorkflowPhaseResult {
  status: 'pending' | 'running' | 'completed' | 'failed';
  data?: Record<string, any>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ContentResult extends WorkflowPhaseResult {
  title?: string;
  content?: string;
  excerpt?: string;
  wordCount?: number;
  seoData?: Record<string, any>;
}

export interface ImageResult extends WorkflowPhaseResult {
  featuredImage?: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  };
  contentImages?: Array<{
    url: string;
    alt: string;
  }>;
}

export interface EnhancementResult extends WorkflowPhaseResult {
  enhancedFields?: Record<string, any>;
  seoScore?: number;
  readabilityScore?: number;
}

export interface InterlinkingResult extends WorkflowPhaseResult {
  internalLinks?: Array<{
    url: string;
    anchorText: string;
    relevanceScore: number;
  }>;
  externalLinks?: Array<{
    url: string;
    anchorText: string;
    authorityScore: number;
  }>;
  clusterAnalysis?: {
    clusters: Array<{
      name: string;
      pillarContent?: string;
      supportingCount: number;
    }>;
    recommendations: string[];
  };
}

export interface PublishingResult extends WorkflowPhaseResult {
  postId?: string;
  publishingRecordId?: string;
  contentScore?: {
    overall: number;
    seo: number;
    quality: number;
    interlinking: number;
    images: number;
  };
  publishingReadiness?: {
    isReady: boolean;
    warnings: string[];
    missingFields: string[];
  };
}

export type WorkflowPhase = 'idle' | 'content_generation' | 'image_generation' | 'content_enhancement' | 'interlinking' | 'publishing_preparation' | 'completed' | 'failed';

export interface WorkflowState {
  id: string;
  phase: WorkflowPhase;
  progress: number;
  startedAt: string;
  updatedAt: string;
  config: WorkflowConfig;
  contentResult?: ContentResult;
  imageResult?: ImageResult;
  enhancementResult?: EnhancementResult;
  interlinkingResult?: InterlinkingResult;
  publishingResult?: PublishingResult;
  error?: string;
}

const PHASE_PROGRESS = {
  idle: 0,
  content_generation: 10,
  image_generation: 30,
  content_enhancement: 50,
  interlinking: 70,
  publishing_preparation: 90,
  completed: 100,
  failed: 0,
};

const PHASE_LABELS = {
  idle: 'Ready to start',
  content_generation: 'Generating content...',
  image_generation: 'Creating images...',
  content_enhancement: 'Enhancing content...',
  interlinking: 'Analyzing interlinking...',
  publishing_preparation: 'Preparing for publishing...',
  completed: 'Workflow complete',
  failed: 'Workflow failed',
};

export function useMultiPhaseWorkflow() {
  const [state, setState] = useState<WorkflowState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Start the workflow (now always async via Cloud Tasks queue)
  const startWorkflow = useCallback(async (config: WorkflowConfig) => {
    if (!config.topic) {
      setError('Topic is required');
      return;
    }

    setIsRunning(true);
    setError(null);
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Initialize state
    const workflowId = `workflow_${Date.now()}`;
    const initialState: WorkflowState = {
      id: workflowId,
      phase: 'content_generation',
      progress: 10,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config,
    };
    setState(initialState);

    try {
      // Call the async multi-phase endpoint (always uses Cloud Tasks queue)
      logger.info('🚀 Starting multi-phase workflow via async endpoint');
      const response = await fetch('/api/workflow/multi-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: config.topic,
          keywords: config.keywords,
          targetAudience: config.targetAudience,
          tone: config.tone,
          wordCount: config.wordCount,
          qualityLevel: config.qualityLevel,
          customInstructions: config.customInstructions,
          generateFeaturedImage: config.generateFeaturedImage,
          generateContentImages: config.generateContentImages,
          imageStyle: config.imageStyle,
          optimizeForSeo: config.optimizeForSeo,
          generateStructuredData: config.generateStructuredData,
          crawlWebsite: config.crawlWebsite,
          maxInternalLinks: config.maxInternalLinks,
          maxExternalLinks: config.maxExternalLinks,
          includeClusterLinks: config.includeClusterLinks,
          targetPlatform: config.targetPlatform,
          isDraft: config.isDraft,
        }),
        signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to start workflow');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || result.message || 'Workflow start failed');
      }

      // Workflow is now queued - update state with queue info
      logger.info('✅ Multi-phase workflow queued', {
        queue_id: result.queue_id,
        job_id: result.job_id,
      });

      setState(prev => prev ? {
        ...prev,
        phase: 'content_generation',
        progress: 10,
        updatedAt: new Date().toISOString(),
        contentResult: {
          status: 'running',
          queueId: result.queue_id,
          jobId: result.job_id,
        },
      } : null);

      // Start polling for status updates
      const queueId = result.queue_id;
      const pollInterval = setInterval(async () => {
        if (signal.aborted) {
          clearInterval(pollInterval);
          return;
        }

        try {
          const statusResponse = await fetch(`/api/workflow/multi-phase?queue_id=${queueId}`, {
            signal,
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            const queueStatus = statusData.status;

            // Update progress based on queue status
            let phase: WorkflowPhase = 'content_generation';
            let progress = 10;

            if (queueStatus === 'generated' || queueStatus === 'completed') {
              phase = 'completed';
              progress = 100;
            } else if (queueStatus === 'generating') {
              phase = 'content_generation';
              progress = 30;
            } else if (queueStatus === 'failed') {
              phase = 'failed';
              progress = 0;
            }

            setState(prev => prev ? {
              ...prev,
              phase,
              progress,
              updatedAt: new Date().toISOString(),
              error: statusData.generation_error || prev.error,
            } : null);

            // Stop polling if workflow is complete or failed
            if (queueStatus === 'generated' || queueStatus === 'completed' || queueStatus === 'failed') {
              clearInterval(pollInterval);
              setIsRunning(false);
            }
          }
        } catch (pollError) {
          if (!signal.aborted) {
            logger.warn('Polling error', { error: pollError });
          }
        }
      }, 3000); // Poll every 3 seconds

      // Clean up polling on abort
      signal.addEventListener('abort', () => {
        clearInterval(pollInterval);
      });

      return; // Exit early - workflow is async and will be polled for status

    } catch (err: any) {
      const errorMessage = err.message || 'Workflow failed';
      logger.error('Multi-phase workflow failed', { error: errorMessage });
      
      if (errorMessage !== 'Workflow cancelled') {
        setError(errorMessage);
      }
      
      setState(prev => prev ? {
        ...prev,
        phase: 'failed',
        progress: 0,
        updatedAt: new Date().toISOString(),
        error: errorMessage,
      } : null);
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, []);

  // Cancel the workflow
  const cancelWorkflow = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Refresh workflow status (for polling if needed)
  const refreshStatus = useCallback(async () => {
    // Currently state is managed client-side
    // This could be extended to poll server-side status
  }, []);

  // Computed values
  const progress = state ? PHASE_PROGRESS[state.phase] : 0;
  const currentPhase = state ? PHASE_LABELS[state.phase] : 'Not started';

  return {
    state,
    isRunning,
    progress,
    currentPhase,
    error,
    startWorkflow,
    cancelWorkflow,
    refreshStatus,
    // Individual phase results
    contentResult: state?.contentResult,
    imageResult: state?.imageResult,
    enhancementResult: state?.enhancementResult,
    interlinkingResult: state?.interlinkingResult,
    publishingResult: state?.publishingResult,
  };
}

// Phase execution functions

async function executePhase1(
  config: WorkflowConfig,
  signal: AbortSignal
): Promise<ContentResult> {
  // Phase 1 now uses site context for intelligent generation
  // - Avoids duplicate topics
  // - Includes relevant internal link targets in generation
  // - Builds content that fits existing cluster structure
  const response = await fetch('/api/workflow/generate-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: config.topic,
      keywords: config.keywords,
      target_audience: config.targetAudience,
      tone: config.tone,
      word_count: config.wordCount,
      quality_level: config.qualityLevel,
      custom_instructions: config.customInstructions,
      template_type: config.templateType,
      org_id: config.orgId, // Pass org_id for site context lookup
      use_site_context: true, // Enable site-aware generation
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Content generation failed');
  }

  const data = await response.json();
  
  return {
    status: 'completed',
    title: data.title,
    content: data.content,
    excerpt: data.excerpt,
    wordCount: data.word_count,
    seoData: data.seo_data,
    data,
  };
}

async function executePhase2(
  config: WorkflowConfig,
  contentResult: ContentResult,
  signal: AbortSignal
): Promise<ImageResult> {
  if (!config.generateFeaturedImage && !config.generateContentImages) {
    return { status: 'completed' };
  }

  const response = await fetch('/api/workflow/generate-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: config.topic,
      keywords: config.keywords,
      title: contentResult.title,
      generate_featured: config.generateFeaturedImage,
      generate_content_images: config.generateContentImages,
      style: config.imageStyle,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Image generation failed');
  }

  const data = await response.json();
  
  return {
    status: 'completed',
    featuredImage: data.featured_image,
    contentImages: data.content_images,
    data,
  };
}

async function executePhase3(
  config: WorkflowConfig,
  contentResult: ContentResult,
  signal: AbortSignal
): Promise<EnhancementResult> {
  if (!config.optimizeForSeo) {
    return { status: 'completed' };
  }

  // Phase 3: Content Enhancement + Internal Linking
  // This phase now handles ALL internal linking via InterlinkingEngine
  // - insertHyperlinks: Enable internal link insertion (uses enhanced-interlinking-service)
  // - deepInterlinking: Fetch full content for top candidates for better matching
  // - maxInternalLinks: Maximum number of internal links to insert
  const response = await fetch('/api/workflow/enhance-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: contentResult.content,
      title: contentResult.title,
      topic: config.topic,
      keywords: config.keywords,
      generate_structured_data: config.generateStructuredData,
      insert_hyperlinks: config.insertHyperlinks ?? true, // Default to enabled
      deep_interlinking: config.deepInterlinking ?? false, // Deep analysis off by default
      max_internal_links: config.maxInternalLinks || 5, // Consolidated from former Phase 4
      org_id: config.orgId, // Organization ID for Webflow integration lookup
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Content enhancement failed');
  }

  const data = await response.json();
  
  return {
    status: 'completed',
    enhancedFields: data.enhanced_fields,
    seoScore: data.seo_score,
    readabilityScore: data.readability_score,
    data,
  };
}

async function executePhase4(
  config: WorkflowConfig,
  contentResult: ContentResult,
  signal: AbortSignal
): Promise<InterlinkingResult> {
  // Phase 4 is now CONSOLIDATED:
  // - Internal linking is handled automatically in Phase 3 via InterlinkingEngine
  // - This phase only runs for EXTERNAL link finding (optional)
  // 
  // The workflow is now:
  // Phase 1: Content Generation (with site context for link targets)
  // Phase 2: Image Generation
  // Phase 3: Enhancement + Internal Linking (via enhanced-interlinking-service)
  // Phase 4 (optional): External link finding only
  
  // Skip if crawlWebsite is not enabled (external links not requested)
  if (!config.crawlWebsite) {
    return { 
      status: 'completed',
      data: { 
        skipped: true, 
        reason: 'External link finding not requested. Internal links handled in Phase 3.' 
      }
    };
  }

  // Only fetch external links - internal links are already handled in Phase 3
  const response = await fetch('/api/workflow/analyze-interlinking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: contentResult.content,
      title: contentResult.title,
      topic: config.topic,
      keywords: config.keywords,
      max_internal_links: 0, // Internal links handled in Phase 3
      max_external_links: config.maxExternalLinks || 3,
      include_cluster_links: false, // Cluster analysis handled in Phase 3
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'External link finding failed');
  }

  const data = await response.json();
  
  return {
    status: 'completed',
    externalLinks: data.external_links, // Only external links from this phase
    data,
  };
}

async function executePhase5(
  config: WorkflowConfig,
  contentResult: ContentResult,
  imageResult: ImageResult,
  enhancementResult: EnhancementResult,
  interlinkingResult: InterlinkingResult,
  signal: AbortSignal
): Promise<PublishingResult> {
  const response = await fetch('/api/workflow/prepare-publishing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: contentResult.content,
      title: contentResult.title,
      excerpt: contentResult.excerpt,
      seo_data: contentResult.seoData,
      enhanced_fields: enhancementResult.enhancedFields,
      featured_image: imageResult.featuredImage,
      internal_links: interlinkingResult.internalLinks,
      external_links: interlinkingResult.externalLinks,
      target_platform: config.targetPlatform,
      is_draft: config.isDraft,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Publishing preparation failed');
  }

  const data = await response.json();
  
  return {
    status: 'completed',
    postId: data.post_id,
    publishingRecordId: data.publishing_record_id,
    contentScore: data.content_score,
    publishingReadiness: data.publishing_readiness,
    data,
  };
}

export default useMultiPhaseWorkflow;
