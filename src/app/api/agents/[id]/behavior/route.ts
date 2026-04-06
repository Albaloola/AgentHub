import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface AgentRow {
  id: string;
  behavior_modes: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const agent = db.prepare("SELECT id, behavior_modes FROM agents WHERE id = ?").get(id) as
    | AgentRow
    | undefined;
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  let modes: Record<string, unknown> = {};
  try {
    modes = JSON.parse(agent.behavior_modes || "{}");
  } catch {
    modes = {};
  }

  return NextResponse.json({ agent_id: id, behavior_modes: modes });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { mode: string };

  if (!body.mode) {
    return NextResponse.json({ error: "mode is required" }, { status: 400 });
  }

  const agent = db.prepare("SELECT id, behavior_modes FROM agents WHERE id = ?").get(id) as
    | AgentRow
    | undefined;
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Update behavior_modes on the agent to record the active mode
  let modes: Record<string, unknown> = {};
  try {
    modes = JSON.parse(agent.behavior_modes || "{}");
  } catch {
    modes = {};
  }
  modes.active = body.mode;

  db.prepare("UPDATE agents SET behavior_modes = ? WHERE id = ?").run(
    JSON.stringify(modes),
    id,
  );

  // Also update any conversations that use this agent as the primary agent
  db.prepare(
    "UPDATE conversations SET behavior_mode = ? WHERE agent_id = ?",
  ).run(body.mode, id);

  return NextResponse.json({
    agent_id: id,
    behavior_modes: modes,
    conversations_updated: true,
  });
}
