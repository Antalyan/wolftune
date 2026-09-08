import "server-only";

/**
 * Resolves the app's canonical origin for redirects and callbacks.
 *
 * Prefers the actual request origin (host + forwarded protocol), which is
 * always correct in route handlers — including on Vercel, where a static
 * NEXT_PUBLIC_SITE_URL can be misconfigured or left as an un-expanded
 * placeholder. The env var is only a last-resort fallback when no request
 * is available.
 */
export function resolveSiteUrl(request?: Request): string {
  if (request) {
    const host = request.headers.get("host");
    if (host) {
      const proto =
        request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
      return `${proto}://${host}`;
    }
  }

  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env && /^https?:\/\//.test(env)) {
    return env;
  }

  return "http://127.0.0.1:3000";
}