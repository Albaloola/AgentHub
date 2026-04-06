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
  const { name, description, response_mode, system_prompt, max_responses_per_turn, stop_on_completion } = body;

  db.prepare(
    "UPDATE templates SET name = COALESCE(?, name), description = COALESCE(?, description), response_mode = COALESCE(?, response_mode), system_prompt = COALESCE(?, system_prompt), max_responses_per_turn = COALESCE(?, max_responses_per_turn), stop_on_completion = COALESCE(?, stop_on_completion) WHERE id = ?",
  ).run(name, description, response_mode, system_prompt, max_responses_per_turn, stop_on_completion ? 1 : 0, id);

  return NextResponse.json({ message: "Template updated" });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare("DELETE FROM templates WHERE id = ?").run(id);
  return NextResponse.json({ message: "Template deleted" });
}
