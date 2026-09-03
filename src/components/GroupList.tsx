"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { Copy, Trash2, ExternalLink } from "lucide-react";
import { leaveGroup, type GroupActionResult } from "@/app/groups/actions";
import { type Group } from "@/types/database";

interface GroupListProps {
  groups: Group[];
  isOwner: boolean;
  userId: string;
}

export function GroupList({ groups, isOwner, userId }: GroupListProps) {
  if (groups.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        {isOwner
          ? "You haven't created any groups yet."
          : "You're not a member of any groups."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          isOwner={isOwner}
          userId={userId}
        />
      ))}
    </div>
  );
}

function GroupCard({
  group,
  isOwner,
  userId,
}: {
  group: Group;
  isOwner: boolean;
  userId: string;
}) {
  const [state, action, pending] = useFormState(leaveGroup, {
    error: null,
  } as GroupActionResult);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(group.invite_code);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = group.invite_code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="bg-night-800/60 border border-night-700 rounded-xl p-4 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/groups/${group.id}`}
            className="font-bold text-white text-sm hover:text-blue-400 transition-colors truncate"
          >
            {group.name}
          </Link>
          {!isOwner && (
            <span className="text-[10px] bg-night-700 text-zinc-400 px-1.5 py-0.5 rounded-full">
              member
            </span>
          )}
          {isOwner && (
            <span className="text-[10px] bg-blue-600/20 text-blue-300 px-1.5 py-0.5 rounded-full">
              owner
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-zinc-400 font-mono">
            Invite code: {group.invite_code}
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Copy invite code"
            title="Copy invite code"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        {isOwner && (
          <Link
            href={`/groups/${group.id}`}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
            aria-label={`Manage ${group.name}`}
            title="Manage group"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        )}
        {!isOwner && (
          <form action={action}>
            <input type="hidden" name="group_id" value={group.id} />
            <button
              type="submit"
              disabled={pending}
              className="p-1 text-zinc-400 hover:text-red-300 transition-colors disabled:opacity-50"
              aria-label={`Leave ${group.name}`}
              title="Leave group"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
