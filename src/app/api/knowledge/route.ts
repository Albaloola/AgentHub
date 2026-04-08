import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const kbs = db
    .prepare("SELECT * FROM knowledge_bases ORDER BY created_at DESC")
    .all();
  return NextResponse.json(kbs);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    description?: string;
  };

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const id = uuid();
  db.prepare(
    "INSERT INTO knowledge_bases (id, name, description) VALUES (?, ?, ?)",
  ).run(id, body.name, body.description ?? null);

  const kb = db.prepare("SELECT * FROM knowledge_bases WHERE id = ?").get(id);
  return NextResponse.json(kb, { status: 201 });
}
