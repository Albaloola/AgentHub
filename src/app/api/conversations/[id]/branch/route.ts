import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { branch_at_message_id } = await request.json();

  const conversation = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as { id: string; type: string; name: string } | undefined;
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const newId = uuid();
  const branchPoint = branch_at_message_id || new Date().toISOString();

  const conv = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as Record<string, unknown>;
  db.prepare(
    "INSERT INTO conversations (id, type, name, agent_id, parent_conversation_id) VALUES (?, ?, ?, ?, ?)",
  ).run(newId, conversation.type, `${conversation.name} (Branch)`, conv.agent_id ?? null, id);

  // Copy group agent assignments
  const groupAgents = db.prepare("SELECT * FROM conversation_agents WHERE conversation_id = ?").all(id) as { agent_id: string; response_mode: string; agent_role: string }[];
  for (const ga of groupAgents) {
    db.prepare("INSERT INTO conversation_agents (conversation_id, agent_id, response_mode, agent_role) VALUES (?, ?, ?, ?)").run(newId, ga.agent_id, ga.response_mode, ga.agent_role);
  }

  if (branch_at_message_id) {
    const msgs = db.prepare(
      "SELECT * FROM messages WHERE conversation_id = ? AND created_at <= (SELECT created_at FROM messages WHERE id = ?) ORDER BY created_at ASC",
    ).all(id, branch_at_message_id) as { id: string; sender_agent_id: string | null; content: string; thinking_content: string; token_count: number }[];

    for (const msg of msgs) {
      const newMsgId = uuid();
      db.prepare(
        "INSERT INTO messages (id, conversation_id, sender_agent_id, content, thinking_content, token_count, parent_message_id, branch_point) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(newMsgId, newId, msg.sender_agent_id, msg.content, msg.thinking_content, msg.token_count, msg.id, branchPoint);
    }
  }

  return NextResponse.json({ id: newId, message: "Conversation branched" });
}
