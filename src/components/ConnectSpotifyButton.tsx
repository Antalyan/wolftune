"use client";

import { useState } from "react";

/**
 * "Connect Spotify" button — navigates to the server route that starts the
 * per-user OAuth flow (built from the user's own Spotify app credentials).
 */
export function ConnectSpotifyButton() {
  const [loading, setLoading] = useState(false);

  return (
    <a
      href="/auth/spotify-connect"
      onClick={() => setLoading(true)}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-spotify-green text-black text-sm font-semibold hover:brightness-110 transition"
    >
      {loading ? "Redirecting to Spotify…" : "Connect Spotify"}
    </a>
  );
}

/** Disconnect button — submits the disconnect server action via a form. */
export function DisconnectSpotifyButton() {
  return (
    <a
      href="/settings?spotify=confirm_disconnect"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-night-900 border border-night-700 text-zinc-300 text-sm hover:border-night-500 transition"
    >
      Disconnect
    </a>
  );
}
