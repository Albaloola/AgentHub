import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { ensureServerRuntime } from "@/lib/backend/runtime/server-runtime";
import { channelBelongsToAgent } from "@/lib/backend/services/channels";
import { executeSingleAgentRequest } from "@/lib/backend/services/execution";
import { createNotification } from "@/lib/backend/services/notifications";
import type { Webhook } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureServerRuntime();
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
  if (!channelBelongsToAgent(webhook.channel_id, webhook.agent_id)) {
    return NextResponse.json({ error: "Webhook channel does not belong to the selected agent" }, { status: 400 });
  }

  const recentCount = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM webhook_events
       WHERE webhook_id = ? AND created_at > datetime('now', '-1 minute')`,
    )
    .get(id) as { count: number };

  if (recentCount.count >= webhook.rate_limit_per_min) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const eventId = uuid();
  const payloadStr = payload ? JSON.stringify(payload) : null;
  const messageContent = payloadStr ?? "(empty payload)";

  db.prepare(
    `INSERT INTO webhook_events (id, webhook_id, conversation_id, payload, status)
     VALUES (?, ?, NULL, ?, 'processing')`,
  ).run(eventId, id, payloadStr);

  try {
    const execution = await executeSingleAgentRequest({
      agentId: webhook.agent_id,
      channelId: webhook.channel_id,
      content: messageContent,
      conversationName: `Webhook: ${webhook.name}`,
      metadata: {
        webhook_id: webhook.id,
      },
    });

    db.prepare(
      `UPDATE webhook_events
       SET conversation_id = ?, response_message_id = ?, status = 'completed', error = NULL
       WHERE id = ?`,
    ).run(execution.conversationId, execution.responseMessageId, eventId);

    db.prepare(
      `UPDATE webhooks
       SET total_triggers = total_triggers + 1, last_triggered_at = datetime('now')
       WHERE id = ?`,
    ).run(id);

    createNotification({
      type: "webhook.completed",
      sourceType: "webhook",
      severity: "success",
      title: `Webhook processed: ${webhook.name}`,
      body: `Payload processed by ${execution.agentName}.`,
      sourceId: webhook.id,
      agentId: webhook.agent_id,
      channelId: webhook.channel_id,
      conversationId: execution.conversationId,
      webhookId: webhook.id,
      actionUrl: `/chat/${execution.conversationId}`,
      dedupeKey: `webhook:${eventId}`,
      deliveryChannel: "in_app",
      deliveryStatus: "delivered",
      routingKey: "webhook:trigger",
      routingMetadata: {
        webhook_event_id: eventId,
        response_message_id: execution.responseMessageId,
        token_count: execution.tokenCount,
      },
    });

    return NextResponse.json(
      {
        event_id: eventId,
        conversation_id: execution.conversationId,
        user_message_id: execution.userMessageId,
        response_message_id: execution.responseMessageId,
        response: execution.response,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process webhook trigger";
    db.prepare(
      `UPDATE webhook_events
       SET status = 'error', error = ?
       WHERE id = ?`,
    ).run(message, eventId);

    createNotification({
      type: "webhook.failed",
      sourceType: "webhook",
      severity: "error",
      title: `Webhook failed: ${webhook.name}`,
      body: message,
      sourceId: webhook.id,
      agentId: webhook.agent_id,
      channelId: webhook.channel_id,
      webhookId: webhook.id,
      dedupeKey: `webhook:${eventId}:failed`,
      deliveryChannel: "in_app",
      deliveryStatus: "failed",
      routingKey: "webhook:trigger",
      routingMetadata: {
        webhook_event_id: eventId,
        error: message,
      },
    });

    return NextResponse.json(
      { error: "Failed to process webhook trigger", details: message },
      { status: 500 },
    );
  }
}
