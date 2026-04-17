import { NextResponse } from "next/server";
import { db, toBooleans } from "@/lib/db";
import { channelBelongsToAgent } from "@/lib/backend/services/channels";
import { ensureServerRuntime } from "@/lib/backend/runtime/server-runtime";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureServerRuntime();
  const { id } = await params;

  const webhook = db
    .prepare(
      `SELECT w.*, a.name as agent_name, c.name as channel_name, c.slug as channel_slug
       FROM webhooks w
       LEFT JOIN agents a ON a.id = w.agent_id
       LEFT JOIN agent_channels c ON c.id = w.channel_id
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

  return NextResponse.json({
    ...toBooleans(webhook as Record<string, unknown>),
    recent_events: recentEvents,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureServerRuntime();
  const { id } = await params;
  const body = (await request.json()) as Partial<{
    name: string;
    agent_id: string;
    channel_id: string | null;
    system_prompt: string | null;
    body_transform: string | null;
    rate_limit_per_min: number;
    is_active: boolean;
  }>;

  const webhook = db.prepare("SELECT * FROM webhooks WHERE id = ?").get(id);
  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  const currentWebhook = webhook as { agent_id: string; channel_id?: string | null };
  const nextAgentId = body.agent_id ?? currentWebhook.agent_id;
  const nextChannelId = body.channel_id !== undefined ? body.channel_id : (currentWebhook.channel_id ?? null);
  if (!channelBelongsToAgent(nextChannelId, nextAgentId)) {
    return NextResponse.json({ error: "channel_id belongs to a different agent" }, { status: 400 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) { updates.push("name = ?"); values.push(body.name); }
  if (body.agent_id !== undefined) { updates.push("agent_id = ?"); values.push(body.agent_id); }
  if (body.channel_id !== undefined) { updates.push("channel_id = ?"); values.push(body.channel_id); }
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

  const updated = db
    .prepare(
      `SELECT w.*, a.name as agent_name, c.name as channel_name, c.slug as channel_slug
       FROM webhooks w
       LEFT JOIN agents a ON a.id = w.agent_id
       LEFT JOIN agent_channels c ON c.id = w.channel_id
       WHERE w.id = ?`,
    )
    .get(id);
  return NextResponse.json(toBooleans(updated as Record<string, unknown>));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureServerRuntime();
  const { id } = await params;
  const result = db.prepare("DELETE FROM webhooks WHERE id = ?").run(id);
  if (result.changes === 0) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
