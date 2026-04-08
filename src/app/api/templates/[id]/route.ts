import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import type { Template } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const template = db.prepare("SELECT * FROM templates WHERE id = ?").get(id) as Template | undefined;
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const agents = db.prepare(
    "SELECT a.*, ta.agent_role FROM agents a JOIN template_agents ta ON ta.agent_id = a.id WHERE ta.template_id = ?",
  ).all(id);

  return NextResponse.json({ ...template, agents });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Build dynamic UPDATE to only modify fields that were explicitly provided
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) { updates.push("name = ?"); values.push(body.name); }
  if (body.description !== undefined) { updates.push("description = ?"); values.push(body.description); }
  if (body.response_mode !== undefined) { updates.push("response_mode = ?"); values.push(body.response_mode); }
  if (body.system_prompt !== undefined) { updates.push("system_prompt = ?"); values.push(body.system_prompt); }
  if (body.max_responses_per_turn !== undefined) { updates.push("max_responses_per_turn = ?"); values.push(body.max_responses_per_turn); }
  if (body.stop_on_completion !== undefined) { updates.push("stop_on_completion = ?"); values.push(body.stop_on_completion ? 1 : 0); }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE templates SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }

  return NextResponse.json({ message: "Template updated" });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = db.prepare("DELETE FROM templates WHERE id = ?").run(id);
  if (result.changes === 0) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json({ message: "Template deleted" });
}
