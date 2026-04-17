import { NextResponse } from "next/server";
import { db, toBooleans } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { ensureServerRuntime } from "@/lib/backend/runtime/server-runtime";
import { channelBelongsToAgent } from "@/lib/backend/services/channels";
import { computeNextRunAt } from "@/lib/backend/runtime/scheduler";

export async function GET() {
  ensureServerRuntime();
  const tasks = db
    .prepare(
      `SELECT st.*, a.name as agent_name, ch.name as channel_name
       FROM scheduled_tasks st
       LEFT JOIN agents a ON st.agent_id = a.id
       LEFT JOIN agent_channels ch ON st.channel_id = ch.id
       ORDER BY st.created_at DESC`,
    )
    .all();
  return NextResponse.json(tasks.map((task: unknown) => toBooleans(task as Record<string, unknown>)));
}

export async function POST(request: Request) {
  ensureServerRuntime();
  const body = (await request.json()) as {
    name: string;
    agent_id: string;
    channel_id?: string | null;
    prompt: string;
    cron_expression?: string;
    conversation_id?: string;
    is_active?: boolean;
  };

  if (!body.name || !body.agent_id || !body.prompt) {
    return NextResponse.json(
      { error: "name, agent_id, and prompt are required" },
      { status: 400 },
    );
  }

  // Verify agent exists
  const agent = db.prepare("SELECT id FROM agents WHERE id = ?").get(body.agent_id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  if (!channelBelongsToAgent(body.channel_id, body.agent_id)) {
    return NextResponse.json(
      { error: "Selected channel does not belong to the agent" },
      { status: 400 },
    );
  }

  const id = uuid();
  const isActive = body.is_active ?? true;
  const nextRunAt = isActive ? computeNextRunAt(body.cron_expression ?? null) : null;
  if (isActive && body.cron_expression && !nextRunAt) {
    return NextResponse.json({ error: "Invalid cron_expression" }, { status: 400 });
  }
  db.prepare(
    `INSERT INTO scheduled_tasks (
      id, name, agent_id, channel_id, prompt, cron_expression, conversation_id, is_active, next_run_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.name,
    body.agent_id,
    body.channel_id ?? null,
    body.prompt,
    body.cron_expression ?? null,
    body.conversation_id ?? null,
    isActive ? 1 : 0,
    nextRunAt,
  );

  const task = db
    .prepare(
      `SELECT st.*, a.name as agent_name, ch.name as channel_name
       FROM scheduled_tasks st
       LEFT JOIN agents a ON st.agent_id = a.id
       LEFT JOIN agent_channels ch ON st.channel_id = ch.id
       WHERE st.id = ?`,
    )
    .get(id) as Record<string, unknown>;
  return NextResponse.json(toBooleans(task), { status: 201 });
}
