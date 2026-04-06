import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import type { Webhook } from "@/lib/types";

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
  const messageId = uuid();
  const payloadStr = payload ? JSON.stringify(payload) : null;
  const messageContent = payloadStr ?? "(empty payload)";

  try {
    // Create conversation for this webhook trigger
    db.prepare(
      `INSERT INTO conversations (id, type, name, agent_id)
       VALUES (?, 'single', ?, ?)`,
    ).run(conversationId, `Webhook: ${webhook.name}`, webhook.agent_id);

    // Insert the user message with the payload content
    db.prepare(
      `INSERT INTO messages (id, conversation_id, sender_agent_id, content)
       VALUES (?, ?, NULL, ?)`,
    ).run(messageId, conversationId, messageContent);

    // Create the webhook event record
    db.prepare(
      `INSERT INTO webhook_events (id, webhook_id, payload, response_message_id, status)
       VALUES (?, ?, ?, ?, 'received')`,
    ).run(eventId, id, payloadStr, messageId);

    // Update webhook trigger stats
    db.prepare(
      `UPDATE webhooks
       SET total_triggers = total_triggers + 1, last_triggered_at = datetime('now')
       WHERE id = ?`,
    ).run(id);

    return NextResponse.json(
      { event_id: eventId, conversation_id: conversationId, message_id: messageId },
      { status: 201 },
    );
  } catch (err) {
    // Record failure in webhook_events
    db.prepare(
      `INSERT INTO webhook_events (id, webhook_id, payload, status, error)
       VALUES (?, ?, ?, 'error', ?)`,
    ).run(eventId, id, payloadStr, String(err));

    return NextResponse.json(
      { error: "Failed to process webhook trigger" },
      { status: 500 },
    );
  }
}
