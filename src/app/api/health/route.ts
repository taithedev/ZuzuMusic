import { database } from "@/lib/db";

// Public readiness check. Do not expose SQL errors or DATABASE_URL in HTTP responses.
export const dynamic = "force-dynamic";
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return Response.json({ service: "ZuzuMusic", status: "degraded", database: "not_configured", version: "0.1.0" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const sql = database();
    const rows = await sql`SELECT 1 AS healthy`;
    if (rows[0]?.healthy !== 1) throw new Error("Unexpected database check");
    return Response.json({ service: "ZuzuMusic", status: "ok", database: "connected", version: "0.1.0" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ service: "ZuzuMusic", status: "degraded", database: "unavailable", version: "0.1.0" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
