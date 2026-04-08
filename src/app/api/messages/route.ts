import { NextResponse } from "next/server";
import { db, toBooleans } from "@/lib/db";
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

  if (messages.length === 0) return NextResponse.json([]);

  const msgIds = messages.map((m) => m.id);
  const ph = msgIds.map(() => "?").join(",");

  // Batch: all tool calls for these messages
  const allToolCalls = db.prepare(
    `SELECT * FROM tool_calls WHERE message_id IN (${ph}) ORDER BY timestamp ASC`,
  ).all(...msgIds) as ToolCall[];
  const toolCallMap = new Map<string, ToolCall[]>();
  for (const tc of allToolCalls) {
    const list = toolCallMap.get(tc.message_id) || [];
    list.push(tc);
    toolCallMap.set(tc.message_id, list);
  }

  // Batch: all agents referenced by messages
  const agentIds = [...new Set(messages.filter((m) => m.sender_agent_id).map((m) => m.sender_agent_id!))];
  const agentMap = new Map<string, Agent>();
  if (agentIds.length > 0) {
    const aph = agentIds.map(() => "?").join(",");
    const agents = db.prepare(`SELECT * FROM agents WHERE id IN (${aph})`).all(...agentIds) as Agent[];
    for (const a of agents) agentMap.set(a.id, a);
  }

  const result: MessageWithToolCalls[] = messages.map((msg) => toBooleans({
    ...msg,
    tool_calls: toolCallMap.get(msg.id) || [],
    agent: msg.sender_agent_id ? agentMap.get(msg.sender_agent_id) : undefined,
  }));

  return NextResponse.json(result);
}
