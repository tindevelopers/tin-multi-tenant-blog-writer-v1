import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from '@/utils/logger';

/**
 * GET /api/admin/organizations/[id]
 * Get a specific organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("org_id", id)
      .single();

    if (orgError) {
      if (orgError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `Failed to fetch organization: ${orgError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: org,
    });
  } catch (error) {
    logger.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/organizations/[id]
 * Update an organization
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
        { error: "Insufficient permissions to update organizations" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, slug, subscription_tier, api_quota_monthly, settings } = body;

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (subscription_tier !== undefined) updateData.subscription_tier = subscription_tier;
    if (api_quota_monthly !== undefined) updateData.api_quota_monthly = api_quota_monthly;
    if (settings !== undefined) updateData.settings = settings;

    const { data: updatedOrg, error: updateError } = await supabaseAdmin
      .from("organizations")
      .update(updateData)
      .eq("org_id", id)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === "23505") {
        return NextResponse.json(
          { error: `An organization with slug "${slug}" already exists` },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Failed to update organization: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedOrg,
    });
  } catch (error) {
    logger.error("Error updating organization:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update organization" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/organizations/[id]
 * Delete an organization
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Check permissions - only system admins can delete organizations
    if (!["system_admin", "super_admin"].includes(currentUserData.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to delete organizations" },
        { status: 403 }
      );
    }

    // Check if organization has users
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("user_id")
      .eq("org_id", id)
      .limit(1);

    if (usersError) {
      return NextResponse.json(
        { error: `Failed to check organization users: ${usersError.message}` },
        { status: 500 }
      );
    }

    if (users && users.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete organization with existing users. Please remove all users first." },
        { status: 400 }
      );
    }

    // Delete organization
    const { error: deleteError } = await supabaseAdmin
      .from("organizations")
      .delete()
      .eq("org_id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete organization: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Organization deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting organization:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete organization" },
      { status: 500 }
    );
  }
}

