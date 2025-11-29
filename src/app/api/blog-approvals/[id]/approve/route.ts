import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApprovalStatus } from "@/lib/blog-queue-state-machine";
import { canTransitionApprovalStatus } from "@/lib/blog-queue-state-machine";
import { logger } from '@/utils/logger';
import { hasPermission } from '@/lib/rbac/permissions';
import { PERMISSIONS } from '@/lib/rbac/types';

/**
 * POST /api/blog-approvals/[id]/approve
 * Approve a blog (convenience endpoint)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("org_id, role")
      .eq("user_id", user.id)
      .single();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check for content.moderate permission (required for approvals)
    const canModerate = await hasPermission(user.id, PERMISSIONS.CONTENT_MODERATE);
    
    // Also check role as fallback (admin, manager, editor can approve)
    const allowedRoles = ["admin", "manager", "editor"];
    const hasRolePermission = allowedRoles.includes(userProfile.role);
    
    if (!canModerate && !hasRolePermission) {
      return NextResponse.json(
        { error: "Insufficient permissions. You need 'content.moderate' permission or be an admin/manager/editor to approve content." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { review_notes } = body;

    // Get current approval
    const { data: currentApproval } = await supabase
      .from("blog_approvals")
      .select("*")
      .eq("approval_id", id)
      .eq("org_id", userProfile.org_id)
      .single();

    if (!currentApproval) {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    }

    if (!canTransitionApprovalStatus(currentApproval.status, "approved")) {
      return NextResponse.json(
        { error: `Invalid status transition: ${currentApproval.status} → approved` },
        { status: 400 }
      );
    }

    // Update approval
    const { data: updatedApproval } = await supabase
      .from("blog_approvals")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("approval_id", id)
      .select(`
        *,
        requested_by_user:users!blog_approvals_requested_by_fkey(user_id, email, full_name),
        reviewed_by_user:users!blog_approvals_reviewed_by_fkey(user_id, email, full_name)
      `)
      .single();

    // Update queue status
    if (currentApproval.queue_id) {
      await supabase
        .from("blog_generation_queue")
        .update({ status: "approved" })
        .eq("queue_id", currentApproval.queue_id);
    }

    return NextResponse.json(updatedApproval);
  } catch (error) {
    logger.error("Error in POST /api/blog-approvals/[id]/approve:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

