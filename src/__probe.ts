import { createServerClient } from "@supabase/ssr";
import { createClient } from "@/lib/supabase/server";

interface MiniDb {
  public: {
    Tables: {
      mini: {
        Row: { id: string; name: string };
        Insert: { id?: string; name: string };
        Update: { id?: string; name?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

export async function probeMini() {
  const sb = createServerClient<MiniDb>("http://localhost", "key", {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
  const m1 = sb.from("mini").select("*");
  const m2 = sb.from("mini").insert({ name: "a" });
  const m3 = sb.from("mini").update({ name: "b" });
  return { m1, m2, m3 };
}

export async function probeOld() {
  const sb = createClient();
  const a = await sb.from("profiles").select("username, spotify_client_id, spotify_client_secret").eq("id", "x").single();
  const b = await sb.from("groups").select("*").eq("owner_id", "x");
  const g = sb.from("profiles").update({ spotify_client_id: null });
  const h = sb.from("group_members").select("group_id, groups (id, name, spotify_client_id)").eq("user_id", "x");
  const i = sb.from("groups").insert({ name: "x", invite_code: "y", owner_id: "z" });
  const p1 = await sb.from("profiles").select("spotify_client_id").single();
  const p1id: string | null = p1.data?.spotify_client_id ?? null;
  const p2 = await sb.from("profiles").select("username, spotify_client_id").single();
  const p2id: string | null = p2.data?.spotify_client_id ?? null;
  const p3 = await sb.from("profiles").select("username, spotify_client_id, spotify_client_secret").single();
  const p3id: string | null = p3.data?.spotify_client_id ?? null;
  return { a, b, g, h, i, p1id, p2id, p3id };
}
