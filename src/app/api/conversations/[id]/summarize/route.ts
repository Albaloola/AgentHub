import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAdapter } from "@/lib/adapters";
import type { Agent, Message } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conversation = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as { id: string; name: string; type: string; agent_id: string | null } | undefined;
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const messages = db.prepare(
    "SELECT content, sender_agent_id FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
  ).all(id) as Message[];

  if (messages.length < 5) {
    return NextResponse.json({ summary: "Conversation is too short to summarize.", message: "Conversation is too short to summarize." });
  }

  const history = messages.map(m => ({
    role: (m.sender_agent_id ? "assistant" : "user") as "user" | "assistant",
    content: m.content,
  }));

  const agent = conversation.agent_id
    ? db.prepare("SELECT * FROM agents WHERE id = ?").get(conversation.agent_id) as Agent | undefined
    : undefined;

  if (!agent) {
    return NextResponse.json({ error: "No agent available for summarization" }, { status: 400 });
  }

  const summaryPrompt = `Please provide a concise summary (3-5 bullet points) of the following conversation:\n\n${history.map(m => `${m.role}: ${m.content}`).join("\n\n")}`;

  const adapter = createAdapter(agent.gateway_type);
  let summary = "";

  try {
    for await (const chunk of adapter.sendMessage(agent, {
      conversation_id: id,
      content: summaryPrompt,
      history: [],
    })) {
      if (chunk.type === "content" && chunk.content) {
        summary += chunk.content;
      }
    }
  } catch {
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }

  db.prepare("UPDATE conversations SET summary = ? WHERE id = ?").run(summary, id);

  return NextResponse.json({ summary, message: "Summary generated" });
}
