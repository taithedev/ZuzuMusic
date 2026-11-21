import { compare } from "bcryptjs";
import { database } from "@/lib/db";
import { createSession } from "@/lib/session";
import { jsonError } from "@/lib/validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!username || !password) return jsonError("Provide username and password.");
    const sql = database();
    const rows = await sql`SELECT id, username, display_name, password_hash, created_at
      FROM zm_users WHERE username = ${username} LIMIT 1`;
    const user = rows[0];
    if (!user || !(await compare(password, user.password_hash as string))) {
      return jsonError("Incorrect username or password.", 401);
    }
    await createSession(user.id as string);
    return Response.json({ user: {
      id: user.id, username: user.username, display_name: user.display_name, created_at: user.created_at,
    } });
  } catch (error) {
    console.error("Login failed", error);
    return jsonError("Could not sign in. Check server configuration.", 503);
  }
}
