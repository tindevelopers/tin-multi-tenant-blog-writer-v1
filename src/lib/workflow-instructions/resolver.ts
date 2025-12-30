/**
 * Workflow Instructions Resolver
 *
 * Resolves org-level “dashboard instructions” (stored in Supabase) and merges them
 * with per-request custom instructions to produce effective instructions for any workflow.
 *
 * This module is used by:
 * - /api/blog-writer/generate
 * - /api/workflow/multi-phase
 * - workflow-models execution inputs
 */

import { createServiceClient } from '@/lib/supabase/service';
import { logger } from '@/utils/logger';

export type WorkflowScopeValue = 'all' | 'standard' | 'premium' | 'comparison';
export type PlatformScopeValue = 'any' | 'webflow' | 'wordpress' | 'shopify';
export type ContentTypeScopeValue = 'any' | string;

export interface WorkflowInstructionScope {
  workflow?: WorkflowScopeValue | string;
  platform?: PlatformScopeValue | string;
  content_type?: ContentTypeScopeValue;
}

export interface WorkflowInstructionSetRow {
  instruction_set_id: string;
  org_id: string;
  enabled: boolean;
  scope: WorkflowInstructionScope;
  system_prompt: string | null;
  instructions: string;
  priority: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResolveInstructionsParams {
  orgId: string;
  workflowModelId?: string; // e.g. standard|premium|comparison
  platform?: string; // webflow|wordpress|...
  contentType?: string; // comparison|review|...
  perRequestInstructions?: string | null; // incoming custom_instructions
  maxLength?: number; // safety limit
}

export interface EffectiveInstructions {
  systemPrompt?: string; // resolved system prompt (optional)
  instructions: string; // merged instructions content (always string, may be empty)
  sources: Array<{
    type: 'org_instruction_set' | 'per_request';
    id?: string;
    priority?: number;
  }>;
}

const DEFAULT_MAX_LENGTH = 5000;

function normalizeScopeValue(value: string | undefined | null): string {
  return (value || '').trim().toLowerCase();
}

function scopeMatches(
  setScope: WorkflowInstructionScope | null | undefined,
  input: { workflowModelId?: string; platform?: string; contentType?: string }
): boolean {
  const workflowNeedle = normalizeScopeValue(input.workflowModelId || 'all');
  const platformNeedle = normalizeScopeValue(input.platform || 'any');
  const contentTypeNeedle = normalizeScopeValue(input.contentType || 'any');

  const workflowHay = normalizeScopeValue(setScope?.workflow || 'all');
  const platformHay = normalizeScopeValue(setScope?.platform || 'any');
  const contentHay = normalizeScopeValue(setScope?.content_type || 'any');

  const workflowOk = workflowHay === 'all' || workflowHay === workflowNeedle;
  const platformOk = platformHay === 'any' || platformHay === platformNeedle;
  const contentOk = contentHay === 'any' || contentHay === contentTypeNeedle;

  return workflowOk && platformOk && contentOk;
}

/**
 * Basic guardrails to reduce prompt-injection / instruction-smuggling.
 * NOTE: This does not “secure” LLMs, but it prevents accidental garbage and common artifacts.
 */
function stripDangerousPatterns(text: string): string {
  let cleaned = text;

  // Remove common “ignore previous instructions” style content
  cleaned = cleaned.replace(/ignore\s+(all|any|previous)\s+instructions/gi, '');
  cleaned = cleaned.replace(/system\s+prompt/gi, ''); // avoid trying to override system via user field

  // Remove XML-ish tags that commonly appear as artifacts
  cleaned = cleaned.replace(/<\/?thinking[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/?analysis[^>]*>/gi, '');

  // Collapse excessive whitespace
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

  return cleaned.trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength);
}

/**
 * Resolve effective instructions for an org and request context.
 */
export async function resolveEffectiveInstructions(
  params: ResolveInstructionsParams
): Promise<EffectiveInstructions> {
  const {
    orgId,
    workflowModelId,
    platform,
    contentType,
    perRequestInstructions,
    maxLength = DEFAULT_MAX_LENGTH,
  } = params;

  const supabase = createServiceClient();

  // Load enabled instruction sets for org, order by priority desc
  const { data, error } = await supabase
    .from('workflow_instruction_sets')
    .select('*')
    .eq('org_id', orgId)
    .eq('enabled', true)
    .order('priority', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) {
    logger.warn('Failed to load workflow instruction sets', {
      orgId,
      error: error.message,
    });
  }

  const sets = (data || []) as WorkflowInstructionSetRow[];

  const matched = sets.find((s) =>
    scopeMatches(s.scope, { workflowModelId, platform, contentType })
  );

  const sources: EffectiveInstructions['sources'] = [];

  let systemPrompt: string | undefined;
  let instructionsParts: string[] = [];

  if (matched) {
    if (matched.system_prompt) {
      systemPrompt = stripDangerousPatterns(matched.system_prompt);
    }
    instructionsParts.push(stripDangerousPatterns(matched.instructions || ''));
    sources.push({
      type: 'org_instruction_set',
      id: matched.instruction_set_id,
      priority: matched.priority,
    });
  }

  if (perRequestInstructions && perRequestInstructions.trim().length > 0) {
    instructionsParts.push(stripDangerousPatterns(perRequestInstructions));
    sources.push({ type: 'per_request' });
  }

  const mergedInstructions = truncate(
    instructionsParts.filter(Boolean).join('\n\n'),
    maxLength
  );

  logger.debug('Resolved effective workflow instructions', {
    orgId,
    workflowModelId,
    platform,
    contentType,
    matchedInstructionSetId: matched?.instruction_set_id,
    mergedLength: mergedInstructions.length,
    hasSystemPrompt: !!systemPrompt,
  });

  return {
    systemPrompt,
    instructions: mergedInstructions,
    sources,
  };
}


