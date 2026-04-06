import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const integrations = db
    .prepare(
      `SELECT i.*, a.name AS agent_name
       FROM integrations i
       LEFT JOIN agents a ON a.id = i.agent_id
       ORDER BY i.created_at DESC`,
    )
    .all();
  return NextResponse.json(integrations);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    type: string;
    name: string;
    config?: string;
    agent_id?: string;
  };

  if (!body.type || !body.name) {
    return NextResponse.json(
      { error: "type and name are required" },
      { status: 400 },
    );
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO integrations (id, type, name, config, agent_id)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, body.type, body.name, body.config ?? "{}", body.agent_id ?? null);

  const integration = db
    .prepare("SELECT * FROM integrations WHERE id = ?")
    .get(id);
  return NextResponse.json(integration, { status: 201 });
}
