import { createClient } from "@supabase/supabase-js";

// IMPORTANT: Only import this inside Route Handlers (app/api/**).
// It uses the service role key — it must NEVER reach the browser bundle.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        // Same reasoning as lib/supabase/server.ts — reads made during
        // Server Component rendering must never be cached by Next's fetch
        // Data Cache, or admin edits won't show up until the next deploy.
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
}
