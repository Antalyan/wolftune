          "use client";

import { useFormState } from "react-dom";
import { Settings } from "lucide-react";
import {
  updateGroupCredentials,
  type GroupSettingsActionResult,
} from "@/app/groups/actions";

interface GroupCredentialsFormProps {
  groupId: string;
  /** Current group Client ID (Client Secret is never sent to the client). */
  initialClientId: string | null;
}

export function GroupCredentialsForm({ groupId, initialClientId }: GroupCredentialsFormProps) {
  const [state, action, pending] = useFormState(
    updateGroupCredentials.bind(null, groupId),
    { error: null, success: null } as GroupSettingsActionResult
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label
          htmlFor={`gid_${groupId}`}
          className="block text-xs font-medium text-zinc-300 mb-1"
        >
          Client ID
        </label>
        <input
          type="text"
          id={`gid_${groupId}`}
          name="client_id"
          placeholder="From your Spotify developer app"
          defaultValue={initialClientId ?? ""}
          className="w-full px-3 py-2 rounded-xl bg-night-800 border border-night-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
        />
      </div>
      <div>
        <label
          htmlFor={`gsec_${groupId}`}
          className="block text-xs font-medium text-zinc-300 mb-1"
        >
          Client Secret
        </label>
        <input
          type="password"
          id={`gsec_${groupId}`}
          name="client_secret"
          placeholder="Enter client secret"
          className="w-full px-3 py-2 rounded-xl bg-night-800 border border-night-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
        />
        <p className="text-[10px] text-zinc-500 mt-1">
          Used by group members. Only group owners can see and edit these.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors disabled:opacity-60"
        >
          <Settings className="w-3 h-3" />
          {pending ? "Saving..." : "Save group credentials"}
        </button>
      </div>
      {state.error && <p className="text-xs text-red-300">{state.error}</p>}
      {state.success && <p className="text-xs text-emerald-300">{state.success}</p>}
    </form>
  );
}