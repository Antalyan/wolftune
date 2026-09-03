import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WolfMascot } from "@/components/WolfMascot";
import { GroupCredentialsForm } from "@/components/GroupCredentialsForm";
import { Users } from "lucide-react";
import Link from "next/link";
import { CopyInviteCodeButton } from "@/components/CopyInviteCodeButton";

interface GroupDetailPageProps {
  params: { id: string };
}

export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const { id } = params;
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <WolfMascot size={80} mood="listening" />
        <h2 className="mt-6 text-2xl font-bold text-white">Sign in to view groups</h2>
      </div>
    );
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("*")
    .eq("id", id)
    .single();

  if (groupError || !group) notFound();

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", session.user.id)
    .single();

  const isOwner = group.owner_id === session.user.id;
  const isMember = Boolean(membership) || isOwner;

  if (!isMember) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <WolfMascot size={80} mood="cool" />
        <h2 className="mt-6 text-2xl font-bold text-white">Access denied</h2>
        <p className="mt-2 text-sm text-zinc-400">
          You&apos;re not a member of this group. Use an invite code to join.
        </p>
        <Link
          href="/groups"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
        >
          Back to groups
        </Link>
      </div>
    );
  }

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, role, profiles (*)")
    .eq("group_id", id);

  const memberProfiles = (members ?? [])
    .map((m) => m.profiles)
    .filter(Boolean) as Array<{
      id: string;
      username: string;
      avatar_url: string | null;
    }>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-spotify-green" />
          <h1 className="text-2xl font-bold text-white">{group.name}</h1>
        </div>
        <Link
          href="/groups"
          className="text-xs text-zinc-400 hover:text-white transition-colors"
        >
          ← Back to all groups
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-night-800/60 border border-night-700 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">Invite code</h2>
          <div className="flex items-center gap-2">
            <code className="font-mono text-lg text-white bg-night-900 px-3 py-1.5 rounded-lg">
              {group.invite_code}
            </code>
            <CopyInviteCodeButton inviteCode={group.invite_code} />
          </div>
        </div>

                <div className="bg-night-800/60 border border-night-700 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            Group Spotify credentials
          </h2>
          {!group.spotify_client_id ? (
            <p className="text-xs text-zinc-500">
              No shared credentials configured. {isOwner && "Add them using the form below so all members can search and play."}
            </p>
          ) : (
            <p className="text-xs text-zinc-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              Credentials saved (Client ID ready).
            </p>
          )}
          {isOwner && group && <GroupCredentialsForm group={group} />}
        </div>
      </div>

      <div className="bg-night-800/60 border border-night-700 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">
          Members ({memberProfiles.length})
        </h2>
        <div className="space-y-2">
          {memberProfiles.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-night-700 overflow-hidden shrink-0">
                {profile.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <span className="text-sm text-white">{profile.username}</span>
              {profile.id === session.user.id && (
                <span className="text-[10px] bg-night-700 text-zinc-400 px-1.5 py-0.5 rounded-full ml-auto">
                  you
                </span>
              )}
              {profile.id === group.owner_id && (
                <span className="text-[10px] bg-blue-600/20 text-blue-300 px-1.5 py-0.5 rounded-full">
                  owner
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
