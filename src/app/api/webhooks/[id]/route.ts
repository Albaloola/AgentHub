import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const webhook = db
    .prepare(
      `SELECT w.*, a.name as agent_name
       FROM webhooks w
       LEFT JOIN agents a ON a.id = w.agent_id
       WHERE w.id = ?`,
    )
    .get(id);

  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  const recentEvents = db
    .prepare(
      `SELECT * FROM webhook_events
       WHERE webhook_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
    )
    .all(id);

  return NextResponse.json({ ...webhook, recent_events: recentEvents });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as Partial<{
    name: string;
    agent_id: string;
    system_prompt: string | null;
    body_transform: string | null;
    rate_limit_per_min: number;
    is_active: boolean;
  }>;

  const webhook = db.prepare("SELECT * FROM webhooks WHERE id = ?").get(id);
  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) { updates.push("name = ?"); values.push(body.name); }
  if (body.agent_id !== undefined) { updates.push("agent_id = ?"); values.push(body.agent_id); }
  if (body.system_prompt !== undefined) { updates.push("system_prompt = ?"); values.push(body.system_prompt); }
  if (body.body_transform !== undefined) { updates.push("body_transform = ?"); values.push(body.body_transform); }
  if (body.rate_limit_per_min !== undefined) { updates.push("rate_limit_per_min = ?"); values.push(body.rate_limit_per_min); }
  if (body.is_active !== undefined) { updates.push("is_active = ?"); values.push(body.is_active ? 1 : 0); }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE webhooks SET ${updates.join(", ")} WHERE id = ?`).run(
      ...values,
    );
  }

  const updated = db.prepare("SELECT * FROM webhooks WHERE id = ?").get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  db.prepare("DELETE FROM webhooks WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
