import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client bound to the request's cookies (Next 16: cookies() is
 * async). It runs as the signed-in user (publishable key + user JWT in cookies),
 * so RLS applies on every query. We deliberately do NOT use the service-role key
 * here — nothing in this app bypasses RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — cookie writes are handled by the
            // proxy (middleware) on the next request. Safe to ignore.
          }
        },
      },
    },
  );
}
