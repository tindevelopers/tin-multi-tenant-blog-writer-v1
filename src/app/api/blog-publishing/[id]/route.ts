import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PlatformStatus, canTransitionPlatformStatus } from "@/lib/blog-queue-state-machine";

/**
 * GET /api/blog-publishing/[id]
 * Get specific publishing record details
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

    const { data: publishing, error } = await supabase
      .from("blog_platform_publishing")
      .select(`
        *,
        post:blog_posts(post_id, title, content, status),
        queue:blog_generation_queue(queue_id, topic, generated_title, generated_content, status),
        published_by_user:users!blog_platform_publishing_published_by_fkey(user_id, email, full_name)
      `)
      .eq("publishing_id", id)
      .eq("org_id", userProfile.org_id)
      .single();

    if (error) {
      console.error("Error fetching publishing:", error);
      return NextResponse.json(
        { error: "Publishing record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(publishing);
  } catch (error) {
    console.error("Error in GET /api/blog-publishing/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/blog-publishing/[id]
 * Update publishing record status
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

    // Get user's org_id
    const { data: userProfile } = await supabase
      .from("users")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get current publishing record
    const { data: currentPublishing, error: fetchError } = await supabase
      .from("blog_platform_publishing")
      .select("*")
      .eq("publishing_id", id)
      .eq("org_id", userProfile.org_id)
      .single();

    if (fetchError || !currentPublishing) {
      return NextResponse.json(
        { error: "Publishing record not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status, error_message, error_code, platform_post_id, platform_url, scheduled_at } = body;

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      // Validate status transition
      if (!canTransitionPlatformStatus(currentPublishing.status, status as PlatformStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status transition: ${currentPublishing.status} → ${status}`,
          },
          { status: 400 }
        );
      }
      updateData.status = status as PlatformStatus;

      // Set published_at if status is published
      if (status === "published" && !currentPublishing.published_at) {
        updateData.published_at = new Date().toISOString();
      }
    }

    if (error_message !== undefined) {
      updateData.error_message = error_message;
    }
    if (error_code !== undefined) {
      updateData.error_code = error_code;
    }
    if (platform_post_id !== undefined) {
      updateData.platform_post_id = platform_post_id;
    }
    if (platform_url !== undefined) {
      updateData.platform_url = platform_url;
    }
    if (scheduled_at !== undefined) {
      updateData.scheduled_at = scheduled_at;
      // Update status to scheduled if scheduled_at is set
      if (scheduled_at && currentPublishing.status === "pending") {
        updateData.status = "scheduled";
      }
    }

    // Update publishing record
    const { data: updatedPublishing, error: updateError } = await supabase
      .from("blog_platform_publishing")
      .update(updateData)
      .eq("publishing_id", id)
      .select(`
        *,
        post:blog_posts(post_id, title, status),
        queue:blog_generation_queue(queue_id, topic, generated_title, status),
        published_by_user:users!blog_platform_publishing_published_by_fkey(user_id, email, full_name)
      `)
      .single();

    if (updateError) {
      console.error("Error updating publishing record:", updateError);
      return NextResponse.json(
        { error: "Failed to update publishing record" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedPublishing);
  } catch (error) {
    console.error("Error in PATCH /api/blog-publishing/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/blog-publishing/[id]
 * Cancel a publishing record
 */
export async function DELETE(
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

    // Get current publishing record
    const { data: currentPublishing } = await supabase
      .from("blog_platform_publishing")
      .select("*")
      .eq("publishing_id", id)
      .eq("org_id", userProfile.org_id)
      .single();

    if (!currentPublishing) {
      return NextResponse.json(
        { error: "Publishing record not found" },
        { status: 404 }
      );
    }

    // Only allow cancellation of pending or scheduled records
    if (!["pending", "scheduled"].includes(currentPublishing.status)) {
      return NextResponse.json(
        { error: "Can only cancel pending or scheduled publishing" },
        { status: 400 }
      );
    }

    // Update status to cancelled
    const { data: updatedPublishing, error: updateError } = await supabase
      .from("blog_platform_publishing")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("publishing_id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error cancelling publishing:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel publishing" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedPublishing);
  } catch (error) {
    console.error("Error in DELETE /api/blog-publishing/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

