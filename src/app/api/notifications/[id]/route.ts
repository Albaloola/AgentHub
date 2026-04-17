import { NextResponse } from "next/server";
import { db, toBooleans } from "@/lib/db";
import { ensureServerRuntime } from "@/lib/backend/runtime/server-runtime";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureServerRuntime();
  const { id } = await params;
  const notification = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  db.prepare("UPDATE notifications SET is_read = 1, read_at = datetime('now') WHERE id = ?").run(id);

  const updated = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
  return NextResponse.json(toBooleans(updated as Record<string, unknown>));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureServerRuntime();
  const { id } = await params;
  const notification = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  db.prepare("DELETE FROM notifications WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
