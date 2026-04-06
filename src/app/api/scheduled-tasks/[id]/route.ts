import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const task = db
    .prepare(
      `SELECT st.*, a.name as agent_name
       FROM scheduled_tasks st
       LEFT JOIN agents a ON st.agent_id = a.id
       WHERE st.id = ?`,
    )
    .get(id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json(task);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
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

  if (body.name !== undefined) { updates.push("name = ?"); values.push(body.name); }
  if (body.prompt !== undefined) { updates.push("prompt = ?"); values.push(body.prompt); }
  if (body.cron_expression !== undefined) { updates.push("cron_expression = ?"); values.push(body.cron_expression); }
  if (body.is_active !== undefined) { updates.push("is_active = ?"); values.push(body.is_active ? 1 : 0); }
  if (body.conversation_id !== undefined) { updates.push("conversation_id = ?"); values.push(body.conversation_id); }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE scheduled_tasks SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }

  const updated = db
    .prepare(
      `SELECT st.*, a.name as agent_name
       FROM scheduled_tasks st
       LEFT JOIN agents a ON st.agent_id = a.id
       WHERE st.id = ?`,
    )
    .get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const { id } = await params;
  const body = (await request.json()) as { action: string };

  if (body.action !== "run") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const task = db.prepare("SELECT * FROM scheduled_tasks WHERE id = ?").get(id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Mark as manually triggered
  db.prepare(
    "UPDATE scheduled_tasks SET last_run_at = datetime('now'), run_count = run_count + 1, last_status = 'triggered' WHERE id = ?",
  ).run(id);

  const updated = db
    .prepare(
      `SELECT st.*, a.name as agent_name
       FROM scheduled_tasks st
       LEFT JOIN agents a ON st.agent_id = a.id
       WHERE st.id = ?`,
    )
    .get(id);
  return NextResponse.json(updated);
}
