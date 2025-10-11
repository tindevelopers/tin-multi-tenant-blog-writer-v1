import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * API endpoint to assign system_admin role to a user
 * This uses the service role key to bypass RLS
 * 
 * Usage: POST /api/admin/assign-system-admin
 * Body: { "email": "systemadmin@tin.info" }
 */
export async function POST(request: Request) {
  try {
    const { email, secret } = await request.json();

    // Simple secret check (in production, use proper authentication)
    if (secret !== process.env.ADMIN_SETUP_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized. Invalid secret." },
        { status: 401 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Step 1: Create or get system organization
    let org;
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("*")
      .eq("slug", "system-org")
      .single();

    if (existingOrg) {
      org = existingOrg;
    } else {
      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: "System Organization",
          slug: "system-org",
          settings: { description: "System-level administrative organization" },
        })
        .select()
        .single();

      if (orgError) {
        console.error("Error creating organization:", orgError);
        return NextResponse.json(
          { error: "Failed to create organization", details: orgError.message },
          { status: 500 }
        );
      }
      org = newOrg;
    }

    // Step 2: Update user to system_admin role
    const { data: user, error: userError } = await supabase
      .from("users")
      .update({
        role: "system_admin",
        full_name: "System Administrator",
        org_id: org.org_id,
        updated_at: new Date().toISOString(),
      })
      .eq("email", email)
      .select()
      .single();

    if (userError) {
      console.error("Error updating user:", userError);
      return NextResponse.json(
        { error: "Failed to update user role", details: userError.message },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please ensure the user exists in the auth.users table first." },
        { status: 404 }
      );
    }

    // Step 3: Get user's permissions
    const { data: permissions, error: permError } = await supabase
      .from("role_permissions")
      .select("permissions(*)")
      .eq("role", "system_admin");

    return NextResponse.json({
      success: true,
      message: "User successfully assigned system_admin role",
      user: {
        id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        organization: org.name,
      },
      permissions: permissions || [],
    });
  } catch (error: unknown) {
    console.error("Error in assign-system-admin:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

