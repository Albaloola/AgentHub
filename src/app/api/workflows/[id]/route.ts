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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, description, nodes, edges, is_active } = await request.json();
  db.prepare(
    "UPDATE workflows SET name = COALESCE(?, name), description = COALESCE(?, description), nodes = COALESCE(?, nodes), edges = COALESCE(?, edges), is_active = COALESCE(?, is_active), updated_at = datetime('now') WHERE id = ?",
  ).run(name, description, nodes ? JSON.stringify(nodes) : null, edges ? JSON.stringify(edges) : null, is_active, id);
  return NextResponse.json({ message: "Workflow updated" });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare("DELETE FROM workflows WHERE id = ?").run(id);
  return NextResponse.json({ message: "Workflow deleted" });
}
