export type User = { id: string; username: string; display_name: string; created_at?: string };
export type CloudTrack = {
  id: string; creator_id: string; creator_username?: string;
  title: string; artist_name: string; duration_seconds: number | null;
  mime_type: string; status: "draft" | "pending" | "approved" | "rejected"; created_at: string;
};
export type LocalTrack = {
  id: string; title: string; artist: string; duration: number | null;
  fileName: string; mimeType: string; source: "local";
};
export type PlayerTrack = {
  id: string; title: string; artist: string; duration: number | null;
  source: "local" | "creator"; fileName?: string; cloudId?: string;
};
