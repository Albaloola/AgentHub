import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import type { Agent, Conversation, ConversationWithDetails, Message, Tag } from "@/lib/types";

export async function GET() {
  const conversations = db
    .prepare("SELECT * FROM conversations ORDER BY updated_at DESC")
    .all() as Conversation[];

  const results: ConversationWithDetails[] = conversations.map((conv) => {
    let agents: Agent[] = [];

    if (conv.type === "single" && conv.agent_id) {
      const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(conv.agent_id) as Agent | undefined;
      if (agent) agents = [agent];
    } else if (conv.type === "group") {
      agents = db
        .prepare(
          `SELECT a.* FROM agents a
           JOIN conversation_agents ca ON ca.agent_id = a.id
           WHERE ca.conversation_id = ?`,
        )
        .all(conv.id) as Agent[];
    }

    const lastMessage = db
      .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(conv.id) as Message | undefined;

    const countRow = db
      .prepare("SELECT COUNT(*) as c FROM messages WHERE conversation_id = ?")
      .get(conv.id) as { c: number };

    const tags = db.prepare(
      "SELECT t.* FROM tags t JOIN conversation_tags ct ON ct.tag_id = t.id WHERE ct.conversation_id = ?",
    ).all(conv.id) as Tag[];

    return {
      ...conv,
      agents,
      last_message: lastMessage,
      message_count: countRow.c,
      tags,
    };
  });

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    agent_id?: string;
    agent_ids?: string[];
    name?: string;
    type?: "single" | "group";
    response_mode?: string;
  };

  const id = uuid();

  if (body.type === "group" && body.agent_ids?.length) {
    const name = body.name ?? "Group Chat";
    db.prepare(
      "INSERT INTO conversations (id, type, name) VALUES (?, ?, ?)",
    ).run(id, "group", name);

    const insertAgent = db.prepare(
      "INSERT INTO conversation_agents (conversation_id, agent_id, response_mode) VALUES (?, ?, ?)",
    );
    for (const agentId of body.agent_ids) {
      insertAgent.run(id, agentId, body.response_mode ?? "discussion");
    }
  } else if (body.agent_id) {
    const agent = db.prepare("SELECT name FROM agents WHERE id = ?").get(body.agent_id) as { name: string } | undefined;
    const name = body.name ?? agent?.name ?? "Chat";
    db.prepare(
      "INSERT INTO conversations (id, type, name, agent_id) VALUES (?, ?, ?, ?)",
    ).run(id, "single", name, body.agent_id);
  } else {
    return NextResponse.json({ error: "agent_id or agent_ids required" }, { status: 400 });
  }

  return NextResponse.json({ id }, { status: 201 });
}
