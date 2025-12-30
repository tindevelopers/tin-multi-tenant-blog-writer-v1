import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { requireRole, handleApiError } from '@/lib/api-utils';

/**
 * DELETE /api/workflow-instructions/[id]
 * Deletes an instruction set for the current org.
 */

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['admin', 'manager', 'editor', 'system_admin', 'super_admin']);
    const { id } = await params;

    const supabase = await createClient();

    const { error } = await supabase
      .from('workflow_instruction_sets')
      .delete()
      .eq('instruction_set_id', id)
      .eq('org_id', user.org_id);

    if (error) {
      logger.error('Error deleting workflow instruction set', { error, id });
      return NextResponse.json({ error: 'Failed to delete instruction set' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'workflow-instructions-delete',
    });
    return handleApiError(error);
  }
}


