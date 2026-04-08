import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const versions = db
    .prepare(
      "SELECT * FROM agent_versions WHERE agent_id = ? ORDER BY created_at DESC",
    )
    .all(id);
  return NextResponse.json(versions);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    version: string;
    traffic_pct?: number;
  };

  if (!body.version) {
    return NextResponse.json(
      { error: "version is required" },
      { status: 400 },
    );
  }

  const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as
    | { id: string; connection_config: string }
    | undefined;
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Derive prompt_hash from the agent's current config
  const configStr = agent.connection_config ?? "{}";
  let hash = 0;
  for (let i = 0; i < configStr.length; i++) {
    const ch = configStr.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  const promptHash = Math.abs(hash).toString(16);

  const vid = uuid();
  db.prepare(
    `INSERT INTO agent_versions (id, agent_id, version, prompt_hash, traffic_pct)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(vid, id, body.version, promptHash, body.traffic_pct ?? 0);

  const created = db
    .prepare("SELECT * FROM agent_versions WHERE id = ?")
    .get(vid);
  return NextResponse.json(created, { status: 201 });
}
