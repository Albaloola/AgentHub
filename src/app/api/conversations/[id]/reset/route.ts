import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAdapter } from "@/lib/adapters";
import type { Agent, Conversation } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const conversation = db
    .prepare("SELECT * FROM conversations WHERE id = ?")
    .get(id) as Conversation | undefined;

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);

  let agents: Agent[] = [];
  if (conversation.type === "single" && conversation.agent_id) {
    const agent = db
      .prepare("SELECT * FROM agents WHERE id = ?")
      .get(conversation.agent_id) as Agent | undefined;
    if (agent) agents = [agent];
  } else if (conversation.type === "group") {
    agents = db
      .prepare(
        "SELECT a.* FROM agents a JOIN conversation_agents ca ON ca.agent_id = a.id WHERE ca.conversation_id = ? AND a.is_active = 1"
      )
      .all(id) as Agent[];
  }

  const resetResults = await Promise.allSettled(
    agents.map(async (agent) => {
      try {
        const adapter = createAdapter(agent.gateway_type);
        await adapter.healthCheck(agent);
        return { agent_id: agent.id, status: "ok" };
      } catch (err) {
        return { agent_id: agent.id, status: "error", error: err instanceof Error ? err.message : "Unknown" };
      }
    })
  );

  return NextResponse.json({
    message: "Context reset",
    agents: resetResults.map((r) => (r.status === "fulfilled" ? r.value : { status: "rejected" })),
  });
}
