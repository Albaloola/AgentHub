import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");
  const agentId = searchParams.get("agent_id");

  let sql = "SELECT * FROM guardrail_rules WHERE 1=1";
  const params: unknown[] = [];

  if (scope) {
    sql += " AND scope = ?";
    params.push(scope);
  }

  if (agentId) {
    sql += " AND agent_id = ?";
    params.push(agentId);
  }

  sql += " ORDER BY created_at DESC";

  const rules = db.prepare(sql).all(...params);
  return NextResponse.json(rules);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    type: string;
    pattern: string;
    action: string;
    scope?: string;
    agent_id?: string;
    description?: string;
  };

  if (!body.name || !body.type || !body.pattern || !body.action) {
    return NextResponse.json(
      { error: "name, type, pattern, and action are required" },
      { status: 400 },
    );
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO guardrail_rules (id, name, description, type, pattern, action, scope, agent_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.name,
    body.description ?? null,
    body.type,
    body.pattern,
    body.action,
    body.scope ?? "global",
    body.agent_id ?? null,
  );

  const rule = db.prepare("SELECT * FROM guardrail_rules WHERE id = ?").get(id);
  return NextResponse.json(rule, { status: 201 });
}
