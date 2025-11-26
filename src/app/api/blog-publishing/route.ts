import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PlatformStatus } from "@/lib/blog-queue-state-machine";
import { logger } from '@/utils/logger';
import { getWebflowFieldMappings, applyWebflowFieldMappings } from '@/lib/integrations/webflow-field-mapping';

/**
 * GET /api/blog-publishing
 * List all publishing records with filters
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
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get("platform") as "webflow" | "wordpress" | "shopify" | null;
    const status = searchParams.get("status") as PlatformStatus | null;
    const postId = searchParams.get("post_id");
    const queueId = searchParams.get("queue_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabase
      .from("blog_platform_publishing")
      .select(`
        *,
        post:blog_posts(post_id, title, status),
        queue:blog_generation_queue(queue_id, topic, generated_title, status),
        published_by_user:users!blog_platform_publishing_published_by_fkey(user_id, email, full_name)
      `)
      .eq("org_id", userProfile.org_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (platform) {
      query = query.eq("platform", platform);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (postId) {
      query = query.eq("post_id", postId);
    }
    if (queueId) {
      query = query.eq("queue_id", queueId);
    }

    const { data: publishing, error } = await query;

    if (error) {
      logger.error("Error fetching publishing records:", error);
      return NextResponse.json(
        { error: "Failed to fetch publishing records" },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("blog_platform_publishing")
      .select("*", { count: "exact", head: true })
      .eq("org_id", userProfile.org_id);

    if (platform) countQuery = countQuery.eq("platform", platform);
    if (status) countQuery = countQuery.eq("status", status);
    if (postId) countQuery = countQuery.eq("post_id", postId);
    if (queueId) countQuery = countQuery.eq("queue_id", queueId);

    const { count } = await countQuery;

    return NextResponse.json({
      items: publishing || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    logger.error("Error in GET /api/blog-publishing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blog-publishing
 * Create a new publishing record (initiate publishing)
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
    const { post_id, queue_id, platform, scheduled_at, publish_metadata } = body;

    if (!post_id && !queue_id) {
      return NextResponse.json(
        { error: "Either post_id or queue_id is required" },
        { status: 400 }
      );
    }

    if (!platform || !["webflow", "wordpress", "shopify"].includes(platform)) {
      return NextResponse.json(
        { error: "Valid platform (webflow, wordpress, shopify) is required" },
        { status: 400 }
      );
    }

    // Database requires post_id to be NOT NULL, so we need to ensure post_id exists
    let finalPostId = post_id;

    // If only queue_id is provided, we need to get the post_id from the queue item
    if (!finalPostId && queue_id) {
      const { data: queueItem } = await supabase
        .from("blog_generation_queue")
        .select("queue_id, status, org_id, post_id")
        .eq("queue_id", queue_id)
        .eq("org_id", userProfile.org_id)
        .single();

      if (!queueItem) {
        return NextResponse.json(
          { error: "Queue item not found" },
          { status: 404 }
        );
      }

      // Only allow publishing for approved or generated content
      if (!["approved", "generated"].includes(queueItem.status)) {
        return NextResponse.json(
          { error: "Can only publish approved or generated content" },
          { status: 400 }
        );
      }

      // If queue item has a post_id, use that
      if (queueItem.post_id) {
        finalPostId = queueItem.post_id;
      } else {
        return NextResponse.json(
          { error: "Queue item does not have an associated blog post. Please generate content first." },
          { status: 400 }
        );
      }
    }

    // Ensure we have a post_id (required by database)
    if (!finalPostId) {
      return NextResponse.json(
        { error: "post_id is required. Please provide a post_id or ensure the queue item has an associated post." },
        { status: 400 }
      );
    }

    // Verify the post exists and belongs to the org
    const { data: post } = await supabase
      .from("blog_posts")
      .select("post_id, org_id")
      .eq("post_id", finalPostId)
      .eq("org_id", userProfile.org_id)
      .single();

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Determine initial status
    const initialStatus: PlatformStatus = scheduled_at
      ? "scheduled"
      : "pending";

    // For Webflow, get and apply field mappings
    let finalPublishMetadata = publish_metadata || {};
    if (platform === 'webflow') {
      try {
        // Get the blog post data
        const { data: post } = await supabase
          .from("blog_posts")
          .select("title, content, excerpt, metadata, seo_data")
          .eq("post_id", finalPostId)
          .single();

        if (post) {
          // Get Webflow field mappings
          const fieldMappings = await getWebflowFieldMappings(userProfile.org_id);
          
          // Prepare blog post data
          const blogPostData = {
            title: post.title,
            content: post.content || '',
            excerpt: post.excerpt || '',
            slug: (post.metadata as Record<string, unknown>)?.slug as string | undefined,
            featured_image: (post.metadata as Record<string, unknown>)?.featured_image as string | undefined,
            seo_title: (post.seo_data as Record<string, unknown>)?.meta_title as string | undefined,
            seo_description: (post.seo_data as Record<string, unknown>)?.meta_description as string | undefined,
            published_at: new Date().toISOString(),
          };

          // Apply field mappings
          const mappedFields = applyWebflowFieldMappings(blogPostData, fieldMappings);
          
          // Store mapped fields in publish_metadata
          finalPublishMetadata = {
            ...finalPublishMetadata,
            field_mappings: fieldMappings,
            mapped_fields: mappedFields,
            original_fields: blogPostData,
          };

          logger.debug('Applied Webflow field mappings', {
            orgId: userProfile.org_id,
            postId: finalPostId,
            mappingCount: fieldMappings.length,
            mappedFields: Object.keys(mappedFields),
          });
        }
      } catch (error) {
        logger.error('Error applying Webflow field mappings:', error);
        // Continue without mappings if there's an error
      }
    }

    // Create publishing record
    const { data: publishing, error } = await supabase
      .from("blog_platform_publishing")
      .insert({
        org_id: userProfile.org_id,
        post_id: finalPostId,
        queue_id: queue_id || null,
        platform,
        status: initialStatus,
        scheduled_at: scheduled_at || null,
        published_by: user.id,
        publish_metadata: finalPublishMetadata,
        retry_count: 0,
      })
      .select(`
        *,
        post:blog_posts(post_id, title, status),
        queue:blog_generation_queue(queue_id, topic, generated_title, status),
        published_by_user:users!blog_platform_publishing_published_by_fkey(user_id, email, full_name)
      `)
      .single();

    if (error) {
      logger.error("Error creating publishing record:", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        post_id: finalPostId,
        queue_id,
        platform,
      });
      return NextResponse.json(
        { 
          error: "Failed to create publishing record",
          details: error.message || error.details || error.hint
        },
        { status: 500 }
      );
    }

    // If not scheduled, trigger immediate publishing (async)
    if (!scheduled_at) {
      // In a real implementation, this would trigger an async job
      // For now, we'll just return the record
      // TODO: Trigger actual publishing job
    }

    return NextResponse.json(publishing, { status: 201 });
  } catch (error) {
    logger.error("Error in POST /api/blog-publishing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

