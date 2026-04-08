import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const kb = db
    .prepare("SELECT * FROM knowledge_bases WHERE id = ?")
    .get(id);
  if (!kb) {
    return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
  }

  const documents = db
    .prepare("SELECT * FROM documents WHERE knowledge_base_id = ? ORDER BY created_at DESC")
    .all(id);

  return NextResponse.json({ ...kb as Record<string, unknown>, documents });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Chunks are cascade-deleted via documents, documents via knowledge_bases
  db.prepare("DELETE FROM knowledge_bases WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
