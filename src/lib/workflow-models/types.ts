/**
 * Workflow Model Types
 * 
 * Defines the structure for extensible workflow models that can be used
 * for different content types, platforms, and quality levels.
 */

// LLM model options (via LiteLLM backend)
export type LLMModel = 
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-3-5-sonnet'
  | 'claude-3-opus'
  | 'gemini-pro'
  | string; // Allow custom models

/**
 * Workflow phase definition
 * A single step in the workflow that generates content using an LLM
 */
export interface WorkflowPhase {
  /** Unique identifier for this phase */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this phase does */
  description: string;
  
  // LLM configuration
  /** Which LLM model to use */
  model: LLMModel;
  /** Temperature for generation (0-1) */
  temperature: number;
  /** Maximum tokens to generate */
  maxTokens: number;
  
  // Prompt configuration
  /** User prompt template (uses {{variable}} syntax) */
  promptTemplate: string;
  /** Optional system prompt template */
  systemPrompt?: string;
  
  // Input/output specification
  /** Required input keys that must be present in state */
  requiredInputs: string[];
  /** Output keys that this phase produces */
  outputs: string[];
  
  // Optional configurations
  /** Whether to retry on failure */
  retryOnFailure?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Post-processing step
 * Steps that run after content generation (images, SEO, etc.)
 */
export interface PostProcessingStep {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Type of post-processing */
  type: 'image_generation' | 'seo_enhancement' | 'publishing_prep' | 'interlinking' | 'custom';
  /** Whether this step is enabled */
  enabled: boolean;
  /** Optional configuration for this step */
  config?: Record<string, unknown>;
}

/**
 * Link distribution rules
 */
export interface LinkDistributionRules {
  /** Internal link count range */
  internalLinks: { min: number; max: number };
  /** External link count range */
  externalLinks: { min: number; max: number };
  /** Product link count range (optional) */
  productLinks?: { min: number; max: number };
  /** Maximum links per H2 section */
  maxLinksPerSection: number;
  /** Whether to prevent consecutive paragraphs with links */
  noConsecutiveLinks: boolean;
}

/**
 * Structure rules for content
 */
export interface StructureRules {
  /** Minimum H2 sections */
  minH2Sections: number;
  /** Maximum H2 sections */
  maxH2Sections: number;
  /** Paragraph count per section */
  paragraphsPerSection: { min: number; max: number };
  /** Introduction paragraph count */
  introductionParagraphs: { min: number; max: number };
  /** Conclusion word count range */
  conclusionWordCount: { min: number; max: number };
}

/**
 * Content rules and constraints
 */
export interface ContentRules {
  /** Whether to use absolute URLs for links */
  useAbsoluteUrls: boolean;
  /** Whether to include comparison chart */
  includeComparisonChart: boolean;
  /** Actionable takeaways count range */
  actionableTakeaways: { min: number; max: number };
}

/**
 * Complete workflow rules
 */
export interface WorkflowRules {
  /** Link distribution rules */
  linkDistribution?: LinkDistributionRules;
  /** Structure requirements */
  structure?: StructureRules;
  /** Content constraints */
  content?: ContentRules;
}

/**
 * Complete workflow model definition
 * Defines a reusable workflow that can generate content
 */
export interface WorkflowModel {
  /** Unique identifier for this model */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this workflow produces */
  description: string;
  /** Version string (semver) */
  version: string;
  
  // Trigger conditions
  /** Quality levels that trigger this workflow */
  qualityLevels: string[];
  /** Content types that trigger this workflow (optional) */
  contentTypes?: string[];
  /** Platforms this workflow is specific to (optional) */
  platforms?: string[];
  
  // Workflow definition
  /** Ordered list of phases to execute */
  phases: WorkflowPhase[];
  /** Post-processing steps to run after generation */
  postProcessing: PostProcessingStep[];
  
  // Rules and constraints
  /** Rules for content generation */
  rules: WorkflowRules;
  
  // Metadata
  /** Author of this workflow */
  author?: string;
  /** Creation date (ISO string) */
  createdAt?: string;
  /** Last update date (ISO string) */
  updatedAt?: string;
}

/**
 * Workflow execution state
 * Tracks the state of a running workflow
 */
export interface WorkflowState {
  /** Unique ID for this execution */
  workflowId: string;
  /** ID of the model being executed */
  modelId: string;
  /** Current phase being executed */
  currentPhase: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** When execution started (ISO string) */
  startedAt: string;
  
  // Phase outputs
  /** Accumulated outputs from all phases */
  phaseOutputs: Record<string, unknown>;
  
  // Status
  /** Current status */
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** Error message if failed */
  error?: string;
  /** When execution completed (ISO string) */
  completedAt?: string;
}

/**
 * Input parameters for workflow execution
 */
export interface WorkflowInput {
  /** Topic/title of the content */
  topic: string;
  /** Keywords for SEO */
  keywords: string[];
  /** Primary keyword */
  primaryKeyword?: string;
  /** Secondary keywords */
  secondaryKeywords?: string[];
  /** Target audience description */
  targetAudience?: string;
  /** Writing tone */
  tone?: string;
  /** Target word count */
  wordCount?: number;
  /** Article goal/purpose */
  articleGoal?: string;
  /** Site context for interlinking */
  siteContext?: string;
  /** Organization ID */
  orgId?: string;
  /** User ID */
  userId?: string;
  /** Quality level */
  qualityLevel?: string;
  /** Content type */
  contentType?: string;
  /** Target platform */
  platform?: string;
  /** Custom instructions */
  customInstructions?: string;
  /** Additional custom inputs */
  [key: string]: unknown;
}

/**
 * Result of workflow execution
 */
export interface WorkflowResult {
  /** Whether execution was successful */
  success: boolean;
  /** Final workflow state */
  state: WorkflowState;
  /** Generated content (final assembled content) */
  content?: string;
  /** Generated excerpt */
  excerpt?: string;
  /** Generated metadata */
  metadata?: Record<string, unknown>;
  /** Error if failed */
  error?: string;
}

/**
 * Progress callback type
 */
export type ProgressCallback = (phase: string, progress: number, message?: string) => void;

