import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { createAdapter } from "@/lib/adapters";
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
      `INSERT INTO conversations (id, type, name, agent_id, updated_at)
       VALUES (?, 'single', ?, ?, datetime('now'))`,
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
    // Update conversation timestamp
    db.prepare(
      "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?",
    ).run(conversationId);
  }

  // Insert user message (sender_agent_id = NULL means user)
  const userMessageId = uuid();
  db.prepare(
    `INSERT INTO messages (id, conversation_id, sender_agent_id, content, token_count)
     VALUES (?, ?, NULL, ?, ?)`,
  ).run(userMessageId, conversationId, body.content, Math.ceil(body.content.length / 4));

  // Invoke the agent
  const adapter = createAdapter(agent.gateway_type);
  const agentMsgId = uuid();
  let fullContent = "";
  let fullThinking = "";
  let tokenCount = 0;

  const startTime = Date.now();

  // Insert placeholder for agent message
  db.prepare(
    `INSERT INTO messages (id, conversation_id, sender_agent_id, content, thinking_content, token_count)
     VALUES (?, ?, ?, '', '', 0)`,
  ).run(agentMsgId, conversationId, agent.id);

  // Build message history
  const history = [{ role: "user" as const, content: body.content }];

  const message = {
    conversation_id: conversationId,
    content: body.content,
    history,
    metadata: body.metadata || {},
  };

  // Stream response from agent
  try {
    for await (const chunk of adapter.sendMessage(agent, message)) {
      switch (chunk.type) {
        case "content":
          if (chunk.content) {
            fullContent += chunk.content;
          }
          break;
        case "thinking":
        case "thinking_chunk":
          if (chunk.thinking) {
            fullThinking += chunk.thinking;
          }
          break;
        case "error":
          throw new Error(chunk.error || "Agent communication failed");
        case "done":
          break;
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Agent communication failed";
    if (!fullContent) {
      fullContent = `*Error: ${errorMsg}*`;
    }
  }

  tokenCount = Math.max(Math.ceil(fullContent.length / 4), 1);
  const responseTime = Date.now() - startTime;

  // Update agent message with response
  db.prepare(
    `UPDATE messages SET content = ?, thinking_content = ?, token_count = ? WHERE id = ?`,
  ).run(fullContent, fullThinking, tokenCount, agentMsgId);

  // Update agent stats
  db.prepare(
    `UPDATE agents SET last_seen = datetime('now'), total_messages = total_messages + 1, total_tokens = total_tokens + ?,
     avg_response_time_ms = CASE WHEN total_messages = 0 THEN ? ELSE ((avg_response_time_ms * total_messages) + ?) / (total_messages + 1) END
     WHERE id = ?`,
  ).run(tokenCount, responseTime, responseTime, agent.id);

  // If callback_url is provided, send the response there
  if (body.callback_url) {
    try {
      await fetch(body.callback_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          user_message_id: userMessageId,
          response_message_id: agentMsgId,
          response: fullContent,
          agent_id: agent.id,
          agent_name: agent.name,
          metadata: body.metadata,
        }),
      });
    } catch {
      // Callback errors don't fail the request
    }
  }

  return NextResponse.json(
    { 
      conversation_id: conversationId, 
      user_message_id: userMessageId,
      response_message_id: agentMsgId,
      response: fullContent,
      agent_id: agent.id,
      agent_name: agent.name,
    },
    { status: 201 },
  );
}
