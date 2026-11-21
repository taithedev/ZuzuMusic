import { randomUUID } from "node:crypto";
import { currentUser } from "@/lib/session";
import { database } from "@/lib/db";
import { signUpload } from "@/lib/storage";
import { fileValid, jsonError, titleValid } from "@/lib/validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return jsonError("Sign in to release original music.", 401);
    const body = await request.json();
    if (!titleValid(body.title) || !fileValid(body.mimeType, body.fileSize)) {
      return jsonError("Enter a title and use MP3, WAV, FLAC, OGG or M4A, up to 25 MB.");
    }
    if (body.rightsConfirmed !== true) {
      return jsonError("Confirm you own or have permission to distribute this recording.");
    }
    const sql = database();
    const count = await sql`SELECT count(*)::int AS count FROM zm_tracks WHERE creator_id = ${user.id}
      AND created_at > now() - interval '24 hours'`;
    if (Number(count[0].count) >= 10) return jsonError("Daily upload limit reached (10 tracks).", 429);
    const pending = await sql`SELECT count(*)::int AS count FROM zm_tracks WHERE creator_id = ${user.id}
      AND status = 'draft'`;
    if (Number(pending[0].count) >= 3) return jsonError("Finish existing uploads first.", 429);
    const id = randomUUID();
    const storageKey = "creator-audio/" + user.id + "/" + id;
    const rows = await sql`INSERT INTO zm_tracks
      (id, creator_id, title, artist_name, storage_key, mime_type, expected_bytes, rights_confirmed)
      VALUES (${id}, ${user.id}, ${body.title.trim()}, ${user.display_name}, ${storageKey},
      ${body.mimeType}, ${body.fileSize}, true) RETURNING id`;
    try {
      const uploadUrl = await signUpload(storageKey, body.mimeType);
      return Response.json({ trackId: rows[0].id, uploadUrl }, { status: 201 });
    } catch (error) {
      await sql`DELETE FROM zm_tracks WHERE id = ${id} AND status = 'draft'`;
      throw error;
    }
  } catch (error) {
    console.error("Upload init failed", error);
    return jsonError("Could not prepare upload. Check Neon and R2 settings.", 503);
  }
}
