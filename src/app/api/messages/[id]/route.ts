import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { content: string };

  if (!body.content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const message = db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  db.prepare("UPDATE messages SET content = ?, is_edited = 1 WHERE id = ?").run(
    body.content,
    id,
  );

  const updated = db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
  return NextResponse.json(updated);
}
