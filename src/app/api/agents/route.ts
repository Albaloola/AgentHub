import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import type { Agent, AgentWithStatus } from "@/lib/types";
import { createAdapter } from "@/lib/adapters";

export async function GET() {
  const agents = db.prepare("SELECT * FROM agents ORDER BY created_at DESC").all() as Agent[];

  // Check health of active agents in parallel
  const results: AgentWithStatus[] = await Promise.all(
    agents.map(async (agent) => {
      if (!agent.is_active) {
        return { ...agent, is_active: !!agent.is_active, status: "offline" as const };
      }
      try {
        const adapter = createAdapter(agent.gateway_type);
        const health = await adapter.healthCheck(agent);
        // Update last_seen on successful health check
        if (health.status === "ok") {
          db.prepare("UPDATE agents SET last_seen = datetime('now') WHERE id = ?").run(agent.id);
        }
        return {
          ...agent,
          is_active: !!agent.is_active,
          status: health.status === "ok" ? ("online" as const) : ("error" as const),
          latency_ms: health.latency_ms,
        };
      } catch {
        return { ...agent, is_active: !!agent.is_active, status: "error" as const };
      }
    }),
  );

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    gateway_type: Agent["gateway_type"];
    connection_url: string;
    connection_config?: string;
    avatar_url?: string;
  };

  const id = uuid();
  db.prepare(
    `INSERT INTO agents (id, name, avatar_url, gateway_type, connection_url, connection_config)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.name,
    body.avatar_url ?? null,
    body.gateway_type,
    body.connection_url,
    body.connection_config ?? "{}",
  );

  const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as Agent;
  return NextResponse.json(agent, { status: 201 });
}
