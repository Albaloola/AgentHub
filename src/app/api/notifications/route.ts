import { NextResponse } from "next/server";
import { db, toBooleans } from "@/lib/db";
import { ensureServerRuntime } from "@/lib/backend/runtime/server-runtime";
import { createNotification } from "@/lib/backend/services/notifications";

export async function GET(request: Request) {
  ensureServerRuntime();
  const { searchParams } = new URL(request.url);
  const unread = searchParams.get("unread");
  const limit = searchParams.get("limit");
  const channelId = searchParams.get("channel_id");
  const conversationId = searchParams.get("conversation_id");
  const taskId = searchParams.get("task_id");
  const severity = searchParams.get("severity");

  let sql = "SELECT * FROM notifications";
  const params: unknown[] = [];
  const where: string[] = [];

  if (unread === "true") {
    where.push("is_read = 0");
  }
  if (channelId) {
    where.push("channel_id = ?");
    params.push(channelId);
  }
  if (conversationId) {
    where.push("conversation_id = ?");
    params.push(conversationId);
  }
  if (taskId) {
    where.push("task_id = ?");
    params.push(taskId);
  }
  if (severity) {
    where.push("severity = ?");
    params.push(severity);
  }

  if (where.length > 0) {
    sql += ` WHERE ${where.join(" AND ")}`;
  }

  sql += " ORDER BY created_at DESC";

  if (limit) {
    sql += " LIMIT ?";
    params.push(parseInt(limit, 10));
  }

  const notifications = db
    .prepare(sql)
    .all(...params)
    .map((row: unknown) => toBooleans(row as Record<string, unknown>));
  return NextResponse.json(notifications);
}

export async function POST(request: Request) {
  ensureServerRuntime();
  const body = (await request.json()) as {
    type: string;
    source_type?: string;
    severity?: "info" | "success" | "warning" | "error";
    title: string;
    body?: string;
    source_id?: string;
    agent_id?: string;
    channel_id?: string;
    conversation_id?: string;
    task_id?: string;
    webhook_id?: string;
    action_url?: string;
    dedupe_key?: string;
    delivery_channel?: string;
    delivery_status?: string;
    routing_key?: string;
    routing_metadata?: Record<string, unknown> | string;
  };

  if (!body.type || !body.title) {
    return NextResponse.json(
      { error: "type and title are required" },
      { status: 400 },
    );
  }

  const id = createNotification({
    type: body.type,
    sourceType: body.source_type ?? null,
    severity: body.severity,
    title: body.title,
    body: body.body ?? null,
    sourceId: body.source_id ?? null,
    agentId: body.agent_id ?? null,
    channelId: body.channel_id ?? null,
    conversationId: body.conversation_id ?? null,
    taskId: body.task_id ?? null,
    webhookId: body.webhook_id ?? null,
    actionUrl: body.action_url ?? null,
    dedupeKey: body.dedupe_key ?? null,
    deliveryChannel: body.delivery_channel,
    deliveryStatus: body.delivery_status,
    routingKey: body.routing_key ?? null,
    routingMetadata: body.routing_metadata ?? null,
  });
  const notification = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
  return NextResponse.json(toBooleans(notification as Record<string, unknown>), { status: 201 });
}

export async function PATCH(request: Request) {
  ensureServerRuntime();
  const body = (await request.json()) as { action: string };

  if (body.action !== "mark_all_read") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const result = db.prepare("UPDATE notifications SET is_read = 1, read_at = datetime('now') WHERE is_read = 0").run();
  return NextResponse.json({ ok: true, updated: result.changes });
}
