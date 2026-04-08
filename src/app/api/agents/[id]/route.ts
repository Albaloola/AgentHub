import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Agent } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as Partial<Agent>;

  const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as Agent | undefined;
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) { updates.push("name = ?"); values.push(body.name); }
  if (body.avatar_url !== undefined) { updates.push("avatar_url = ?"); values.push(body.avatar_url); }
  if (body.gateway_type !== undefined) { updates.push("gateway_type = ?"); values.push(body.gateway_type); }
  if (body.connection_url !== undefined) { updates.push("connection_url = ?"); values.push(body.connection_url); }
  if (body.connection_config !== undefined) { updates.push("connection_config = ?"); values.push(body.connection_config); }
  if (body.is_active !== undefined) { updates.push("is_active = ?"); values.push(body.is_active ? 1 : 0); }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE agents SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }

  const updated = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as Agent;
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  db.prepare("DELETE FROM agents WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
