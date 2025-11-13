import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApprovalStatus } from "@/lib/blog-queue-state-machine";
import { canTransitionApprovalStatus } from "@/lib/blog-queue-state-machine";

/**
 * GET /api/blog-approvals/[id]
 * Get specific approval details
 */
export async function GET(
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

    // Get user's org_id
    const { data: userProfile } = await supabase
      .from("users")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { data: approval, error } = await supabase
      .from("blog_approvals")
      .select(`
        *,
        requested_by_user:users!blog_approvals_requested_by_fkey(user_id, email, full_name),
        reviewed_by_user:users!blog_approvals_reviewed_by_fkey(user_id, email, full_name),
        queue:blog_generation_queue(queue_id, topic, generated_title, generated_content, status),
        post:blog_posts(post_id, title, content, status)
      `)
      .eq("approval_id", id)
      .eq("org_id", userProfile.org_id)
      .single();

    if (error) {
      console.error("Error fetching approval:", error);
      return NextResponse.json(
        { error: "Approval not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(approval);
  } catch (error) {
    console.error("Error in GET /api/blog-approvals/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/blog-approvals/[id]
 * Update approval status (approve, reject, request changes)
 */
export async function PATCH(
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

    // Get user's org_id and role
    const { data: userProfile } = await supabase
      .from("users")
      .select("org_id, role")
      .eq("user_id", user.id)
      .single();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check if user has permission to review (manager, editor, admin roles)
    const allowedRoles = ["admin", "manager", "editor"];
    if (!allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to review approvals" },
        { status: 403 }
      );
    }

    // Get current approval
    const { data: currentApproval, error: fetchError } = await supabase
      .from("blog_approvals")
      .select("*")
      .eq("approval_id", id)
      .eq("org_id", userProfile.org_id)
      .single();

    if (fetchError || !currentApproval) {
      return NextResponse.json(
        { error: "Approval not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status, review_notes, rejection_reason } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Validate status transition
    if (!canTransitionApprovalStatus(currentApproval.status, status as ApprovalStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition: ${currentApproval.status} → ${status}`,
        },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      status: status as ApprovalStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (review_notes) {
      updateData.review_notes = review_notes;
    }

    if (status === "rejected" && rejection_reason) {
      updateData.rejection_reason = rejection_reason;
    }

    // Update approval
    const { data: updatedApproval, error: updateError } = await supabase
      .from("blog_approvals")
      .update(updateData)
      .eq("approval_id", id)
      .select(`
        *,
        requested_by_user:users!blog_approvals_requested_by_fkey(user_id, email, full_name),
        reviewed_by_user:users!blog_approvals_reviewed_by_fkey(user_id, email, full_name)
      `)
      .single();

    if (updateError) {
      console.error("Error updating approval:", updateError);
      return NextResponse.json(
        { error: "Failed to update approval" },
        { status: 500 }
      );
    }

    // Update queue status based on approval decision
    if (currentApproval.queue_id) {
      if (status === "approved") {
        await supabase
          .from("blog_generation_queue")
          .update({ status: "approved" })
          .eq("queue_id", currentApproval.queue_id);
      } else if (status === "rejected") {
        await supabase
          .from("blog_generation_queue")
          .update({ status: "rejected" })
          .eq("queue_id", currentApproval.queue_id);
      } else if (status === "changes_requested") {
        await supabase
          .from("blog_generation_queue")
          .update({ status: "generated" }) // Back to generated for revisions
          .eq("queue_id", currentApproval.queue_id);
      }
    }

    return NextResponse.json(updatedApproval);
  } catch (error) {
    console.error("Error in PATCH /api/blog-approvals/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

