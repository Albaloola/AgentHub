import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const personas = db
    .prepare("SELECT * FROM personas ORDER BY usage_count DESC")
    .all();

  return NextResponse.json(personas);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    category?: string;
    description?: string;
    system_prompt: string;
    behavior_mode?: string;
    capability_weights?: Record<string, number>;
  };

  if (!body.name || !body.system_prompt) {
    return NextResponse.json(
      { error: "name and system_prompt are required" },
      { status: 400 },
    );
  }

  const id = uuid();

  db.prepare(
    `INSERT INTO personas (id, name, category, description, system_prompt, behavior_mode, capability_weights)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.name,
    body.category ?? "general",
    body.description ?? null,
    body.system_prompt,
    body.behavior_mode ?? "default",
    JSON.stringify(body.capability_weights ?? {}),
  );

  const persona = db.prepare("SELECT * FROM personas WHERE id = ?").get(id);
  return NextResponse.json(persona, { status: 201 });
}
