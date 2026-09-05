import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { GroupList } from "@/components/GroupList";
import { GroupForm } from "@/components/GroupForm";
import { WolfMascot } from "@/components/WolfMascot";
import { Users } from "lucide-react";
import type { Group } from "@/types/database";

export const metadata = {
  title: "Groups — WolfTune",
  description: "Manage your music rating groups in WolfTune.",
};

async function GroupsContent() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <WolfMascot size={80} mood="listening" />
        <h2 className="mt-6 text-2xl font-bold text-white">Join the pack</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Sign in to create or join a group.
        </p>
      </div>
    );
  }

  const userId = user.id;

  // Groups the user owns (only non-secret fields — never ship secrets to the client)
  const { data: ownedGroups } = await supabase
    .from("groups")
    .select("id, name, invite_code, owner_id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  const owned = ownedGroups ?? [];

  // Groups the user is a member of (not owner) — restrict to non-secret fields
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups (id, name, invite_code, owner_id)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  // Filter out owned groups from memberships
  const memberGroups = (memberships ?? [])
    .map((m) => m.groups as Group | null)
    .filter((g): g is Group => Boolean(g && g.owner_id !== userId));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-spotify-green" />
        <h1 className="text-2xl font-bold text-white">Your Groups</h1>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Create a group</h2>
        <GroupForm />
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">
          Owner of ({owned.length})
        </h2>
        <GroupList groups={owned} isOwner={true} userId={userId} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">
          Member of ({memberGroups.length})
        </h2>
        <GroupList groups={memberGroups} isOwner={false} userId={userId} />
      </section>
    </div>
  );
}

export default async function GroupsPage() {
  return (
    <Suspense fallback={<GroupsLoading />}>
      <GroupsContent />
    </Suspense>
  );
}

function GroupsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <WolfMascot size={60} mood="listening" />
      <p className="mt-4 text-sm text-zinc-400">Loading groups...</p>
    </div>
  );
}
