import { currentUser } from "@/lib/session";
import { database } from "@/lib/db";
import { signStream } from "@/lib/storage";
import { jsonError } from "@/lib/validation";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const sql = database();
    const rows = await sql`SELECT creator_id, status, storage_key FROM zm_tracks WHERE id = ${id} LIMIT 1`;
    const track = rows[0];
    if (!track) return jsonError("Track not found.", 404);
    if (track.status !== "approved") {
      const user = await currentUser();
      if (!user || user.id !== track.creator_id) return jsonError("Track unavailable.", 403);
    }
    return Response.json({ url: await signStream(track.storage_key as string) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Stream signing failed", error);
    return jsonError("Could not play this track.", 503);
  }
}
