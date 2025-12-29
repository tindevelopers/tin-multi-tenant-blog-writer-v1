/**
 * Workflow Registry
 * 
 * Manages workflow model registration and selection.
 * Selects appropriate workflow based on quality level, content type, and platform.
 */

import { WorkflowModel } from './types';
import { logger } from '@/utils/logger';

/**
 * Parameters for selecting a workflow model
 */
export interface WorkflowSelectionParams {
  /** Quality level (low, medium, high, premium, enterprise) */
  qualityLevel: string;
  /** Content type (comparison, review, product, etc.) */
  contentType?: string;
  /** Target platform (webflow, wordpress, etc.) */
  platform?: string;
  /** Explicit model ID to use (overrides selection) */
  modelId?: string;
}

/**
 * Workflow Registry
 * Singleton that manages workflow model registration and selection
 */
class WorkflowRegistryClass {
  private models: Map<string, WorkflowModel> = new Map();
  private defaultModelId: string = 'standard';
  private initialized: boolean = false;

  /**
   * Initialize the registry with built-in models
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.debug('Initializing workflow registry');

    try {
      // Dynamically import built-in models to avoid circular dependencies
      const [
        { standardWorkflowModel },
        { premiumWorkflowModel },
        { comparisonWorkflowModel },
      ] = await Promise.all([
        import('./models/standard'),
        import('./models/premium'),
        import('./models/comparison'),
      ]);

      // Register built-in models
      this.register(standardWorkflowModel);
      this.register(premiumWorkflowModel);
      this.register(comparisonWorkflowModel);

      this.initialized = true;
      logger.info('Workflow registry initialized', {
        modelCount: this.models.size,
        models: Array.from(this.models.keys()),
      });
    } catch (error) {
      logger.error('Failed to initialize workflow registry', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Register a workflow model
   */
  register(model: WorkflowModel): void {
    if (this.models.has(model.id)) {
      logger.warn(`Overwriting existing workflow model: ${model.id}`);
    }

    // Validate model structure
    if (!model.id || !model.phases || model.phases.length === 0) {
      throw new Error(`Invalid workflow model: ${model.id || 'unknown'} - must have id and phases`);
    }

    this.models.set(model.id, model);
    logger.debug(`Registered workflow model: ${model.id}`, {
      name: model.name,
      phases: model.phases.length,
      qualityLevels: model.qualityLevels,
    });
  }

  /**
   * Unregister a workflow model
   */
  unregister(modelId: string): boolean {
    if (modelId === this.defaultModelId) {
      logger.warn('Cannot unregister default model');
      return false;
    }
    return this.models.delete(modelId);
  }

  /**
   * Get a workflow model by ID
   */
  get(modelId: string): WorkflowModel | undefined {
    return this.models.get(modelId);
  }

  /**
   * Get all registered models
   */
  getAll(): WorkflowModel[] {
    return Array.from(this.models.values());
  }

  /**
   * Get model IDs
   */
  getModelIds(): string[] {
    return Array.from(this.models.keys());
  }

  /**
   * Check if a model is registered
   */
  has(modelId: string): boolean {
    return this.models.has(modelId);
  }

  /**
   * Select appropriate model based on parameters
   * 
   * Selection priority:
   * 1. Explicit modelId if provided
   * 2. Content type match (e.g., 'comparison' → comparison model)
   * 3. Quality level match (e.g., 'premium' → premium model)
   * 4. Platform match (e.g., 'webflow' for webflow-specific models)
   * 5. Default model (standard)
   */
  selectModel(params: WorkflowSelectionParams): WorkflowModel {
    const { qualityLevel, contentType, platform, modelId } = params;

    logger.debug('Selecting workflow model', params);

    // 1. Explicit model ID takes precedence
    if (modelId && this.models.has(modelId)) {
      const model = this.models.get(modelId)!;
      logger.debug(`Selected explicit model: ${model.id}`);
      return model;
    }

    // 2. Check for content type match first (most specific)
    if (contentType) {
      for (const model of this.models.values()) {
        if (model.contentTypes?.includes(contentType.toLowerCase())) {
          // Also verify platform matches if specified
          if (platform && model.platforms && !model.platforms.includes(platform.toLowerCase())) {
            continue;
          }
          logger.debug(`Selected model by content type: ${model.id}`, { contentType });
          return model;
        }
      }
    }

    // 3. Check for quality level match
    const normalizedQuality = qualityLevel.toLowerCase();
    for (const model of this.models.values()) {
      if (model.qualityLevels.map(q => q.toLowerCase()).includes(normalizedQuality)) {
        // Also verify platform matches if specified
        if (platform && model.platforms && !model.platforms.includes(platform.toLowerCase())) {
          continue;
        }
        logger.debug(`Selected model by quality level: ${model.id}`, { qualityLevel });
        return model;
      }
    }

    // 4. Check for platform-specific default
    if (platform) {
      for (const model of this.models.values()) {
        if (model.platforms?.includes(platform.toLowerCase())) {
          logger.debug(`Selected model by platform: ${model.id}`, { platform });
          return model;
        }
      }
    }

    // 5. Fall back to default model
    const defaultModel = this.models.get(this.defaultModelId);
    if (defaultModel) {
      logger.debug(`Selected default model: ${defaultModel.id}`);
      return defaultModel;
    }

    // If somehow no default exists, return first available
    const firstModel = this.models.values().next().value;
    if (firstModel) {
      logger.warn('No default model found, using first available', { 
        modelId: firstModel.id 
      });
      return firstModel;
    }

    throw new Error('No workflow models registered');
  }

  /**
   * Set the default model ID
   */
  setDefaultModel(modelId: string): void {
    if (!this.models.has(modelId)) {
      throw new Error(`Cannot set default: model ${modelId} not registered`);
    }
    this.defaultModelId = modelId;
    logger.debug(`Default model set to: ${modelId}`);
  }

  /**
   * Get the default model
   */
  getDefaultModel(): WorkflowModel | undefined {
    return this.models.get(this.defaultModelId);
  }

  /**
   * Get models that match a quality level
   */
  getModelsByQualityLevel(qualityLevel: string): WorkflowModel[] {
    const normalized = qualityLevel.toLowerCase();
    return Array.from(this.models.values()).filter(
      model => model.qualityLevels.map(q => q.toLowerCase()).includes(normalized)
    );
  }

  /**
   * Get models that match a content type
   */
  getModelsByContentType(contentType: string): WorkflowModel[] {
    const normalized = contentType.toLowerCase();
    return Array.from(this.models.values()).filter(
      model => model.contentTypes?.map(t => t.toLowerCase()).includes(normalized)
    );
  }

  /**
   * Clear all models (useful for testing)
   */
  clear(): void {
    this.models.clear();
    this.initialized = false;
    logger.debug('Workflow registry cleared');
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalModels: number;
    modelIds: string[];
    defaultModel: string;
    initialized: boolean;
  } {
    return {
      totalModels: this.models.size,
      modelIds: Array.from(this.models.keys()),
      defaultModel: this.defaultModelId,
      initialized: this.initialized,
    };
  }
}

// Singleton instance
export const workflowRegistry = new WorkflowRegistryClass();

// Export type for registry
export type WorkflowRegistry = typeof workflowRegistry;

