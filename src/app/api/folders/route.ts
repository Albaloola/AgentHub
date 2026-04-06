import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const folders = db
    .prepare("SELECT * FROM conversation_folders ORDER BY sort_order ASC, created_at ASC")
    .all();
  return NextResponse.json(folders);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    parent_id?: string;
    color?: string;
  };

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const id = uuid();
  db.prepare(
    "INSERT INTO conversation_folders (id, name, parent_id, color) VALUES (?, ?, ?, ?)",
  ).run(id, body.name, body.parent_id ?? null, body.color ?? "#6366f1");

  const folder = db
    .prepare("SELECT * FROM conversation_folders WHERE id = ?")
    .get(id);
  return NextResponse.json(folder, { status: 201 });
}
