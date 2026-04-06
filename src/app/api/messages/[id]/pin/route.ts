import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Message } from "@/lib/types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const message = db
    .prepare("SELECT id, is_pinned FROM messages WHERE id = ?")
    .get(id) as Pick<Message, "id" | "is_pinned"> | undefined;

  if (!message) {
    return NextResponse.json(
      { error: "Message not found" },
      { status: 404 },
    );
  }

  const newValue = message.is_pinned ? 0 : 1;
  db.prepare("UPDATE messages SET is_pinned = ? WHERE id = ?").run(
    newValue,
    id,
  );

  return NextResponse.json({ id, is_pinned: !!newValue });
}
