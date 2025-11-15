import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApprovalStatus } from "@/lib/blog-queue-state-machine";
import { canTransitionApprovalStatus } from "@/lib/blog-queue-state-machine";
import { logger } from '@/utils/logger';

/**
 * GET /api/blog-approvals
 * List all approval requests with filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's org_id
    const { data: userProfile } = await supabase
      .from("users")
      .select("org_id, role")
      .eq("user_id", user.id)
      .single();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as ApprovalStatus | null;
    const requestedBy = searchParams.get("requested_by");
    const reviewedBy = searchParams.get("reviewed_by");
    const queueId = searchParams.get("queue_id");
    const postId = searchParams.get("post_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabase
      .from("blog_approvals")
      .select(`
        *,
        requested_by_user:users!blog_approvals_requested_by_fkey(user_id, email, full_name),
        reviewed_by_user:users!blog_approvals_reviewed_by_fkey(user_id, email, full_name),
        queue:blog_generation_queue(queue_id, topic, generated_title, status),
        post:blog_posts(post_id, title, status)
      `)
      .eq("org_id", userProfile.org_id)
      .order("requested_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }
    if (requestedBy) {
      query = query.eq("requested_by", requestedBy);
    }
    if (reviewedBy) {
      query = query.eq("reviewed_by", reviewedBy);
    }
    if (queueId) {
      query = query.eq("queue_id", queueId);
    }
    if (postId) {
      query = query.eq("post_id", postId);
    }

    const { data: approvals, error } = await query;

    if (error) {
      logger.error("Error fetching approvals:", error);
      return NextResponse.json(
        { error: "Failed to fetch approvals" },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("blog_approvals")
      .select("*", { count: "exact", head: true })
      .eq("org_id", userProfile.org_id);

    if (status) countQuery = countQuery.eq("status", status);
    if (requestedBy) countQuery = countQuery.eq("requested_by", requestedBy);
    if (reviewedBy) countQuery = countQuery.eq("reviewed_by", reviewedBy);
    if (queueId) countQuery = countQuery.eq("queue_id", queueId);
    if (postId) countQuery = countQuery.eq("post_id", postId);

    const { count } = await countQuery;

    return NextResponse.json({
      items: approvals || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    logger.error("Error in GET /api/blog-approvals:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blog-approvals
 * Request approval for a blog (queue item or post)
 */
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { queue_id, post_id, review_notes } = body;

    if (!queue_id && !post_id) {
      return NextResponse.json(
        { error: "Either queue_id or post_id is required" },
        { status: 400 }
      );
    }

    // Verify the queue item or post exists and belongs to the org
    if (queue_id) {
      const { data: queueItem } = await supabase
        .from("blog_generation_queue")
        .select("queue_id, status, org_id")
        .eq("queue_id", queue_id)
        .eq("org_id", userProfile.org_id)
        .single();

      if (!queueItem) {
        return NextResponse.json(
          { error: "Queue item not found" },
          { status: 404 }
        );
      }

      // Only allow approval requests for generated content
      if (queueItem.status !== "generated") {
        return NextResponse.json(
          { error: "Can only request approval for generated content" },
          { status: 400 }
        );
      }
    }

    if (post_id) {
      const { data: post } = await supabase
        .from("blog_posts")
        .select("post_id, org_id")
        .eq("post_id", post_id)
        .eq("org_id", userProfile.org_id)
        .single();

      if (!post) {
        return NextResponse.json(
          { error: "Post not found" },
          { status: 404 }
        );
      }
    }

    // Check if there's already a pending approval
    const { data: existingApproval } = await supabase
      .from("blog_approvals")
      .select("approval_id")
      .eq("org_id", userProfile.org_id)
      .eq("status", "pending")
      .or(
        queue_id
          ? `queue_id.eq.${queue_id}`
          : `post_id.eq.${post_id}`
      )
      .single();

    if (existingApproval) {
      return NextResponse.json(
        { error: "Pending approval already exists" },
        { status: 400 }
      );
    }

    // Get the latest approval to determine revision number
    const { data: previousApprovals } = await supabase
      .from("blog_approvals")
      .select("approval_id, revision_number")
      .eq("org_id", userProfile.org_id)
      .or(
        queue_id
          ? `queue_id.eq.${queue_id}`
          : `post_id.eq.${post_id}`
      )
      .order("revision_number", { ascending: false })
      .limit(1);

    const revisionNumber = previousApprovals?.[0]
      ? previousApprovals[0].revision_number + 1
      : 1;

    // Create approval request
    const { data: approval, error } = await supabase
      .from("blog_approvals")
      .insert({
        org_id: userProfile.org_id,
        queue_id: queue_id || null,
        post_id: post_id || null,
        status: "pending",
        requested_by: user.id,
        requested_at: new Date().toISOString(),
        review_notes: review_notes || null,
        revision_number: revisionNumber,
        previous_approval_id: previousApprovals?.[0]?.approval_id || null,
      })
      .select(`
        *,
        requested_by_user:users!blog_approvals_requested_by_fkey(user_id, email, full_name)
      `)
      .single();

    if (error) {
      logger.error("Error creating approval:", error);
      return NextResponse.json(
        { error: "Failed to create approval request" },
        { status: 500 }
      );
    }

    // Update queue status to "in_review" if applicable
    if (queue_id) {
      await supabase
        .from("blog_generation_queue")
        .update({ status: "in_review" })
        .eq("queue_id", queue_id);
    }

    return NextResponse.json(approval, { status: 201 });
  } catch (error) {
    logger.error("Error in POST /api/blog-approvals:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

