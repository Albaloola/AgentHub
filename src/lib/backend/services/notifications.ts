import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";

export interface CreateNotificationInput {
  type: string;
  sourceType?: string | null;
  severity?: "info" | "success" | "warning" | "error";
  title: string;
  body?: string | null;
  sourceId?: string | null;
  agentId?: string | null;
  channelId?: string | null;
  conversationId?: string | null;
  taskId?: string | null;
  webhookId?: string | null;
  actionUrl?: string | null;
  dedupeKey?: string | null;
  deliveryChannel?: string;
  deliveryStatus?: string;
  routingKey?: string | null;
  routingMetadata?: Record<string, unknown> | string | null;
  readAt?: string | null;
}

/**
 * Centralized notification writer so route/task/webhook code creates
 * consistent, routable notifications.
 */
export function createNotification(input: CreateNotificationInput) {
  if (input.dedupeKey) {
    const existing = db
      .prepare("SELECT id FROM notifications WHERE dedupe_key = ? ORDER BY created_at DESC LIMIT 1")
      .get(input.dedupeKey) as { id: string } | undefined;
    if (existing) {
      return existing.id;
    }
  }

  const id = uuid();
  const routingMetadata =
    typeof input.routingMetadata === "string"
      ? input.routingMetadata
      : JSON.stringify(input.routingMetadata ?? {});

  db.prepare(
    `INSERT INTO notifications (
      id, type, source_type, severity, title, body, source_id,
      agent_id, channel_id, conversation_id, task_id, webhook_id, action_url,
      dedupe_key, delivery_channel, delivery_status, routing_key, routing_metadata, read_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.type,
    input.sourceType ?? null,
    input.severity ?? "info",
    input.title,
    input.body ?? null,
    input.sourceId ?? null,
    input.agentId ?? null,
    input.channelId ?? null,
    input.conversationId ?? null,
    input.taskId ?? null,
    input.webhookId ?? null,
    input.actionUrl ?? null,
    input.dedupeKey ?? null,
    input.deliveryChannel ?? "in_app",
    input.deliveryStatus ?? "pending",
    input.routingKey ?? null,
    routingMetadata,
    input.readAt ?? null,
  );
  return id;
}
