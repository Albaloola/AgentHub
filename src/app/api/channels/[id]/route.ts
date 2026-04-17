import { NextResponse } from "next/server";
import { archiveChannel, getChannelById, updateChannel } from "@/lib/backend/services/channels";
import { db } from "@/lib/backend/db";
import { ensureServerRuntime } from "@/lib/backend/runtime/server-runtime";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureServerRuntime();
  const { id } = await params;
  const channel = getChannelById(id);
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const conversations = db
    .prepare(
      `SELECT id, name, updated_at
       FROM conversations
       WHERE channel_id = ?
       ORDER BY updated_at DESC
       LIMIT 20`,
    )
    .all(id);

  return NextResponse.json({ ...channel, recent_conversations: conversations });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureServerRuntime();
  const { id } = await params;
  const body = (await request.json()) as Partial<{
    name: string;
    slug: string;
    description: string | null;
    icon: string;
    color: string;
    is_pinned: boolean;
    sort_order: number;
    default_model: string | null;
    default_system_prompt: string | null;
    default_response_mode: "discussion" | "parallel" | "targeted";
    enabled_commands: string[];
    notification_prefs: Record<string, boolean>;
    is_archived: boolean;
  }>;

  const updated = updateChannel(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureServerRuntime();
  const { id } = await params;
  const channel = archiveChannel(id);
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, channel });
}
