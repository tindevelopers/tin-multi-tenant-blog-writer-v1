import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export async function createClient(request?: NextRequest) {
  const cookieStore = await cookies();
  
  // Check for Authorization header (for API testing)
  let authToken: string | undefined;
  if (request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      authToken = authHeader.substring(7);
    }
  }

  // If we have a token from Authorization header, use it directly
  if (authToken) {
    const client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    // Set the session with the access token
    // Note: getUser() will use this session
    const { error: sessionError } = await client.auth.setSession({
      access_token: authToken,
      refresh_token: authToken, // Use same token as refresh (for API testing only)
    });
    
    if (sessionError) {
      console.error('Failed to set session:', sessionError);
      // Still return client - API route will handle auth failure
    }
    
    return client;
  }

  // Otherwise, use cookie-based authentication (normal browser flow)
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Silently fail if cookies can't be set (e.g., in middleware)
            console.warn('Could not set cookie:', name, error);
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Silently fail if cookies can't be removed (e.g., in middleware)
            console.warn('Could not remove cookie:', name, error);
          }
        },
      },
    }
  );
}

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}