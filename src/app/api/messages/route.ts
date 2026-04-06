import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Agent, Message, MessageWithToolCalls, ToolCall } from "@/lib/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversation_id");

  if (!conversationId) {
    return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
  }

  const messages = db
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(conversationId) as Message[];

  const result: MessageWithToolCalls[] = messages.map((msg) => {
    const toolCalls = db
      .prepare("SELECT * FROM tool_calls WHERE message_id = ? ORDER BY timestamp ASC")
      .all(msg.id) as ToolCall[];

    let agent: Agent | undefined;
    if (msg.sender_agent_id) {
      agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(msg.sender_agent_id) as Agent | undefined;
    }

    return { ...msg, tool_calls: toolCalls, agent };
  });

  return NextResponse.json(result);
}
