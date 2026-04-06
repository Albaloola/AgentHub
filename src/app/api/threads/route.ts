import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

interface MessageRow {
  id: string;
  conversation_id: string;
}

interface ThreadRow {
  id: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    parent_message_id: string;
    content: string;
  };

  if (!body.parent_message_id || !body.content) {
    return NextResponse.json(
      { error: "parent_message_id and content are required" },
      { status: 400 },
    );
  }

  // Verify parent message exists
  const parentMessage = db
    .prepare("SELECT id, conversation_id FROM messages WHERE id = ?")
    .get(body.parent_message_id) as MessageRow | undefined;

  if (!parentMessage) {
    return NextResponse.json(
      { error: "Parent message not found" },
      { status: 404 },
    );
  }

  // Find or create the thread for this parent message
  let thread = db
    .prepare("SELECT id FROM message_threads WHERE parent_message_id = ?")
    .get(body.parent_message_id) as ThreadRow | undefined;

  if (!thread) {
    const threadId = uuid();
    db.prepare(
      `INSERT INTO message_threads (id, parent_message_id, conversation_id, reply_count, last_reply_at)
       VALUES (?, ?, ?, 0, datetime('now'))`,
    ).run(threadId, body.parent_message_id, parentMessage.conversation_id);
    thread = { id: threadId };
  }

  // Insert the reply message
  const messageId = uuid();
  db.prepare(
    `INSERT INTO messages (id, conversation_id, content, parent_message_id)
     VALUES (?, ?, ?, ?)`,
  ).run(
    messageId,
    parentMessage.conversation_id,
    body.content,
    body.parent_message_id,
  );

  // Increment reply_count and update last_reply_at
  db.prepare(
    `UPDATE message_threads
     SET reply_count = reply_count + 1, last_reply_at = datetime('now')
     WHERE id = ?`,
  ).run(thread.id);

  const message = db.prepare("SELECT * FROM messages WHERE id = ?").get(messageId);
  const updatedThread = db
    .prepare("SELECT * FROM message_threads WHERE id = ?")
    .get(thread.id);

  return NextResponse.json({ thread: updatedThread, message }, { status: 201 });
}
