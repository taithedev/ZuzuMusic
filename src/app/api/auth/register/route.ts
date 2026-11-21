import { hash } from "bcryptjs";
import { database } from "@/lib/db";
import { createSession } from "@/lib/session";
import { jsonError, passwordValid, usernameValid } from "@/lib/validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!usernameValid(body.username) || !passwordValid(body.password)) {
      return jsonError("Username must be 3–24 letters, digits or underscores; password 12–200 characters.");
    }
    if (body.ageConfirmed !== true) return jsonError("Registration is currently for ages 13+.");
    const username = body.username.toLowerCase();
    const sql = database();
    const existing = await sql`SELECT id FROM zm_users WHERE username = ${username}`;
    if (existing.length) return jsonError("Username already taken.", 409);
    const passwordHash = await hash(body.password, 12);
    const rows = await sql`INSERT INTO zm_users (username, display_name, password_hash)
      VALUES (${username}, ${username}, ${passwordHash})
      RETURNING id, username, display_name, created_at`;
    await createSession(rows[0].id as string);
    return Response.json({ user: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Register failed", error);
    return jsonError("Could not register. Check server configuration.", 503);
  }
}
