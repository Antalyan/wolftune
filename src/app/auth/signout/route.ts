import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST-only sign-out. <form action="/auth/signout" method="post">
 * works without client-side JS (see AuthButton / MobileMenu).
 */
export async function POST() {
  const supabase = createClient();
  await supabase.auth.signOut();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return NextResponse.redirect(new URL("/", siteUrl));
}