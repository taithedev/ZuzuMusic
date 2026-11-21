import { currentUser, isAdmin } from "@/lib/session";
export async function GET() {
  const user = await currentUser();
  return Response.json({ user, admin: !!user && isAdmin(user) }, {
    headers: { "Cache-Control": "no-store" },
  });
}
