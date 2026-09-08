import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveSiteUrl } from "@/lib/site-url";

/**
 * POST-only sign-out. <form action="/auth/signout" method="post">
 * works without client-side JS (see AuthButton / MobileMenu).
 */
export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/", resolveSiteUrl(request)));
}