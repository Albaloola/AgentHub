import { NextResponse } from "next/server";
import { db, toBooleans } from "@/lib/db";
import { ensureServerRuntime } from "@/lib/backend/runtime/server-runtime";
import { channelBelongsToAgent } from "@/lib/backend/services/channels";
import { computeNextRunAt, runScheduledTaskNow } from "@/lib/backend/runtime/scheduler";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureServerRuntime();
  const { id } = await params;
  const task = db
    .prepare(
      `SELECT st.*, a.name as agent_name, ch.name as channel_name
       FROM scheduled_tasks st
       LEFT JOIN agents a ON st.agent_id = a.id
       LEFT JOIN agent_channels ch ON st.channel_id = ch.id
       WHERE st.id = ?`,
    )
    .get(id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json(toBooleans(task as Record<string, unknown>));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureServerRuntime();
  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    agent_id?: string;
    channel_id?: string | null;
    prompt?: string;
    cron_expression?: string;
    is_active?: boolean;
    conversation_id?: string;
  };

  const task = db.prepare("SELECT * FROM scheduled_tasks WHERE id = ?").get(id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  const currentTask = task as {
    agent_id: string;
    channel_id?: string | null;
    cron_expression?: string | null;
    is_active: boolean;
  };
  const nextAgentId = body.agent_id ?? currentTask.agent_id;
  const nextChannelId =
    body.channel_id !== undefined ? body.channel_id : (currentTask.channel_id ?? null);
  const nextCronExpression =
    body.cron_expression !== undefined ? body.cron_expression : (currentTask.cron_expression ?? null);
  const nextIsActive = body.is_active !== undefined ? body.is_active : Boolean(currentTask.is_active);

  if (!channelBelongsToAgent(nextChannelId, nextAgentId)) {
    return NextResponse.json(
      { error: "Selected channel does not belong to the agent" },
      { status: 400 },
    );
  }
  if (nextIsActive && nextCronExpression && !computeNextRunAt(nextCronExpression)) {
    return NextResponse.json({ error: "Invalid cron_expression" }, { status: 400 });
  }

  if (body.name !== undefined) { updates.push("name = ?"); values.push(body.name); }
  if (body.agent_id !== undefined) { updates.push("agent_id = ?"); values.push(body.agent_id); }
  if (body.channel_id !== undefined) { updates.push("channel_id = ?"); values.push(body.channel_id); }
  if (body.prompt !== undefined) { updates.push("prompt = ?"); values.push(body.prompt); }
  if (body.cron_expression !== undefined) { updates.push("cron_expression = ?"); values.push(body.cron_expression); }
  if (body.is_active !== undefined) { updates.push("is_active = ?"); values.push(body.is_active ? 1 : 0); }
  if (body.conversation_id !== undefined) { updates.push("conversation_id = ?"); values.push(body.conversation_id); }
  if (body.cron_expression !== undefined || body.is_active !== undefined) {
    updates.push("next_run_at = ?");
    values.push(nextIsActive ? computeNextRunAt(nextCronExpression) : null);
  }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE scheduled_tasks SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }

  const updated = db
    .prepare(
      `SELECT st.*, a.name as agent_name, ch.name as channel_name
       FROM scheduled_tasks st
       LEFT JOIN agents a ON st.agent_id = a.id
       LEFT JOIN agent_channels ch ON st.channel_id = ch.id
       WHERE st.id = ?`,
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
  const task = db.prepare("SELECT * FROM scheduled_tasks WHERE id = ?").get(id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  db.prepare("DELETE FROM scheduled_tasks WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureServerRuntime();
  const { id } = await params;
  const body = (await request.json()) as { action: string };

  if (body.action !== "run") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const task = db.prepare("SELECT * FROM scheduled_tasks WHERE id = ?").get(id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  try {
    const result = await runScheduledTaskNow(id, "manual");
    const updated = db
      .prepare(
        `SELECT st.*, a.name as agent_name, ch.name as channel_name
         FROM scheduled_tasks st
         LEFT JOIN agents a ON st.agent_id = a.id
         LEFT JOIN agent_channels ch ON st.channel_id = ch.id
         WHERE st.id = ?`,
      )
      .get(id) as Record<string, unknown> | undefined;

    return NextResponse.json({
      task: updated ? toBooleans(updated) : null,
      execution: result.result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Task run failed";
    return NextResponse.json(
      { error: message },
      { status: message === "Task is already running" ? 409 : 500 },
    );
  }
}
