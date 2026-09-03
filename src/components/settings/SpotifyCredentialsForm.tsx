"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Save, Trash2 } from "lucide-react";

interface SpotifyCredentialsFormProps {
  initialClientId: string;
  initialClientSecret: string;
}

export function SpotifyCredentialsForm({
  initialClientId,
  initialClientSecret,
}: SpotifyCredentialsFormProps) {
  const [clientId, setClientId] = useState(initialClientId);
  const [clientSecret, setClientSecret] = useState(initialClientSecret);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const hasChanges =
    clientId !== initialClientId || clientSecret !== initialClientSecret;
  const isComplete = clientId.trim().length > 0 && clientSecret.trim().length > 0;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/settings/spotify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
    });

    const data = await res.json().catch(() => null);
    setSaving(false);

    if (res.ok) {
      setMessage({ type: "ok", text: data?.message ?? "Credentials saved." });
    } else {
      setMessage({ type: "error", text: data?.error ?? "Failed to save credentials." });
    }
  };

  const onClear = async () => {
    setClientId("");
    setClientSecret("");
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/settings/spotify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: "", clientSecret: "" }),
    });

    const data = await res.json().catch(() => null);
    setSaving(false);

    if (res.ok) {
      setMessage({ type: "ok", text: data?.message ?? "Credentials removed." });
    } else {
      setMessage({ type: "error", text: data?.error ?? "Failed to clear credentials." });
    }
  };

  return (
    <form onSubmit={onSubmit} className="bg-night-800/80 border border-night-700 rounded-2xl p-5 space-y-4">
      <div>
        <label htmlFor="clientId" className="block text-xs font-semibold text-zinc-300 mb-1.5">
          Client ID
        </label>
        <input
          id="clientId"
          type="text"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="Enter your Spotify Client ID"
          autoComplete="off"
          className="w-full px-3 py-2 rounded-lg bg-night-900 border border-night-600 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-wolf-500"
        />
      </div>

      <div>
        <label htmlFor="clientSecret" className="block text-xs font-semibold text-zinc-300 mb-1.5">
          Client Secret
        </label>
        <div className="relative">
          <input
            id="clientSecret"
            type={showSecret ? "text" : "password"}
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="Enter your Spotify Client Secret"
            autoComplete="off"
            className="w-full px-3 py-2 pr-10 rounded-lg bg-night-900 border border-night-600 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-wolf-500"
          />
          <button
            type="button"
            onClick={() => setShowSecret((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-zinc-400 hover:text-white transition-colors"
            aria-label={showSecret ? "Hide secret" : "Show secret"}
          >
            {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-500 leading-relaxed">
        Create a free Spotify Developer app at{" "}
        <a
          href="https://developer.spotify.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="text-wolf-400 hover:underline"
        >
          developer.spotify.com/dashboard
        </a>
        . Use the Client ID and Client Secret from that app.
      </p>

      {message && (
        <p
          className={`text-xs px-3 py-2 rounded-lg ${
            message.type === "ok"
              ? "bg-spotify-green/15 text-spotify-green border border-spotify-green/30"
              : "bg-red-950/60 text-red-300 border border-red-800/40"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !hasChanges}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-spotify-green hover:bg-spotify-bright text-night-950 text-xs font-bold transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving…" : "Save credentials"}
        </button>
        {isComplete && (
          <button
            type="button"
            onClick={onClear}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-night-700 hover:border-red-500/40 text-xs text-zinc-400 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>
    </form>
  );
}
