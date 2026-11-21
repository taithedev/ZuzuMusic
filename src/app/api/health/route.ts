export async function GET() {
  return Response.json({ service: "ZuzuMusic", status: "ok", version: "0.1.0" });
}
