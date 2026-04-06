import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import type { Agent } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const agent = db
    .prepare("SELECT * FROM agents WHERE id = ?")
    .get(id) as Agent | undefined;

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    content: string;
    conversation_id?: string;
    callback_url?: string;
    metadata?: Record<string, unknown>;
  };

  if (!body.content) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 },
    );
  }

  let conversationId = body.conversation_id;

  // If no conversation_id provided, create a new conversation
  if (!conversationId) {
    conversationId = uuid();
    db.prepare(
      `INSERT INTO conversations (id, type, name, agent_id)
       VALUES (?, 'single', ?, ?)`,
    ).run(conversationId, agent.name, id);
  } else {
    // Verify the conversation exists
    const conv = db
      .prepare("SELECT id FROM conversations WHERE id = ?")
      .get(conversationId);
    if (!conv) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }
  }

  // Insert user message (sender_agent_id = NULL means user)
  const messageId = uuid();
  db.prepare(
    `INSERT INTO messages (id, conversation_id, sender_agent_id, content)
     VALUES (?, ?, NULL, ?)`,
  ).run(messageId, conversationId, body.content);

  // Update conversation timestamp
  db.prepare(
    "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?",
  ).run(conversationId);

  return NextResponse.json(
    { conversation_id: conversationId, message_id: messageId },
    { status: 201 },
  );
}
