import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const rounds = db
    .prepare("SELECT * FROM arena_rounds ORDER BY created_at DESC")
    .all();
  return NextResponse.json(rounds);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    prompt: string;
    category?: string;
    agent_ids: string[];
  };

  if (!body.prompt || !Array.isArray(body.agent_ids) || body.agent_ids.length < 2) {
    return NextResponse.json(
      { error: "prompt and at least 2 agent_ids are required" },
      { status: 400 },
    );
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO arena_rounds (id, prompt, category, agents, results, status)
     VALUES (?, ?, ?, ?, '{}', 'pending')`,
  ).run(id, body.prompt, body.category ?? null, JSON.stringify(body.agent_ids));

  const round = db.prepare("SELECT * FROM arena_rounds WHERE id = ?").get(id);
  return NextResponse.json(round, { status: 201 });
}
