import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const card = db
    .prepare("SELECT * FROM a2a_agent_cards WHERE id = ?")
    .get(id);
  if (!card) {
    return NextResponse.json(
      { error: "Agent card not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(card);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as Partial<{
    card_json: string;
    is_published: boolean;
  }>;

  const card = db
    .prepare("SELECT * FROM a2a_agent_cards WHERE id = ?")
    .get(id);
  if (!card) {
    return NextResponse.json(
      { error: "Agent card not found" },
      { status: 404 },
    );
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.card_json !== undefined) {
    updates.push("card_json = ?");
    values.push(body.card_json);
  }
  if (body.is_published !== undefined) {
    updates.push("is_published = ?");
    values.push(body.is_published ? 1 : 0);
  }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(
      `UPDATE a2a_agent_cards SET ${updates.join(", ")} WHERE id = ?`,
    ).run(...values);
  }

  const updated = db
    .prepare("SELECT * FROM a2a_agent_cards WHERE id = ?")
    .get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = db.prepare("DELETE FROM a2a_agent_cards WHERE id = ?").run(id);
  if (result.changes === 0) return NextResponse.json({ error: "Agent card not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
