"use client";

import { useFormState } from "react-dom";
import { updateSpotifyCredentials, type SettingActionResult } from "./actions";

interface CredentialsFormProps {
  initialClientId: string | null;
  hasSavedCredentials: boolean;
}

export function CredentialsForm({
  initialClientId,
  hasSavedCredentials,
}: CredentialsFormProps) {
  const [state, formAction, pending] = useFormState(updateSpotifyCredentials, {
    error: null,
    success: null,
  } as SettingActionResult);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="client_id" className="block text-xs font-medium text-zinc-300 mb-1">
          Client ID
        </label>
        <input
          type="text"
          id="client_id"
          name="client_id"
          placeholder="From your Spotify developer app"
          defaultValue={initialClientId ?? ""}
          className="w-full px-3 py-2 rounded-xl bg-night-800 border border-night-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
        />
      </div>

      <div>
        <label htmlFor="client_secret" className="block text-xs font-medium text-zinc-300 mb-1">
          Client Secret
        </label>
        <input
          type="password"
          id="client_secret"
          name="client_secret"
          placeholder="••••••••••••"
          className="w-full px-3 py-2 rounded-xl bg-night-800 border border-night-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
        />
        <p className="text-[10px] text-zinc-500 mt-1">
          Stored in your profile and protected by Row Level Security. Only you
          can read or update them, and they&apos;re used only on the server.
        </p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save credentials"}
        </button>

        <button
          type="submit"
          name="clear"
          value="1"
          disabled={pending || !hasSavedCredentials}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-300 text-xs hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          Remove credentials
        </button>
      </div>

      {state.error && <p className="text-xs text-red-300">{state.error}</p>}
      {state.success && <p className="text-xs text-emerald-300">{state.success}</p>}
    </form>
  );
}
