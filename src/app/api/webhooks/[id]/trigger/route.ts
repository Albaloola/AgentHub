import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { createAdapter } from "@/lib/adapters";
import type { Webhook, Agent } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const webhook = db
    .prepare("SELECT * FROM webhooks WHERE id = ?")
    .get(id) as Webhook | undefined;

  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  if (!webhook.is_active) {
    return NextResponse.json({ error: "Webhook is inactive" }, { status: 403 });
  }

  // Rate limiting: count triggers in the last minute
  const recentCount = db
    .prepare(
      `SELECT COUNT(*) as count FROM webhook_events
       WHERE webhook_id = ? AND created_at > datetime('now', '-1 minute')`,
    )
    .get(id) as { count: number };

  if (recentCount.count >= webhook.rate_limit_per_min) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const eventId = uuid();
  const conversationId = uuid();
  const userMessageId = uuid();
  const payloadStr = payload ? JSON.stringify(payload) : null;
  const messageContent = payloadStr ?? "(empty payload)";

  try {
    // Get the agent
    const agent = db
      .prepare("SELECT * FROM agents WHERE id = ? AND is_active = 1")
      .get(webhook.agent_id) as Agent | undefined;

    if (!agent) {
      throw new Error("Agent not found or inactive");
    }

    // Create conversation for this webhook trigger
    db.prepare(
      `INSERT INTO conversations (id, type, name, agent_id, updated_at)
       VALUES (?, 'single', ?, ?, datetime('now'))`,
    ).run(conversationId, `Webhook: ${webhook.name}`, webhook.agent_id);

    // Insert the user message with the payload content
    db.prepare(
      `INSERT INTO messages (id, conversation_id, sender_agent_id, content, token_count)
       VALUES (?, ?, NULL, ?, ?)`,
    ).run(userMessageId, conversationId, messageContent, Math.ceil(messageContent.length / 4));

    // Create the webhook event record (initially pending)
    db.prepare(
      `INSERT INTO webhook_events (id, webhook_id, payload, status)
       VALUES (?, ?, ?, 'processing')`,
    ).run(eventId, id, payloadStr);

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

    // Build message history (just the user message)
    const history = [
      { role: "user" as const, content: messageContent },
    ];

    // Prepare message
    const message = {
      conversation_id: conversationId,
      content: messageContent,
      history,
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
      // Update webhook event with error
      db.prepare(
        `UPDATE webhook_events SET status = 'error', error = ? WHERE id = ?`,
      ).run(errorMsg, eventId);
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

    // Update webhook event with response
    db.prepare(
      `UPDATE webhook_events SET status = 'completed', response_message_id = ? WHERE id = ?`,
    ).run(agentMsgId, eventId);

    // Update webhook trigger stats
    db.prepare(
      `UPDATE webhooks
       SET total_triggers = total_triggers + 1, last_triggered_at = datetime('now')
       WHERE id = ?`,
    ).run(id);

    return NextResponse.json(
      { 
        event_id: eventId, 
        conversation_id: conversationId, 
        user_message_id: userMessageId,
        response_message_id: agentMsgId,
        response: fullContent,
      },
      { status: 201 },
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    // Record failure in webhook_events
    db.prepare(
      `INSERT INTO webhook_events (id, webhook_id, payload, status, error)
       VALUES (?, ?, ?, 'error', ?)`,
    ).run(eventId, id, payloadStr, errorMsg);

    return NextResponse.json(
      { error: "Failed to process webhook trigger", details: errorMsg },
      { status: 500 },
    );
  }
}
