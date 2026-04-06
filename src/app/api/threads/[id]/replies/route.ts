import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Verify thread exists
  const thread = db
    .prepare("SELECT * FROM message_threads WHERE id = ?")
    .get(id);

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Get all reply messages for this thread, joined with agent info
  const replies = db
    .prepare(
      `SELECT m.*, a.name AS agent_name, a.avatar_url AS agent_avatar_url
       FROM messages m
       LEFT JOIN agents a ON m.sender_agent_id = a.id
       WHERE m.parent_message_id = (
         SELECT parent_message_id FROM message_threads WHERE id = ?
       )
       ORDER BY m.created_at ASC`,
    )
    .all(id);

  return NextResponse.json(replies);
}
