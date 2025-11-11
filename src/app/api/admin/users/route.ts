import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/admin/users
 * Create a new user and associate with an organization
 * 
 * Body: {
 *   email: string;
 *   password: string;
 *   fullName: string;
 *   role: string;
 *   orgId: string;
 * }
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

    // Get current user's role and org_id
    const { data: currentUserData, error: userError } = await supabase
      .from("users")
      .select("role, org_id")
      .eq("user_id", currentUser.id)
      .single();

    if (userError || !currentUserData) {
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    // Check permissions
    const allowedRoles = ["system_admin", "super_admin", "admin", "owner"];
    if (!allowedRoles.includes(currentUserData.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to create users" },
        { status: 403 }
      );
    }

    // Parse request body
    const { email, password, fullName, role, orgId } = await request.json();

    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, fullName, role" },
        { status: 400 }
      );
    }

    // Determine target organization
    let targetOrgId: string;
    if (["system_admin", "super_admin"].includes(currentUserData.role)) {
      // System admins can assign to any organization
      if (!orgId) {
        return NextResponse.json(
          { error: "Organization ID is required" },
          { status: 400 }
        );
      }
      targetOrgId = orgId;
    } else {
      // Organization admins can only add users to their own organization
      targetOrgId = currentUserData.org_id;
    }

    // Validate role assignment
    const validRoles = ["writer", "editor", "manager", "admin", "owner"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Organization admins cannot assign admin/owner roles
    if (!["system_admin", "super_admin"].includes(currentUserData.role)) {
      if (["admin", "owner"].includes(role)) {
        return NextResponse.json(
          { error: "You cannot assign admin or owner roles" },
          { status: 403 }
        );
      }
    }

    // Verify organization exists
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("org_id")
      .eq("org_id", targetOrgId)
      .single();

    if (orgError || !orgData) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Create auth user (using service client to bypass RLS)
    const { data: authData, error: authError: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      },
    });

    if (signUpError || !authData.user) {
      console.error("Error creating auth user:", signUpError);
      return NextResponse.json(
        { error: `Failed to create user: ${signUpError?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // Create user profile in database (using service client to bypass RLS)
    const { error: profileError } = await supabaseAdmin
      .from("users")
      .insert({
        user_id: authData.user.id,
        org_id: targetOrgId,
        email,
        full_name: fullName,
        role,
      });

    if (profileError) {
      // If profile creation fails, try to clean up auth user
      console.error("Error creating user profile:", profileError);
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error("Error cleaning up auth user:", cleanupError);
      }
      return NextResponse.json(
        { error: `Failed to create user profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        user_id: authData.user.id,
        email,
        full_name: fullName,
        role,
        org_id: targetOrgId,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: 500 }
    );
  }
}
