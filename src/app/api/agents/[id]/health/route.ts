import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Agent } from "@/lib/types";
import { createAdapter } from "@/lib/adapters";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as Agent | undefined;

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  try {
    const adapter = createAdapter(agent.gateway_type);
    const result = await adapter.healthCheck(agent);

    if (result.status === "ok") {
      db.prepare("UPDATE agents SET last_seen = datetime('now') WHERE id = ?").run(id);
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({
      status: "error",
      agent_name: agent.name,
      error: err instanceof Error ? err.message : "Health check failed",
    });
  }
}
