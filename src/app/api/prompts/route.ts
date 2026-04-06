import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agent_id");

  let sql = `
    SELECT pv.*, a.name as agent_name
    FROM prompt_versions pv
    LEFT JOIN agents a ON a.id = pv.agent_id
    WHERE 1=1`;
  const params: unknown[] = [];

  if (agentId) {
    sql += " AND pv.agent_id = ?";
    params.push(agentId);
  }

  sql += " ORDER BY pv.created_at DESC";

  const versions = db.prepare(sql).all(...params);
  return NextResponse.json(versions);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    agent_id: string;
    name?: string;
    content: string;
    variables?: string;
    model_params?: string;
    environment?: string;
  };

  if (!body.agent_id || !body.content) {
    return NextResponse.json(
      { error: "agent_id and content are required" },
      { status: 400 },
    );
  }

  const name = body.name ?? "default";

  // Auto-increment version number per agent+name combo
  const latest = db
    .prepare(
      "SELECT MAX(version) as max_version FROM prompt_versions WHERE agent_id = ? AND name = ?",
    )
    .get(body.agent_id, name) as { max_version: number | null };

  const nextVersion = (latest.max_version ?? 0) + 1;

  const id = uuid();
  db.prepare(
    `INSERT INTO prompt_versions (id, agent_id, name, version, content, variables, model_params, environment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.agent_id,
    name,
    nextVersion,
    body.content,
    body.variables ?? "[]",
    body.model_params ?? "{}",
    body.environment ?? "dev",
  );

  const version = db
    .prepare("SELECT * FROM prompt_versions WHERE id = ?")
    .get(id);
  return NextResponse.json(version, { status: 201 });
}
