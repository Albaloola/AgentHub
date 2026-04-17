import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Agent } from "@/lib/types";
import { ensureServerRuntime } from "@/lib/backend/runtime/server-runtime";
import { buildAgentCapabilitiesByChannel } from "@/lib/backend/services/channels";

export async function GET(request: Request) {
  ensureServerRuntime();

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channel_id");
  const agentId = searchParams.get("agent_id");

  const agents = agentId
    ? (db.prepare("SELECT * FROM agents WHERE id = ? AND is_active = 1").all(agentId) as Agent[])
    : (db.prepare("SELECT * FROM agents WHERE is_active = 1").all() as Agent[]);

  const capabilities = agents.map((agent) => buildAgentCapabilitiesByChannel(agent, channelId));
  return NextResponse.json(capabilities);
}
