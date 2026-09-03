"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, ShieldCheck, UserMinus } from "lucide-react";

interface Member {
  id: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

interface GroupMembersListProps {
  members: Member[];
  isAdmin: boolean;
  groupId: string;
}

export function GroupMembersList({ members, isAdmin, groupId }: GroupMembersListProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const removeMember = async (userId: string) => {
    if (!confirm("Remove this member from the group?")) return;
    setBusy(true);
    const supabase = createClient();
    const { error: removeError } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (removeError) setError(removeError.message);
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="bg-night-800/80 border border-night-700 rounded-2xl p-5">
      <h2 className="font-bold text-white mb-3">Members ({members.length})</h2>
      {error && <p className="text-xs text-red-300 mb-2">{error}</p>}
      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between py-2 border-b border-night-700 last:border-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-night-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  member.username.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{member.username}</p>
                <p className="text-xs text-zinc-500">
                  {member.role === "admin" ? (
                    <span className="inline-flex items-center gap-1 text-wolf-300">
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Member
                    </span>
                  )}
                </p>
              </div>
            </div>
            {isAdmin && member.role !== "admin" && (
              <button
                type="button"
                onClick={() => removeMember(member.id)}
                disabled={busy}
                className="p-1.5 rounded-lg border border-night-700 hover:border-red-500/40 text-zinc-400 hover:text-red-300 transition-colors disabled:opacity-60"
                aria-label="Remove member"
              >
                <UserMinus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}