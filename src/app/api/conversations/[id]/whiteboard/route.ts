import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import type { Whiteboard } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wb = db.prepare("SELECT * FROM whiteboards WHERE conversation_id = ?").get(id) as Whiteboard | undefined;
  if (!wb) return NextResponse.json({ id: uuid(), conversation_id: id, content: "", updated_at: new Date().toISOString() });
  return NextResponse.json(wb);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content } = await request.json();

  if (content === undefined || content === null) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const existing = db.prepare("SELECT id FROM whiteboards WHERE conversation_id = ?").get(id) as { id: string } | undefined;

  if (existing) {
    db.prepare("UPDATE whiteboards SET content = ?, updated_at = datetime('now') WHERE conversation_id = ?").run(content, id);
  } else {
    db.prepare("INSERT INTO whiteboards (id, conversation_id, content) VALUES (?, ?, ?)").run(uuid(), id, content);
  }

  return NextResponse.json({ message: "Whiteboard saved" });
}
