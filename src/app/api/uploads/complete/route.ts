import { currentUser } from "@/lib/session";
import { database } from "@/lib/db";
import { inspectUpload } from "@/lib/storage";
import { ALLOWED_MIME, MAX_AUDIO_BYTES, jsonError } from "@/lib/validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return jsonError("Sign in first.", 401);
    const body = await request.json();
    if (typeof body.trackId !== "string") return jsonError("Missing track ID.");
    const sql = database();
    const rows = await sql`SELECT id, storage_key, mime_type, expected_bytes FROM zm_tracks
      WHERE id = ${body.trackId} AND creator_id = ${user.id} AND status = 'draft' LIMIT 1`;
    const track = rows[0];
    if (!track) return jsonError("Draft upload not found.", 404);
    const head = await inspectUpload(track.storage_key as string);
    const size = Number(head.ContentLength ?? 0);
    const mime = (head.ContentType || "").split(";")[0];
    if (size <= 0 || size > MAX_AUDIO_BYTES || size !== Number(track.expected_bytes) ||
        !ALLOWED_MIME.includes(mime) || mime !== track.mime_type) {
      return jsonError("Uploaded file failed type or size verification.");
    }
    await sql`UPDATE zm_tracks SET status = 'pending', actual_bytes = ${size}
      WHERE id = ${body.trackId} AND creator_id = ${user.id} AND status = 'draft'`;
    return Response.json({ ok: true, status: "pending" });
  } catch (error) {
    console.error("Upload completion failed", error);
    return jsonError("Upload could not be verified.", 503);
  }
}
