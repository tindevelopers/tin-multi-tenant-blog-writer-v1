import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from '@/utils/logger';

/**
 * POST /api/blog-publishing/[id]/retry
 * Retry a failed publishing attempt
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

    // Only allow retry for failed records
    if (currentPublishing.status !== "failed") {
      return NextResponse.json(
        { error: "Can only retry failed publishing attempts" },
        { status: 400 }
      );
    }

    // Update to pending and increment retry count
    const { data: updatedPublishing, error: updateError } = await supabase
      .from("blog_platform_publishing")
      .update({
        status: "pending",
        retry_count: currentPublishing.retry_count + 1,
        last_retry_at: new Date().toISOString(),
        error_message: null,
        error_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("publishing_id", id)
      .select(`
        *,
        post:blog_posts(post_id, title, status),
        queue:blog_generation_queue(queue_id, topic, generated_title, status),
        published_by_user:users!blog_platform_publishing_published_by_fkey(user_id, email, full_name)
      `)
      .single();

    if (updateError) {
      logger.error("Error retrying publishing:", updateError);
      return NextResponse.json(
        { error: "Failed to retry publishing" },
        { status: 500 }
      );
    }

    // TODO: Trigger actual publishing job

    return NextResponse.json(updatedPublishing);
  } catch (error) {
    logger.error("Error in POST /api/blog-publishing/[id]/retry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

