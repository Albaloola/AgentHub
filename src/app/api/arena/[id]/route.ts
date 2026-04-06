import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const round = db.prepare("SELECT * FROM arena_rounds WHERE id = ?").get(id);
  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }
  return NextResponse.json(round);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { winner_agent_id: string };

  const round = db.prepare("SELECT * FROM arena_rounds WHERE id = ?").get(id) as
    | { id: string; results: string; agents: string }
    | undefined;
  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  if (!body.winner_agent_id) {
    return NextResponse.json({ error: "winner_agent_id is required" }, { status: 400 });
  }

  const agentIds: string[] = JSON.parse(round.agents);
  if (!agentIds.includes(body.winner_agent_id)) {
    return NextResponse.json(
      { error: "winner_agent_id must be one of the round's agents" },
      { status: 400 },
    );
  }

  const results = JSON.parse(round.results || "{}");
  results.winner = body.winner_agent_id;
  results.voted_at = new Date().toISOString();

  db.prepare(
    "UPDATE arena_rounds SET results = ?, winner_agent_id = ?, status = 'completed' WHERE id = ?",
  ).run(JSON.stringify(results), body.winner_agent_id, id);

  const updated = db.prepare("SELECT * FROM arena_rounds WHERE id = ?").get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const round = db.prepare("SELECT * FROM arena_rounds WHERE id = ?").get(id);
  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }
  db.prepare("DELETE FROM arena_rounds WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
