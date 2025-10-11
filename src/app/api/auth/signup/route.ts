import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, orgName } = await request.json();

    if (!email || !password || !fullName || !orgName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const supabaseAdmin = createServiceClient();

    // Create organization first (using service role to bypass RLS)
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: orgName,
        slug,
      })
      .select()
      .single();

    if (orgError) {
      throw new Error(`Organization creation failed: ${orgError.message}`);
    }

    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          org_name: orgName,
        },
      },
    });

    if (authError) {
      throw new Error(`User creation failed: ${authError.message}`);
    }

    if (authData.user) {
      // Create user profile (using service role to bypass RLS)
      // First user in organization becomes admin
      const { error: userError } = await supabaseAdmin.from("users").insert({
        user_id: authData.user.id,
        organization_id: org.id,
        email,
        full_name: fullName,
        role: "admin", // Organization owner/creator gets admin role
      });

      if (userError) {
        throw new Error(`User profile creation failed: ${userError.message}`);
      }

      return NextResponse.json({
        success: true,
        user: authData.user,
        organization: org,
      });
    }

    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
      } catch (error: unknown) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred during signup" },
      { status: 500 }
    );
  }
}
