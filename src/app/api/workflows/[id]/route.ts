import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Workflow } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wf = db.prepare("SELECT * FROM workflows WHERE id = ?").get(id) as Workflow | undefined;
  if (!wf) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  return NextResponse.json(wf);
}

// Support both POST (legacy) and PATCH for updates
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, ctx);
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, ctx);
}

async function handleUpdate(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) { updates.push("name = ?"); values.push(body.name); }
  if (body.description !== undefined) { updates.push("description = ?"); values.push(body.description); }
  if (body.nodes !== undefined) { updates.push("nodes = ?"); values.push(JSON.stringify(body.nodes)); }
  if (body.edges !== undefined) { updates.push("edges = ?"); values.push(JSON.stringify(body.edges)); }
  if (body.is_active !== undefined) { updates.push("is_active = ?"); values.push(body.is_active ? 1 : 0); }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE workflows SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }

  return NextResponse.json({ message: "Workflow updated" });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = db.prepare("DELETE FROM workflows WHERE id = ?").run(id);
  if (result.changes === 0) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  return NextResponse.json({ message: "Workflow deleted" });
}
