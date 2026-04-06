import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  const webhook = db.prepare("SELECT id FROM webhooks WHERE id = ?").get(id);
  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  const events = db
    .prepare(
      `SELECT * FROM webhook_events
       WHERE webhook_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(id, limit, offset);

  const total = db
    .prepare("SELECT COUNT(*) as count FROM webhook_events WHERE webhook_id = ?")
    .get(id) as { count: number };

  return NextResponse.json({ events, total: total.count, limit, offset });
}
