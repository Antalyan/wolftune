/**
 * Read & validate required Supabase environment variables.
 *
 * Throws a descriptive error immediately if a key is missing, so misconfig
 * surfaces early instead of failing deep inside a query.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      "Missing env var NEXT_PUBLIC_SUPABASE_URL. Copy .env.example to .env.local " +
        "and set your Supabase project URL (Supabase Dashboard → Project Settings → API)."
    );
  }
  if (!anonKey) {
    throw new Error(
      "Missing env var NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local " +
        "and set your Supabase anon key (Supabase Dashboard → Project Settings → API)."
    );
  }

  return { url, anonKey };
}