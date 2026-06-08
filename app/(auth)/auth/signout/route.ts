import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Reliable GET logout: clears the Supabase session and returns home. Lets users
 * sign out via a plain link even if the dropdown menu isn't reachable.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
