import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as Partial<{
    name: string;
    color: string;
    sort_order: number;
  }>;

  const folder = db
    .prepare("SELECT * FROM conversation_folders WHERE id = ?")
    .get(id);
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) { updates.push("name = ?"); values.push(body.name); }
  if (body.color !== undefined) { updates.push("color = ?"); values.push(body.color); }
  if (body.sort_order !== undefined) { updates.push("sort_order = ?"); values.push(body.sort_order); }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE conversation_folders SET ${updates.join(", ")} WHERE id = ?`).run(
      ...values,
    );
  }

  const updated = db
    .prepare("SELECT * FROM conversation_folders WHERE id = ?")
    .get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Unset folder_id on conversations in this folder
  db.prepare("UPDATE conversations SET folder_id = NULL WHERE folder_id = ?").run(id);

  db.prepare("DELETE FROM conversation_folders WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
