import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback handler.
 *
 * Supabase redirects here with a `?code=` query param after an email
 * confirmation link (or any OAuth flow). We exchange it for a session, then
 * redirect onward.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to the login page with an error indicator instead of a raw 400.
  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
}