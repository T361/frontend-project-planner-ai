import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Resolve the signed-in user for a route handler / server component.
 * Returns null when unauthenticated (route handlers turn this into 401).
 */
export async function getAuth(): Promise<{
  supabase: SupabaseClient;
  user: User | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Throw a 401 if there is no session. */
export async function requireUser() {
  const { supabase, user } = await getAuth();
  if (!user) throw new HttpError(401, "Authentication required");
  return { supabase, user };
}
