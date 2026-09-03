import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const CLIENT_ID_RE = /^[A-Za-z0-9]{32}$/;
const CLIENT_SECRET_RE = /^[A-Za-z0-9]{32}$/;

/**
 * Saves or clears Spotify API credentials on a group.
 * Only the group owner or an admin can update credentials.
 */
export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    groupId?: string;
    clientId?: string;
    clientSecret?: string;
  } | null;

  if (!body?.groupId) {
    return NextResponse.json({ error: "groupId is required." }, { status: 400 });
  }

  const groupId = body.groupId;
  const clientId = (body.clientId ?? "").trim();
  const clientSecret = (body.clientSecret ?? "").trim();

  // Verify the user is owner or admin
  const { data: group } = await supabase
    .from("groups")
    .select("owner_id")
    .eq("id", groupId)
    .single();

  if (!group) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const isOwner = session.user.id === group.owner_id;
  let isAdmin = isOwner;

  if (!isOwner) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", session.user.id)
      .single();
    isAdmin = membership?.role === "admin";
  }

  if (!isAdmin) {
    return NextResponse.json(
      { error: "Only group owners and admins can update credentials." },
      { status: 403 }
    );
  }

  // Clearing: both empty
  if (!clientId && !clientSecret) {
    const { error } = await supabase
      .from("groups")
      .update({ spotify_client_id: null, spotify_client_secret: null })
      .eq("id", groupId);

    if (error) {
      return NextResponse.json({ error: "Failed to clear credentials." }, { status: 500 });
    }

    revalidatePath("/groups");
    revalidatePath(`/groups/${groupId}`);
    return NextResponse.json({ message: "Credentials cleared." });
  }

  // Partial: reject
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Both Client ID and Client Secret are required." },
      { status: 400 }
    );
  }

  // Validate format
  if (!CLIENT_ID_RE.test(clientId)) {
    return NextResponse.json(
      { error: "Invalid Client ID format. Expected 32 alphanumeric characters." },
      { status: 400 }
    );
  }
  if (!CLIENT_SECRET_RE.test(clientSecret)) {
    return NextResponse.json(
      { error: "Invalid Client Secret format. Expected 32 alphanumeric characters." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("groups")
    .update({ spotify_client_id: clientId, spotify_client_secret: clientSecret })
    .eq("id", groupId);

  if (error) {
    return NextResponse.json({ error: "Failed to save credentials." }, { status: 500 });
  }

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return NextResponse.json({ message: "Credentials saved successfully." });
}
