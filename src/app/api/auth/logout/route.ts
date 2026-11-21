import { removeSession } from "@/lib/session";
export async function POST() {
  await removeSession();
  return Response.json({ ok: true });
}
