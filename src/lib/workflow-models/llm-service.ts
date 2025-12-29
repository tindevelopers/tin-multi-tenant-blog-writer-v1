/**
 * LLM Service Layer
 * 
 * Handles all LLM calls for workflow phases through the backend API.
 * Uses the existing Blog Writer API which connects to LiteLLM backend.
 */

import { LLMModel, WorkflowPhase } from './types';
import { logger } from '@/utils/logger';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

/**
 * Options for making an LLM call
 */
export interface LLMCallOptions {
  /** Which model to use */
  model: LLMModel;
  /** System prompt (instructions for the model) */
  systemPrompt?: string;
  /** User prompt (the actual request) */
  userPrompt: string;
  /** Temperature for generation (0-1, higher = more creative) */
  temperature: number;
  /** Maximum tokens to generate */
  maxTokens: number;
  /** Organization ID for cost tracking */
  orgId?: string;
  /** User ID for cost tracking */
  userId?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Response from an LLM call
 */
export interface LLMResponse {
  /** Generated content */
  content: string;
  /** Model used */
  model: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Whether response was cached */
  cached?: boolean;
}

/**
 * LLM Service for workflow phase execution
 */
export class LLMService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BLOG_WRITER_API_URL;
  }

  /**
   * Make an LLM call using the configured model
   */
  async generate(options: LLMCallOptions): Promise<LLMResponse> {
    const { 
      model, 
      systemPrompt, 
      userPrompt, 
      temperature, 
      maxTokens,
      timeout = 60000 
    } = options;

    logger.debug('LLM Service: Generating content', {
      model,
      promptLength: userPrompt.length,
      systemPromptLength: systemPrompt?.length || 0,
      temperature,
      maxTokens,
    });

    const startTime = Date.now();

    try {
      // First try the local API route (which proxies to backend)
      const response = await fetch('/api/llm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        // If local route doesn't exist, fall back to backend API directly
        if (response.status === 404) {
          return this.generateDirect(options);
        }
        
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      logger.debug('LLM Service: Generation complete', {
        model,
        contentLength: data.content?.length || 0,
        duration,
        cached: data.cached,
      });

      return {
        content: data.content || data.text || data.choices?.[0]?.message?.content || '',
        model: data.model || model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        } : undefined,
        cached: data.cached,
      };
    } catch (error) {
      // If fetch to local API fails (e.g., route doesn't exist), try direct
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return this.generateDirect(options);
      }
      
      logger.error('LLM Service: Generation failed', { 
        error: error instanceof Error ? error.message : String(error), 
        model 
      });
      throw error;
    }
  }

  /**
   * Direct call to backend API (fallback)
   */
  private async generateDirect(options: LLMCallOptions): Promise<LLMResponse> {
    const { 
      model, 
      systemPrompt, 
      userPrompt, 
      temperature, 
      maxTokens,
      timeout = 60000 
    } = options;

    logger.debug('LLM Service: Using direct backend API', { model });

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/llm/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Backend LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return {
        content: data.content || data.text || data.choices?.[0]?.message?.content || '',
        model: data.model || model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        } : undefined,
        cached: data.cached,
      };
    } catch (error) {
      logger.error('LLM Service: Direct backend call failed', { 
        error: error instanceof Error ? error.message : String(error), 
        model 
      });
      throw error;
    }
  }

  /**
   * Execute a workflow phase
   * Renders the prompt template with inputs and calls the LLM
   */
  async executePhase(
    phase: WorkflowPhase,
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Render prompt template with inputs
    const userPrompt = this.renderTemplate(phase.promptTemplate, inputs);
    const systemPrompt = phase.systemPrompt 
      ? this.renderTemplate(phase.systemPrompt, inputs)
      : undefined;

    logger.debug('LLM Service: Executing phase', {
      phaseId: phase.id,
      phaseName: phase.name,
      model: phase.model,
      inputKeys: Object.keys(inputs),
    });

    const response = await this.generate({
      model: phase.model,
      systemPrompt,
      userPrompt,
      temperature: phase.temperature,
      maxTokens: phase.maxTokens,
      timeout: phase.timeout,
    });

    // Parse output based on phase configuration
    const outputs: Record<string, unknown> = {};
    
    // If phase outputs multiple values, try to parse as JSON
    if (phase.outputs.length > 1) {
      try {
        // Try to extract JSON from the response
        const jsonMatch = response.content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          for (const outputKey of phase.outputs) {
            outputs[outputKey] = parsed[outputKey] ?? response.content;
          }
        } else {
          // If no JSON, use full content for first output
          outputs[phase.outputs[0]] = response.content;
        }
      } catch {
        // If JSON parsing fails, use full content for first output
        outputs[phase.outputs[0]] = response.content;
      }
    } else if (phase.outputs.length === 1) {
      // Single output - use the content directly
      outputs[phase.outputs[0]] = response.content;
    }

    // Always include raw content for debugging
    outputs._rawResponse = response.content;
    outputs._model = response.model;
    outputs._usage = response.usage;

    return outputs;
  }

  /**
   * Render a template with variables
   * Uses {{variable}} syntax similar to Handlebars
   */
  renderTemplate(
    template: string,
    variables: Record<string, unknown>
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      // Skip internal/debug keys
      if (key.startsWith('_')) continue;

      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      
      // Convert value to string appropriately
      let stringValue: string;
      if (value === null || value === undefined) {
        stringValue = '';
      } else if (typeof value === 'object') {
        stringValue = JSON.stringify(value, null, 2);
      } else {
        stringValue = String(value);
      }
      
      result = result.replace(placeholder, stringValue);
    }

    // Remove any remaining placeholders that weren't filled
    result = result.replace(/\{\{[^}]+\}\}/g, '');

    return result.trim();
  }

  /**
   * Validate that all required inputs are present
   */
  validateInputs(
    phase: WorkflowPhase, 
    inputs: Record<string, unknown>
  ): { valid: boolean; missing: string[] } {
    const missing = phase.requiredInputs.filter(
      input => !(input in inputs) || inputs[input] === null || inputs[input] === undefined
    );

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

// Singleton instance
export const llmService = new LLMService();

