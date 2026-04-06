import { NextResponse } from "next/server";
import { getAllAdapterMeta } from "@/lib/adapters";
import { db } from "@/lib/db";
import type { Agent } from "@/lib/types";

export async function GET() {
  const agents = db.prepare("SELECT * FROM agents WHERE is_active = 1").all() as Agent[];
  const adapterMeta = getAllAdapterMeta();
  const metaMap = new Map(adapterMeta.map((m) => [m.type, m]));

  const capabilities = agents.map((agent) => {
    const meta = metaMap.get(agent.gateway_type);
    return {
      agent_id: agent.id,
      agent_name: agent.name,
      gateway_type: agent.gateway_type,
      capabilities: meta?.capabilities ?? {
        streaming: false,
        toolCalls: false,
        healthCheck: false,
      },
      commands: meta?.commands ?? [],
      maxContextTokens: meta?.maxContextTokens,
      contextReset: meta?.contextReset ?? false,
      fileUpload: meta?.capabilities?.fileUpload ?? { enabled: false },
      thinking: meta?.capabilities?.thinking ?? false,
      subagents: meta?.capabilities?.subagents ?? false,
    };
  });

  return NextResponse.json(capabilities);
}
