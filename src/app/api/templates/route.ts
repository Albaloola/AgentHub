import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const templates = db.prepare("SELECT * FROM templates ORDER BY created_at DESC").all();
  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, description, response_mode, system_prompt, max_responses_per_turn, stop_on_completion, agent_ids, agent_roles } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const id = uuid();
  db.prepare(
    "INSERT INTO templates (id, name, description, response_mode, system_prompt, max_responses_per_turn, stop_on_completion) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(id, name, description || null, response_mode || "discussion", system_prompt || null, max_responses_per_turn || 0, stop_on_completion ? 1 : 0);

  if (agent_ids && Array.isArray(agent_ids)) {
    for (let i = 0; i < agent_ids.length; i++) {
      db.prepare(
        "INSERT INTO template_agents (template_id, agent_id, agent_role) VALUES (?, ?, ?)",
      ).run(id, agent_ids[i], agent_roles?.[i] || "contributor");
    }
  }

  return NextResponse.json({ id, message: "Template created" });
}
