import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const entry = db.prepare("SELECT * FROM shared_memory WHERE id = ?").get(id);
  if (!entry) {
    return NextResponse.json({ error: "Memory entry not found" }, { status: 404 });
  }

  // Increment access_count and update last_accessed
  db.prepare(
    "UPDATE shared_memory SET access_count = access_count + 1, last_accessed = datetime('now') WHERE id = ?",
  ).run(id);

  const updated = db.prepare("SELECT * FROM shared_memory WHERE id = ?").get(id);
  return NextResponse.json(updated);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    value?: string;
    confidence?: number;
    category?: string;
    expires_at?: string;
  };

  const entry = db.prepare("SELECT * FROM shared_memory WHERE id = ?").get(id);
  if (!entry) {
    return NextResponse.json({ error: "Memory entry not found" }, { status: 404 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.value !== undefined) { updates.push("value = ?"); values.push(body.value); }
  if (body.confidence !== undefined) { updates.push("confidence = ?"); values.push(body.confidence); }
  if (body.category !== undefined) { updates.push("category = ?"); values.push(body.category); }
  if (body.expires_at !== undefined) { updates.push("expires_at = ?"); values.push(body.expires_at); }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE shared_memory SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }

  const updated = db.prepare("SELECT * FROM shared_memory WHERE id = ?").get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const entry = db.prepare("SELECT * FROM shared_memory WHERE id = ?").get(id);
  if (!entry) {
    return NextResponse.json({ error: "Memory entry not found" }, { status: 404 });
  }
  db.prepare("DELETE FROM shared_memory WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
