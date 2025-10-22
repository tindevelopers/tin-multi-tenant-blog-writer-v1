import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Create a service client for server-side operations
 * This bypasses authentication and uses the service role key
 */
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
