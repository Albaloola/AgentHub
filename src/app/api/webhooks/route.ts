import { NextResponse } from "next/server";
import { db, toBooleans } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { channelBelongsToAgent } from "@/lib/backend/services/channels";
import { ensureServerRuntime } from "@/lib/backend/runtime/server-runtime";

export async function GET() {
  ensureServerRuntime();
  const webhooks = db
    .prepare(
      `SELECT w.*, a.name as agent_name, c.name as channel_name, c.slug as channel_slug
       FROM webhooks w
       LEFT JOIN agents a ON a.id = w.agent_id
       LEFT JOIN agent_channels c ON c.id = w.channel_id
       ORDER BY w.created_at DESC`,
    )
    .all();

  return NextResponse.json(webhooks.map((webhook: unknown) => toBooleans(webhook as Record<string, unknown>)));
}

export async function POST(request: Request) {
  ensureServerRuntime();
  const body = (await request.json()) as {
    name: string;
    agent_id: string;
    channel_id?: string;
    system_prompt?: string;
    body_transform?: string;
    rate_limit_per_min?: number;
  };

  if (!body.name || !body.agent_id) {
    return NextResponse.json(
      { error: "name and agent_id are required" },
      { status: 400 },
    );
  }

  const agent = db.prepare("SELECT id FROM agents WHERE id = ?").get(body.agent_id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  if (body.channel_id && !channelBelongsToAgent(body.channel_id, body.agent_id)) {
    return NextResponse.json({ error: "channel_id belongs to a different agent" }, { status: 400 });
  }

  const id = uuid();
  const secret = uuid();

  db.prepare(
    `INSERT INTO webhooks (id, name, secret, agent_id, channel_id, system_prompt, body_transform, rate_limit_per_min)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.name,
    secret,
    body.agent_id,
    body.channel_id ?? null,
    body.system_prompt ?? null,
    body.body_transform ?? null,
    body.rate_limit_per_min ?? 10,
  );

  const webhook = db
    .prepare(
      `SELECT w.*, a.name as agent_name, c.name as channel_name, c.slug as channel_slug
       FROM webhooks w
       LEFT JOIN agents a ON a.id = w.agent_id
       LEFT JOIN agent_channels c ON c.id = w.channel_id
       WHERE w.id = ?`,
    )
    .get(id);
  return NextResponse.json(toBooleans(webhook as Record<string, unknown>), { status: 201 });
}
