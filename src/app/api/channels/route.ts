import { NextResponse } from "next/server";
import { db } from "@/lib/backend/db";
import { createChannel, listChannels } from "@/lib/backend/services/channels";
import { ensureServerRuntime } from "@/lib/backend/runtime/server-runtime";

export async function GET(request: Request) {
  ensureServerRuntime();
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agent_id") ?? undefined;
  const includeArchived = searchParams.get("include_archived") === "true";

  return NextResponse.json(listChannels({ agentId, includeArchived }));
}

export async function POST(request: Request) {
  ensureServerRuntime();
  const body = (await request.json()) as {
    agent_id: string;
    name: string;
    slug?: string;
    description?: string | null;
    icon?: string;
    color?: string;
    is_pinned?: boolean;
    default_model?: string | null;
    default_system_prompt?: string | null;
    default_response_mode?: "discussion" | "parallel" | "targeted";
    enabled_commands?: string[];
    notification_prefs?: Record<string, boolean>;
  };

  if (!body.agent_id || !body.name?.trim()) {
    return NextResponse.json({ error: "agent_id and name are required" }, { status: 400 });
  }

  const agent = db.prepare("SELECT id FROM agents WHERE id = ?").get(body.agent_id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const channel = createChannel({
    agentId: body.agent_id,
    name: body.name,
    slug: body.slug,
    description: body.description,
    icon: body.icon,
    color: body.color,
    isPinned: body.is_pinned,
    defaultModel: body.default_model,
    defaultSystemPrompt: body.default_system_prompt,
    defaultResponseMode: body.default_response_mode,
    enabledCommands: body.enabled_commands,
    notificationPrefs: body.notification_prefs,
  });

  return NextResponse.json(channel, { status: 201 });
}
