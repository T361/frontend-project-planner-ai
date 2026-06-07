import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Uses the publishable (anon) key only — safe to ship
 * to the client. All access is constrained by RLS; this client can never read or
 * write another user's rows.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
