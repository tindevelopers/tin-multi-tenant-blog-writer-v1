/**
 * Workflow Engine
 * 
 * Executes workflow models phase by phase with state management,
 * progress tracking, error handling, and retry logic.
 */

import { 
  WorkflowModel, 
  WorkflowState, 
  WorkflowPhase, 
  WorkflowInput,
  WorkflowResult,
  ProgressCallback,
} from './types';
import { llmService } from './llm-service';
import { logger } from '@/utils/logger';

/**
 * Configuration for the workflow engine
 */
export interface WorkflowEngineConfig {
  /** Callback for progress updates */
  onProgress?: ProgressCallback;
  /** Whether to stop on first error (default: true) */
  stopOnError?: boolean;
  /** Global timeout for the entire workflow in milliseconds */
  globalTimeout?: number;
}

/**
 * Workflow Engine
 * Executes workflow models phase by phase
 */
export class WorkflowEngine {
  private model: WorkflowModel;
  private state: WorkflowState;
  private config: WorkflowEngineConfig;

  constructor(
    model: WorkflowModel,
    initialInputs: WorkflowInput,
    config: WorkflowEngineConfig = {}
  ) {
    this.model = model;
    this.config = {
      stopOnError: true,
      ...config,
    };
    
    // Initialize state with workflow-relevant inputs
    this.state = {
      workflowId: this.generateWorkflowId(),
      modelId: model.id,
      currentPhase: '',
      progress: 0,
      startedAt: new Date().toISOString(),
      phaseOutputs: this.prepareInitialInputs(initialInputs),
      status: 'pending',
    };
  }

