import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface PersonaRow {
  id: string;
  system_prompt: string;
  behavior_mode: string;
  capability_weights: string;
}

interface AgentRow {
  id: string;
  connection_config: string;
  behavior_modes: string;
  capability_weights: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { persona_id: string };

  if (!body.persona_id) {
    return NextResponse.json(
      { error: "persona_id is required" },
      { status: 400 },
    );
  }

  const agent = db
    .prepare("SELECT id, connection_config, behavior_modes, capability_weights FROM agents WHERE id = ?")
    .get(id) as AgentRow | undefined;

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const persona = db
    .prepare("SELECT id, system_prompt, behavior_mode, capability_weights FROM personas WHERE id = ?")
    .get(body.persona_id) as PersonaRow | undefined;

  if (!persona) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  // Apply persona system_prompt into agent connection_config
  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(agent.connection_config || "{}");
  } catch {
    config = {};
  }
  config.system_prompt = persona.system_prompt;

  // Update agent behavior_modes with persona's behavior_mode
  let modes: Record<string, unknown> = {};
  try {
    modes = JSON.parse(agent.behavior_modes || "{}");
  } catch {
    modes = {};
  }
  modes.active = persona.behavior_mode;
  modes.persona_id = persona.id;

  db.prepare(
    `UPDATE agents
     SET connection_config = ?,
         behavior_modes = ?,
         capability_weights = ?
     WHERE id = ?`,
  ).run(
    JSON.stringify(config),
    JSON.stringify(modes),
    persona.capability_weights,
    id,
  );

  // Increment persona usage_count
  db.prepare(
    "UPDATE personas SET usage_count = usage_count + 1 WHERE id = ?",
  ).run(persona.id);

  const updated = db.prepare("SELECT * FROM agents WHERE id = ?").get(id);
  return NextResponse.json(updated);
}
