import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/admin/organizations
 * List all organizations (system admins only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(request);
    const supabaseAdmin = createServiceClient();

    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get current user's role
    const { data: currentUserData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("user_id", currentUser.id)
      .single();

    if (userError || !currentUserData) {
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    // Check permissions - only system admins can list all organizations
    if (!["system_admin", "super_admin"].includes(currentUserData.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Fetch all organizations using service client
    const { data: organizations, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (orgError) {
      return NextResponse.json(
        { error: `Failed to fetch organizations: ${orgError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/organizations
 * Create a new organization (system admins only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(request);
    const supabaseAdmin = createServiceClient();

    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get current user's role
    const { data: currentUserData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("user_id", currentUser.id)
      .single();

    if (userError || !currentUserData) {
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    // Check permissions
    if (!["system_admin", "super_admin"].includes(currentUserData.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to create organizations" },
        { status: 403 }
      );
    }

    // Parse request body
    const { name, slug, subscription_tier, api_quota_monthly, settings } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    const orgSlug = slug || name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Create organization using service client
    const { data: newOrg, error: createError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name,
        slug: orgSlug,
        subscription_tier: subscription_tier || "free",
        api_quota_monthly: api_quota_monthly || 10000,
        settings: settings || {},
      })
      .select()
      .single();

    if (createError) {
      // Check if it's a unique constraint violation (duplicate slug)
      if (createError.code === "23505") {
        return NextResponse.json(
          { error: `An organization with slug "${orgSlug}" already exists` },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Failed to create organization: ${createError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newOrg,
    });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create organization" },
      { status: 500 }
    );
  }
}