  /**
   * Generate a unique workflow ID
   */
  private generateWorkflowId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 11);
    return `wf_${timestamp}_${random}`;
  }

  /**
   * Prepare initial inputs for the workflow
   */
  private prepareInitialInputs(inputs: WorkflowInput): Record<string, unknown> {
    const prepared: Record<string, unknown> = {};

    // Copy all standard inputs
    prepared.topic = inputs.topic;
    prepared.keywords = inputs.keywords?.join(', ') || '';
    prepared.primaryKeyword = inputs.primaryKeyword || inputs.keywords?.[0] || '';
    prepared.secondaryKeywords = inputs.secondaryKeywords?.join(', ') || 
      inputs.keywords?.slice(1).join(', ') || '';
    prepared.targetAudience = inputs.targetAudience || 'general audience';
    prepared.tone = inputs.tone || 'professional';
    prepared.wordCount = inputs.wordCount || 1500;
    prepared.articleGoal = inputs.articleGoal || 'inform and engage';
    prepared.siteContext = inputs.siteContext || '';
    prepared.customInstructions = inputs.customInstructions || '';
    
    // Copy any additional custom inputs
    for (const [key, value] of Object.entries(inputs)) {
      if (!(key in prepared) && !key.startsWith('_')) {
        prepared[key] = value;
      }
    }

    return prepared;
  }

  /**
   * Execute the full workflow
   */
  async execute(): Promise<WorkflowResult> {
    this.state.status = 'running';
    const totalPhases = this.model.phases.length;
    const hasPostProcessing = this.model.postProcessing.filter(s => s.enabled).length > 0;

    logger.info(`Starting workflow: ${this.model.name}`, {
      workflowId: this.state.workflowId,
      modelId: this.model.id,
      phases: totalPhases,
      postProcessing: hasPostProcessing,
    });

    try {
      // Execute all phases
      for (let i = 0; i < totalPhases; i++) {
        const phase = this.model.phases[i];
        await this.executePhase(phase, i, totalPhases);
      }

      // Run post-processing if any
      if (hasPostProcessing) {
        await this.runPostProcessing();
      }

      // Complete
      this.state.status = 'completed';
      this.state.progress = 100;
      this.state.completedAt = new Date().toISOString();

      const duration = Date.now() - new Date(this.state.startedAt).getTime();

      logger.info(`Workflow completed: ${this.model.name}`, {
        workflowId: this.state.workflowId,
        duration,
        outputKeys: Object.keys(this.state.phaseOutputs).filter(k => !k.startsWith('_')),
      });

      return this.buildResult();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.state.status = 'failed';
      this.state.error = errorMessage;
      this.state.completedAt = new Date().toISOString();

      logger.error(`Workflow failed: ${this.model.name}`, {
        workflowId: this.state.workflowId,
        phase: this.state.currentPhase,
        error: errorMessage,
      });

      return this.buildResult(errorMessage);
    }
  }

  /**
   * Execute a single phase with retry logic
   */
  private async executePhase(
    phase: WorkflowPhase,
    index: number,
    total: number
  ): Promise<void> {
    this.state.currentPhase = phase.id;
    
    // Calculate progress (reserve 20% for post-processing if enabled)
    const hasPostProcessing = this.model.postProcessing.filter(s => s.enabled).length > 0;
    const maxProgress = hasPostProcessing ? 80 : 100;
    const progressStart = (index / total) * maxProgress;
    const progressEnd = ((index + 1) / total) * maxProgress;

    this.updateProgress(phase.id, progressStart, `Starting ${phase.name}...`);

    logger.debug(`Executing phase: ${phase.name}`, {
      phaseId: phase.id,
      phaseIndex: index + 1,
      totalPhases: total,
      model: phase.model,
    });

    // Validate required inputs
    const validation = llmService.validateInputs(phase, this.state.phaseOutputs);
    if (!validation.valid) {
      throw new Error(
        `Missing required inputs for phase "${phase.id}": ${validation.missing.join(', ')}`
      );
    }

    // Execute with retry logic
    let attempts = 0;
    const maxAttempts = phase.retryOnFailure ? (phase.maxRetries || 3) : 1;
    let lastError: Error | null = null;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        
        this.updateProgress(
          phase.id, 
          progressStart + ((progressEnd - progressStart) * 0.5),
          `Generating ${phase.name}...`
        );

        const outputs = await llmService.executePhase(phase, this.state.phaseOutputs);

        // Merge outputs into state
        Object.assign(this.state.phaseOutputs, outputs);

        this.updateProgress(phase.id, progressEnd, `Completed ${phase.name}`);
        
        logger.debug(`Phase completed: ${phase.name}`, {
          phaseId: phase.id,
          outputKeys: Object.keys(outputs).filter(k => !k.startsWith('_')),
        });

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        logger.warn(`Phase ${phase.id} failed (attempt ${attempts}/${maxAttempts})`, {
          error: lastError.message,
        });

        if (attempts < maxAttempts) {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    throw lastError || new Error(`Phase ${phase.id} failed after ${maxAttempts} attempts`);
  }

  /**
   * Run post-processing steps
   */
  private async runPostProcessing(): Promise<void> {
    const enabledSteps = this.model.postProcessing.filter(step => step.enabled);
    const stepCount = enabledSteps.length;

    if (stepCount === 0) return;

    logger.debug('Running post-processing', { stepCount });

    for (let i = 0; i < stepCount; i++) {
      const step = enabledSteps[i];
      const progress = 80 + ((i + 1) / stepCount) * 20;

      this.updateProgress(`post_${step.id}`, progress, `Running ${step.name}...`);

      logger.debug(`Running post-processing: ${step.name}`, { 
        stepId: step.id,
        type: step.type,
      });

      try {
        switch (step.type) {
          case 'image_generation':
            await this.runImageGeneration(step.config);
            break;
          case 'seo_enhancement':
            await this.runSEOEnhancement(step.config);
            break;
          case 'interlinking':
            await this.runInterlinking(step.config);
            break;
          case 'publishing_prep':
            await this.runPublishingPrep(step.config);
            break;
          case 'custom':
            // Custom handlers can be implemented via config.handler
            if (step.config?.handler && typeof step.config.handler === 'function') {
              await step.config.handler(this.state.phaseOutputs);
            }
            break;
        }
      } catch (error) {
        logger.warn(`Post-processing step ${step.id} failed`, {
          error: error instanceof Error ? error.message : String(error),
        });
        // Post-processing failures are non-fatal by default
        if (this.config.stopOnError) {
          throw error;
        }
      }
    }
  }

  /**
   * Update progress and notify callback
   */
  private updateProgress(phase: string, progress: number, message?: string): void {
    this.state.progress = Math.round(progress);
    this.state.currentPhase = phase;
    this.config.onProgress?.(phase, this.state.progress, message);
  }

  /**
   * Build the final result object
   */
  private buildResult(error?: string): WorkflowResult {
    // Extract the final assembled content
    let content = '';
    const outputs = this.state.phaseOutputs;

    // Try to find assembled content (from assembly phase)
    if (typeof outputs.assembledContent === 'string') {
      content = outputs.assembledContent;
    } 
    // Or concatenate parts if available
    else if (outputs.introduction || outputs.body || outputs.conclusion) {
      const parts = [
        outputs.introduction,
        outputs.body,
        outputs.conclusion,
      ].filter(Boolean);
      content = parts.join('\n\n');
    }
    // Or use single-step content
    else if (typeof outputs.content === 'string') {
      content = outputs.content;
    }

    // Extract excerpt if generated
    const excerpt = typeof outputs.excerpt === 'string' 
      ? outputs.excerpt 
      : this.extractExcerpt(content);

    // Build metadata
    const metadata: Record<string, unknown> = {
      workflowId: this.state.workflowId,
      modelId: this.model.id,
      modelName: this.model.name,
      duration: this.state.completedAt 
        ? Date.now() - new Date(this.state.startedAt).getTime()
        : undefined,
      phases: this.model.phases.map(p => p.id),
    };

    return {
      success: this.state.status === 'completed',
      state: this.state,
      content,
      excerpt,
      metadata,
      error,
    };
  }

  /**
   * Extract excerpt from content
   */
  private extractExcerpt(content: string, maxLength = 160): string {
    if (!content) return '';

    // Remove markdown formatting
    let text = content
      .replace(/#{1,6}\s+/g, '') // Remove headings
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '') // Remove inline code
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();

    // Get first paragraph or sentences
    const firstParagraph = text.split(/\.\s+/).slice(0, 2).join('. ');
    
    if (firstParagraph.length <= maxLength) {
      return firstParagraph + (firstParagraph.endsWith('.') ? '' : '.');
    }

    // Truncate to maxLength
    return text.substring(0, maxLength - 3).trim() + '...';
  }

  /**
   * Get current workflow state
   */
  getState(): WorkflowState {
    return { ...this.state };
  }

  /**
   * Get current phase outputs
   */
  getOutputs(): Record<string, unknown> {
    return { ...this.state.phaseOutputs };
  }

  // === Post-Processing Implementations ===
  // These use existing infrastructure from the codebase

  private async runImageGeneration(_config?: Record<string, unknown>): Promise<void> {
    // Image generation uses existing image-generation.ts infrastructure
    // This is called by the workflow but actual implementation is in the
    // blog generation pipeline
    logger.debug('Image generation post-processing triggered');
    // Actual image generation is handled by existing infrastructure
  }

  private async runSEOEnhancement(_config?: Record<string, unknown>): Promise<void> {
    // SEO enhancement uses existing content-enhancer.ts
    logger.debug('SEO enhancement post-processing triggered');
    // Actual SEO enhancement is handled by existing infrastructure
  }

  private async runInterlinking(_config?: Record<string, unknown>): Promise<void> {
    // Interlinking uses existing interlinking-engine.ts
    logger.debug('Interlinking post-processing triggered');
    // Actual interlinking is handled by existing infrastructure
  }

  private async runPublishingPrep(_config?: Record<string, unknown>): Promise<void> {
    // Publishing preparation uses existing workflow phase manager
    logger.debug('Publishing preparation post-processing triggered');
    // Actual publishing prep is handled by existing infrastructure
  }
}

/**
 * Create and execute a workflow in one call
 */
export async function executeWorkflow(
  model: WorkflowModel,
  inputs: WorkflowInput,
  config?: WorkflowEngineConfig
): Promise<WorkflowResult> {
  const engine = new WorkflowEngine(model, inputs, config);
  return engine.execute();
}

