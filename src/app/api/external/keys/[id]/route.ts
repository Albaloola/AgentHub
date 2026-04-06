import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const key = db.prepare("SELECT id FROM api_keys WHERE id = ?").get(id);
  if (!key) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM api_keys WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
