import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { database } from "@/lib/db";
import type { User } from "@/lib/types";

const COOKIE = "zuzu_session";
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET needs at least 32 characters");
  return new TextEncoder().encode(value);
}
export async function createSession(id: string) {
  const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" })
    .setSubject(id).setIssuedAt().setExpirationTime("7d").sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 7 * 24 * 3600,
  });
}
export async function removeSession() {
  (await cookies()).delete(COOKIE);
}
export async function currentUser(): Promise<User | null> {
  try {
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    const sql = database();
    const rows = await sql`SELECT id, username, display_name, created_at
      FROM zm_users WHERE id = ${payload.sub} LIMIT 1`;
    return (rows[0] as User | undefined) ?? null;
  } catch {
    return null;
  }
}
export function isAdmin(user: User) {
  return (process.env.ADMIN_USER_IDS || "").split(",").map((s) => s.trim()).filter(Boolean).includes(user.id);
}
