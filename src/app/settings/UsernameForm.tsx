"use client";

import { useFormState } from "react-dom";
import { UserCircle2 } from "lucide-react";
import { updateUsername, type SettingActionResult } from "./actions";

interface UsernameFormProps {
  currentUsername: string | null;
}

export function UsernameForm({ currentUsername }: UsernameFormProps) {
  const [state, formAction, pending] = useFormState(updateUsername, {
    error: null,
    success: null,
  } as SettingActionResult);

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex items-center gap-3">
        <UserCircle2 className="w-8 h-8 text-wolf-400 shrink-0" />
        <div className="min-w-0">
          <label htmlFor="username" className="block text-xs font-medium text-zinc-300 mb-1">
            Nickname
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              id="username"
              name="username"
              required
              disabled={pending}
              defaultValue={currentUsername ?? ""}
              placeholder="How your pack sees you"
              maxLength={24}
              className="w-56 px-3 py-2 rounded-xl bg-night-800 border border-night-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-zinc-500">
        2–24 characters, letters/numbers/underscores. Shown to your group on rating plans,
        leaderboards and the group members list.
      </p>
      {state.error && <p className="text-xs text-red-300">{state.error}</p>}
      {state.success && <p className="text-xs text-emerald-300">{state.success}</p>}
    </form>
  );
}
