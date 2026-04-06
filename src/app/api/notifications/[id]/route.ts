import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const notification = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(id);

  const updated = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const notification = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  db.prepare("DELETE FROM notifications WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
