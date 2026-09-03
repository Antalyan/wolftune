"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { PlusCircle, LogIn } from "lucide-react";
import { createGroup, joinGroup, type GroupActionResult } from "@/app/groups/actions";

export function GroupForm() {
  const [createState, createAction, createPending] = useFormState(
    createGroup,
    { error: null } as GroupActionResult
  );
  const [joinState, joinAction, joinPending] = useFormState(
    joinGroup,
    { error: null } as GroupActionResult
  );
  const [showJoin, setShowJoin] = useState(false);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Create group form */}
      <form action={createAction} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            Create a new group
          </label>
          <input
            type="text"
            name="name"
            placeholder="Pack name"
            maxLength={40}
            required
            disabled={createPending}
            className="w-full px-3 py-2 rounded-xl bg-night-800 border border-night-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        {createState?.error && (
          <p className="text-xs text-red-300">{createState.error}</p>
        )}
        <button
          type="submit"
          disabled={createPending}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors disabled:opacity-60"
        >
          <PlusCircle className="w-3 h-3" />
          {createPending ? "Creating…" : "Create Group"}
        </button>
      </form>

      {/* Join group panel */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            Join a group with invite code
          </label>
          {!showJoin ? (
            <button
              type="button"
              onClick={() => setShowJoin(true)}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-night-600 hover:border-blue-600/40 text-zinc-300 text-xs font-semibold text-center"
            >
              <LogIn className="w-3 h-3" />
              Enter an invite code
            </button>
          ) : (
            <form action={joinAction} className="space-y-3">
              <input
                type="text"
                name="invite_code"
                placeholder="Invite code (8 chars)"
                maxLength={8}
                required
                disabled={joinPending}
                className="w-full px-3 py-2 rounded-xl bg-night-800 border border-night-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-center"
                style={{ textTransform: "uppercase" }}
              />
              {joinState?.error && (
                <p className="text-xs text-red-300">{joinState.error}</p>
              )}
              {joinState?.success && !joinPending && (
                <p className="text-xs text-emerald-300">
                  Joined! Refresh the page to see your groups.
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={joinPending}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-spotify-green hover:bg-spotify-bright text-night-950 font-bold text-xs transition-colors disabled:opacity-60"
                >
                  {joinPending ? "Joining…" : "Join"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoin(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-night-600 text-zinc-400 text-xs hover:bg-night-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
