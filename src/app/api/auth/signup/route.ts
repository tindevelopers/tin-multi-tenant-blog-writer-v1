import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logger } from "@/utils/logger";
import { parseJsonBody, validateRequiredFields, handleApiError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody<{
      email: string;
      password: string;
      fullName: string;
      orgName: string;
    }>(request);
    
    validateRequiredFields(body, ['email', 'password', 'fullName', 'orgName']);
    
    const { email, password, fullName, orgName } = body;

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
        org_id: org.org_id,
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
    logger.logError(error instanceof Error ? error : new Error('Unknown signup error'), {
      context: 'signup',
    });
    return handleApiError(error);
  }
}
