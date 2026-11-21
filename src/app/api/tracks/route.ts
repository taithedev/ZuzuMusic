import { database } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { jsonError } from "@/lib/validation";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const mine = new URL(request.url).searchParams.get("mine") === "1";
    const sql = database();
    if (mine) {
      const user = await currentUser();
      if (!user) return jsonError("Sign in to see your uploads.", 401);
      const rows = await sql`SELECT t.id, t.creator_id, t.title, t.artist_name, t.duration_seconds,
        t.mime_type, t.status, t.created_at, u.username AS creator_username
        FROM zm_tracks t JOIN zm_users u ON u.id = t.creator_id
        WHERE t.creator_id = ${user.id} ORDER BY t.created_at DESC LIMIT 100`;
      return Response.json({ tracks: rows }, { headers: { "Cache-Control": "no-store" } });
    }
    const rows = await sql`SELECT t.id, t.creator_id, t.title, t.artist_name, t.duration_seconds,
      t.mime_type, t.status, t.created_at, u.username AS creator_username
      FROM zm_tracks t JOIN zm_users u ON u.id = t.creator_id
      WHERE t.status = 'approved' ORDER BY t.created_at DESC LIMIT 100`;
    return Response.json({ tracks: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Track list failed", error);
    return jsonError("Creator catalog unavailable until Neon is configured.", 503);
  }
}
