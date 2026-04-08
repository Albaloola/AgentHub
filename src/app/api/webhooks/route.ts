import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const webhooks = db
    .prepare(
      `SELECT w.*, a.name as agent_name
       FROM webhooks w
       LEFT JOIN agents a ON a.id = w.agent_id
       ORDER BY w.created_at DESC`,
    )
    .all();

  return NextResponse.json(webhooks);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    agent_id: string;
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

  const id = uuid();
  const secret = uuid();

  db.prepare(
    `INSERT INTO webhooks (id, name, secret, agent_id, system_prompt, body_transform, rate_limit_per_min)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.name,
    secret,
    body.agent_id,
    body.system_prompt ?? null,
    body.body_transform ?? null,
    body.rate_limit_per_min ?? 10,
  );

  const webhook = db.prepare("SELECT * FROM webhooks WHERE id = ?").get(id);
  return NextResponse.json(webhook, { status: 201 });
}
