import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const rules = db
    .prepare("SELECT * FROM policy_rules ORDER BY created_at DESC")
    .all();
  return NextResponse.json(rules);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    type: string;
    rule_json: string;
    severity?: string;
    scope?: string;
    agent_id?: string;
    description?: string;
  };

  if (!body.name || !body.type || !body.rule_json) {
    return NextResponse.json(
      { error: "name, type, and rule_json are required" },
      { status: 400 },
    );
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO policy_rules (id, name, description, type, rule_json, severity, scope, agent_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.name,
    body.description ?? null,
    body.type,
    body.rule_json,
    body.severity ?? "block",
    body.scope ?? "global",
    body.agent_id ?? null,
  );

  const rule = db.prepare("SELECT * FROM policy_rules WHERE id = ?").get(id);
  return NextResponse.json(rule, { status: 201 });
}
