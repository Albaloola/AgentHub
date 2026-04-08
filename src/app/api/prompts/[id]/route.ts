import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const version = db
    .prepare("SELECT * FROM prompt_versions WHERE id = ?")
    .get(id);
  if (!version) {
    return NextResponse.json({ error: "Prompt version not found" }, { status: 404 });
  }

  return NextResponse.json(version);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { action: string };

  if (body.action !== "activate") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const version = db
    .prepare("SELECT * FROM prompt_versions WHERE id = ?")
    .get(id) as { agent_id: string; name: string } | undefined;
  if (!version) {
    return NextResponse.json({ error: "Prompt version not found" }, { status: 404 });
  }

  // Deactivate all other versions for same agent+name
  db.prepare(
    "UPDATE prompt_versions SET is_active = 0 WHERE agent_id = ? AND name = ?",
  ).run(version.agent_id, version.name);

  // Activate this version
  db.prepare("UPDATE prompt_versions SET is_active = 1 WHERE id = ?").run(id);

  const updated = db
    .prepare("SELECT * FROM prompt_versions WHERE id = ?")
    .get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = db.prepare("DELETE FROM prompt_versions WHERE id = ?").run(id);
  if (result.changes === 0) return NextResponse.json({ error: "Prompt version not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
