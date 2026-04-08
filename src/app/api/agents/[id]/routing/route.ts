import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface AgentRow {
  id: string;
  capability_weights: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const agent = db.prepare("SELECT id, capability_weights FROM agents WHERE id = ?").get(id) as
    | AgentRow
    | undefined;
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  let weights: Record<string, number> = {};
  try {
    weights = JSON.parse(agent.capability_weights || "{}");
  } catch {
    weights = {};
  }

  return NextResponse.json({ agent_id: id, capability_weights: weights });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { content: string };

  if (!body.content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const agent = db.prepare("SELECT id, capability_weights FROM agents WHERE id = ?").get(id) as
    | AgentRow
    | undefined;
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  let weights: Record<string, number> = {};
  try {
    weights = JSON.parse(agent.capability_weights || "{}");
  } catch {
    weights = {};
  }

  const contentLower = body.content.toLowerCase();
  const matchingCapabilities: string[] = [];
  let score = 0;

  for (const [capability, weight] of Object.entries(weights)) {
    // Split capability into keywords (e.g. "code_review" -> ["code", "review"])
    const keywords = capability.toLowerCase().split(/[_\-\s]+/);
    const matched = keywords.some((kw) => contentLower.includes(kw));
    if (matched) {
      matchingCapabilities.push(capability);
      score += weight;
    }
  }

  return NextResponse.json({
    agent_id: id,
    score,
    matching_capabilities: matchingCapabilities,
  });
}
