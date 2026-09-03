"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SpotifyMeStatus } from "@/types/spotify";

type Status = "loading" | "not_connected" | "connected_free" | "connected_premium" | "error";

export function SpotifyConnectionCard() {
  const [status, setStatus] = useState<Status>("loading");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    setStatus("loading");
    const res = await fetch("/api/spotify/me", { cache: "no-store" });
    const data = (await res.json()) as SpotifyMeStatus;

    if (!data.connected) {
      setStatus("not_connected");
    } else if (data.premium) {
      setDisplayName(data.displayName ?? null);
      setStatus("connected_premium");
    } else {
      setErrorMessage(data.error ?? null);
      setStatus("connected_free");
    }
  }, []);

  useEffect(() => {
    loadStatus().catch(() => setStatus("error"));
  }, [loadStatus]);

  const connect = async () => {
    setBusy(true);
    setErrorMessage(null);
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.linkIdentity({
      provider: "spotify",
      options: { redirectTo: `${siteUrl}/settings` },
    });
    // On success the browser redirects to Spotify; only errors reach this line.
    if (error) {
      setErrorMessage(error.message);
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const spotifyIdentity = user?.identities?.find((i) => i.provider === "spotify");

    // Guard: don't let users unlink their only login method.
    if (spotifyIdentity && (user?.identities?.length ?? 0) < 2) {
      setErrorMessage(
        "This is your only sign-in method. Add an email/password or another provider before disconnecting Spotify."
      );
      setBusy(false);
      return;
    }

    if (spotifyIdentity) {
      const { error } = await supabase.auth.unlinkIdentity(spotifyIdentity);
      if (error) setErrorMessage(error.message);
    }
    await loadStatus();
    setBusy(false);
  };

  return (
    <div className="bg-night-800/80 border border-night-700 rounded-2xl p-5">
      <h2 className="font-bold text-white mb-1">Spotify connection</h2>
      <p className="text-xs text-zinc-400 leading-relaxed mb-4">
        WolfTune plays music through your own Spotify account. A{" "}
        <span className="text-spotify-bright">Premium subscription</span> is required for
        in-app playback (snippets and full tracks).
      </p>

      {status === "loading" && (
        <div className="h-10 rounded-xl bg-night-700/50 animate-pulse" />
      )}

      {status === "not_connected" && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-xs text-zinc-400">Not connected.</span>
          <button
            type="button"
            onClick={connect}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-spotify-green hover:bg-spotify-bright text-night-950 text-xs font-bold transition-colors disabled:opacity-60"
          >
            {busy ? "Redirecting…" : "Connect Spotify"}
          </button>
        </div>
      )}

      {status === "connected_premium" && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-semibold text-spotify-bright">
            <span className="w-2 h-2 rounded-full bg-spotify-green inline-block" />
            Connected{displayName ? ` as ${displayName}` : ""} — Premium active
          </span>
          <button
            type="button"
            onClick={disconnect}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg border border-night-700 hover:border-red-500/40 text-xs text-zinc-400 hover:text-red-300 transition-colors disabled:opacity-60"
          >
            Disconnect
          </button>
        </div>
      )}

      {status === "connected_free" && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-xs text-amber-300">
            Connected, but playback requires Spotify Premium.
            {errorMessage ? ` (${errorMessage})` : ""}
          </span>
          <button
            type="button"
            onClick={disconnect}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg border border-night-700 hover:border-red-500/40 text-xs text-zinc-400 hover:text-red-300 transition-colors disabled:opacity-60"
          >
            Disconnect
          </button>
        </div>
      )}

      {status === "error" && (
        <p className="text-xs text-red-300">
          Could not determine Spotify status. {errorMessage ?? "Try reloading the page."}
        </p>
      )}

      {errorMessage && status !== "connected_free" && (
        <p className="text-xs text-red-300 mt-3">{errorMessage}</p>
      )}
    </div>
  );
}
