import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;

  const doc = db
    .prepare("SELECT * FROM documents WHERE id = ? AND knowledge_base_id = ?")
    .get(docId, id) as { chunk_count: number } | undefined;

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Delete document (chunks cascade-deleted)
  db.prepare("DELETE FROM documents WHERE id = ?").run(docId);

  // Update KB counters (floor at 0 to prevent negatives)
  db.prepare(
    "UPDATE knowledge_bases SET document_count = MAX(0, document_count - 1), total_chunks = MAX(0, total_chunks - ?) WHERE id = ?",
  ).run(doc.chunk_count, id);

  return NextResponse.json({ ok: true });
}
