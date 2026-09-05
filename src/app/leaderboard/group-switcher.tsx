"use client";

import { useRouter } from "next/navigation";
import type { UserGroupSummary } from "@/lib/groups";

interface Props {
  groups: UserGroupSummary[];
  selectedId: string | null;
  /** Route the switcher navigates within (defaults to /leaderboard). */
  basePath?: string;
}

export function GroupLeaderboardSwitcher({ groups, selectedId, basePath = "/leaderboard" }: Props) {
  const router = useRouter();

  return (
    <select
      value={selectedId ?? ""}
      onChange={(e) => {
        const value = e.target.value;
        router.replace(
          value ? `${basePath}?group=${encodeURIComponent(value)}` : basePath
        );
      }}
      className="mb-3 w-full max-w-xs bg-night-900 border border-night-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
      aria-label="Select group"
    >
      {groups.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </select>
  );
}
