/**
 * Supabase database types — hand-maintained to match the migrations in
 * `supabase/migrations/` (Phase 2 + Phase 3 + groups/credentials).
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          bio: string | null;
          spotify_client_id: string | null;
          spotify_client_secret: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          bio?: string | null;
          spotify_client_id?: string | null;
          spotify_client_secret?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          bio?: string | null;
          spotify_client_id?: string | null;
          spotify_client_secret?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          owner_id: string;
          spotify_client_id: string | null;
          spotify_client_secret: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code: string;
          owner_id: string;
          spotify_client_id?: string | null;
          spotify_client_secret?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          owner_id?: string;
          spotify_client_id?: string | null;
          spotify_client_secret?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "groups_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          role: "admin" | "member";
          joined_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          role?: "admin" | "member";
          joined_at?: string;
        };
        Update: {
          group_id?: string;
          user_id?: string;
          role?: "admin" | "member";
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      music_albums: {
        Row: {
          spotify_id: string;
          name: string;
          artist_name: string;
          cover_url: string | null;
          release_date: string | null;
          total_tracks: number;
          created_at: string;
        };
        Insert: {
          spotify_id: string;
          name: string;
          artist_name: string;
          cover_url?: string | null;
          release_date?: string | null;
          total_tracks?: number;
          created_at?: string;
        };
        Update: {
          spotify_id?: string;
          name?: string;
          artist_name?: string;
          cover_url?: string | null;
          release_date?: string | null;
          total_tracks?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      music_playlists: {
        Row: {
          spotify_id: string;
          name: string;
          owner_name: string | null;
          cover_url: string | null;
          total_tracks: number;
          created_at: string;
        };
        Insert: {
          spotify_id: string;
          name: string;
          owner_name?: string | null;
          cover_url?: string | null;
          total_tracks?: number;
          created_at?: string;
        };
        Update: {
          spotify_id?: string;
          name?: string;
          owner_name?: string | null;
          cover_url?: string | null;
          total_tracks?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      music_tracks: {
        Row: {
          spotify_id: string;
          name: string;
          artist_name: string;
          album_spotify_id: string | null;
          album_name: string | null;
          cover_url: string | null;
          duration_ms: number | null;
          track_number: number | null;
          created_at: string;
        };
        Insert: {
          spotify_id: string;
          name: string;
          artist_name: string;
          album_spotify_id?: string | null;
          album_name?: string | null;
          cover_url?: string | null;
          duration_ms?: number | null;
          track_number?: number | null;
          created_at?: string;
        };
        Update: {
          spotify_id?: string;
          name?: string;
          artist_name?: string;
          album_spotify_id?: string | null;
          album_name?: string | null;
          cover_url?: string | null;
          duration_ms?: number | null;
          track_number?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "music_tracks_album_spotify_id_fkey";
            columns: ["album_spotify_id"];
            isOneToOne: false;
            referencedRelation: "music_albums";
            referencedColumns: ["spotify_id"];
          }
        ];
      };
      track_ratings: {
        Row: {
          id: string;
          user_id: string;
          track_spotify_id: string;
          score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          track_spotify_id: string;
          score: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          track_spotify_id?: string;
          score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "track_ratings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "track_ratings_track_spotify_id_fkey";
            columns: ["track_spotify_id"];
            isOneToOne: false;
            referencedRelation: "music_tracks";
            referencedColumns: ["spotify_id"];
          }
        ];
      };
      album_ratings: {
        Row: {
          id: string;
          user_id: string;
          album_spotify_id: string;
          subjective_score: number;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          album_spotify_id: string;
          subjective_score: number;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          album_spotify_id?: string;
          subjective_score?: number;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "album_ratings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "album_ratings_album_spotify_id_fkey";
            columns: ["album_spotify_id"];
            isOneToOne: false;
            referencedRelation: "music_albums";
            referencedColumns: ["spotify_id"];
          }
        ];
      };
      playlist_ratings: {
        Row: {
          id: string;
          user_id: string;
          playlist_spotify_id: string;
          subjective_score: number;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          playlist_spotify_id: string;
          subjective_score: number;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          playlist_spotify_id?: string;
          subjective_score?: number;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "playlist_ratings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "playlist_ratings_playlist_spotify_id_fkey";
            columns: ["playlist_spotify_id"];
            isOneToOne: false;
            referencedRelation: "music_playlists";
            referencedColumns: ["spotify_id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type GroupMember = Database["public"]["Tables"]["group_members"]["Row"];
export type MusicAlbum = Database["public"]["Tables"]["music_albums"]["Row"];
export type MusicPlaylist = Database["public"]["Tables"]["music_playlists"]["Row"];
export type MusicTrack = Database["public"]["Tables"]["music_tracks"]["Row"];
export type TrackRating = Database["public"]["Tables"]["track_ratings"]["Row"];
export type AlbumRating = Database["public"]["Tables"]["album_ratings"]["Row"];
export type PlaylistRating = Database["public"]["Tables"]["playlist_ratings"]["Row"];
