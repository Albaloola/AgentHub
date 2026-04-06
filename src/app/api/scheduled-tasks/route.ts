import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const tasks = db
    .prepare(
      `SELECT st.*, a.name as agent_name
       FROM scheduled_tasks st
       LEFT JOIN agents a ON st.agent_id = a.id
       ORDER BY st.created_at DESC`,
    )
    .all();
  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    agent_id: string;
    prompt: string;
    cron_expression?: string;
    conversation_id?: string;
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

  const id = uuid();
  db.prepare(
    `INSERT INTO scheduled_tasks (id, name, agent_id, prompt, cron_expression, conversation_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.name,
    body.agent_id,
    body.prompt,
    body.cron_expression ?? null,
    body.conversation_id ?? null,
  );

  const task = db
    .prepare(
      `SELECT st.*, a.name as agent_name
       FROM scheduled_tasks st
       LEFT JOIN agents a ON st.agent_id = a.id
       WHERE st.id = ?`,
    )
    .get(id);
  return NextResponse.json(task, { status: 201 });
}
