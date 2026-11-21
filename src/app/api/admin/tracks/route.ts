import { currentUser, isAdmin } from "@/lib/session";
import { database } from "@/lib/db";
import { jsonError } from "@/lib/validation";
export const runtime = "nodejs";
export async function GET() {
  const user = await currentUser();
  if (!user || !isAdmin(user)) return jsonError("Not authorized.", 403);
  try {
    const sql = database();
    const rows = await sql`SELECT t.id, t.creator_id, t.title, t.artist_name, t.mime_type,
      t.duration_seconds, t.status, t.created_at, u.username AS creator_username
      FROM zm_tracks t JOIN zm_users u ON u.id = t.creator_id
      WHERE t.status = 'pending' ORDER BY t.created_at ASC LIMIT 100`;
    return Response.json({ tracks: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Could not load moderation queue.", 503);
  }
}
export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user || !isAdmin(user)) return jsonError("Not authorized.", 403);
  try {
    const body = await request.json();
    if (typeof body.trackId !== "string" || !["approved", "rejected"].includes(body.status)) {
      return jsonError("Invalid review action.");
    }
    const sql = database();
    const rows = await sql`UPDATE zm_tracks SET status = ${body.status}, reviewed_at = now()
      WHERE id = ${body.trackId} AND status = 'pending' RETURNING id`;
    if (!rows.length) return jsonError("Pending track not found.", 404);
    return Response.json({ ok: true });
  } catch {
    return jsonError("Could not review track.", 503);
  }
}
