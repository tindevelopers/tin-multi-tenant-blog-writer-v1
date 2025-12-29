/**
 * Workflow Models Module
 * 
 * Extensible workflow system for content generation.
 * Supports multiple workflow models for different content types, platforms, and quality levels.
 * 
 * @example
 * ```typescript
 * import { workflowRegistry, executeWorkflow, WorkflowInput } from '@/lib/workflow-models';
 * 
 * // Initialize registry (call once at app start)
 * await workflowRegistry.initialize();
 * 
 * // Select model based on parameters
 * const model = workflowRegistry.selectModel({
 *   qualityLevel: 'premium',
 *   contentType: 'comparison',
 * });
 * 
 * // Execute workflow
 * const result = await executeWorkflow(model, {
 *   topic: 'Best AI Writing Tools',
 *   keywords: ['ai writing', 'content generation'],
 *   targetAudience: 'Content marketers',
 *   tone: 'professional',
 *   wordCount: 2000,
 * });
 * 
 * console.log(result.content);
 * ```
 */

// Core types
export type {
  LLMModel,
  WorkflowPhase,
  PostProcessingStep,
  LinkDistributionRules,
  StructureRules,
  ContentRules,
  WorkflowRules,
  WorkflowModel,
  WorkflowState,
  WorkflowInput,
  WorkflowResult,
  ProgressCallback,
} from './types';

// Workflow registry
export { 
  workflowRegistry,
  type WorkflowRegistry,
  type WorkflowSelectionParams,
} from './registry';

// Workflow engine
export { 
  WorkflowEngine,
  executeWorkflow,
  type WorkflowEngineConfig,
} from './engine';

// LLM service
export { 
  LLMService,
  llmService,
  type LLMCallOptions,
  type LLMResponse,
} from './llm-service';

// Built-in models (for direct access if needed)
export { standardWorkflowModel } from './models/standard';
export { premiumWorkflowModel } from './models/premium';
export { comparisonWorkflowModel } from './models/comparison';

