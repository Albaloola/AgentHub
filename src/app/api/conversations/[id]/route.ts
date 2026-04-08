import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const conv = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id);
  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  return NextResponse.json(conv);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const conv = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  if (body.action === "toggle_pin") {
    const currentPin = conv.is_pinned as number;
    db.prepare("UPDATE conversations SET is_pinned = ?, updated_at = datetime('now') WHERE id = ?").run(currentPin ? 0 : 1, id);
    return NextResponse.json({ is_pinned: !currentPin });
  }

  if (body.action === "move_to_folder") {
    db.prepare("UPDATE conversations SET folder_id = ?, updated_at = datetime('now') WHERE id = ?").run(body.folder_id ?? null, id);
    return NextResponse.json({ folder_id: body.folder_id ?? null });
  }

  // General field updates (name, behavior_mode, etc.)
  const allowedFields = ["name", "behavior_mode", "is_autonomous", "auto_compact_enabled", "compact_threshold", "summary"];
  const updates: string[] = [];
  const values: unknown[] = [];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE conversations SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }

  const updated = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
