import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { getAuthenticatedUser, requireRole, parseJsonBody, handleApiError } from '@/lib/api-utils';

/**
 * Workflow Instructions API
 *
 * CRUD for org-level instruction sets that apply to all workflows.
 *
 * GET: list enabled/disabled instruction sets for org
 * POST: create or update an instruction set (by providing instruction_set_id)
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('workflow_instruction_sets')
      .select('*')
      .eq('org_id', user.org_id)
      .order('priority', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      logger.error('Error fetching workflow instruction sets', { error });
      return NextResponse.json({ error: 'Failed to fetch workflow instructions' }, { status: 500 });
    }

    return NextResponse.json({ instruction_sets: data || [] });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'workflow-instructions-get',
    });
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin', 'manager', 'editor', 'system_admin', 'super_admin']);
    const supabase = await createClient();

    const body = await parseJsonBody<{
      instruction_set_id?: string;
      enabled?: boolean;
      scope?: Record<string, unknown>;
      system_prompt?: string | null;
      instructions: string;
      priority?: number;
    }>(request);

    const {
      instruction_set_id,
      enabled = true,
      scope = { workflow: 'all', platform: 'any', content_type: 'any' },
      system_prompt = null,
      instructions,
      priority = 0,
    } = body;

    if (!instructions || typeof instructions !== 'string') {
      return NextResponse.json({ error: 'instructions is required' }, { status: 400 });
    }

    // Update existing
    if (instruction_set_id) {
      const { data, error } = await supabase
        .from('workflow_instruction_sets')
        .update({
          enabled,
          scope,
          system_prompt,
          instructions,
          priority,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('instruction_set_id', instruction_set_id)
        .eq('org_id', user.org_id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating workflow instruction set', { error });
        return NextResponse.json({ error: 'Failed to update workflow instruction set' }, { status: 500 });
      }

      return NextResponse.json({ instruction_set: data });
    }

    // Create new
    const { data, error } = await supabase
      .from('workflow_instruction_sets')
      .insert({
        org_id: user.org_id,
        enabled,
        scope,
        system_prompt,
        instructions,
        priority,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating workflow instruction set', { error });
      return NextResponse.json({ error: 'Failed to create workflow instruction set' }, { status: 500 });
    }

    return NextResponse.json({ instruction_set: data });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'workflow-instructions-post',
    });
    return handleApiError(error);
  }
}


