import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const rule = db.prepare("SELECT * FROM guardrail_rules WHERE id = ?").get(id);
  if (!rule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  return NextResponse.json(rule);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as Partial<{
    name: string;
    pattern: string;
    action: string;
    is_active: boolean;
  }>;

  const rule = db.prepare("SELECT * FROM guardrail_rules WHERE id = ?").get(id);
  if (!rule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) { updates.push("name = ?"); values.push(body.name); }
  if (body.pattern !== undefined) { updates.push("pattern = ?"); values.push(body.pattern); }
  if (body.action !== undefined) { updates.push("action = ?"); values.push(body.action); }
  if (body.is_active !== undefined) { updates.push("is_active = ?"); values.push(body.is_active ? 1 : 0); }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE guardrail_rules SET ${updates.join(", ")} WHERE id = ?`).run(
      ...values,
    );
  }

  const updated = db.prepare("SELECT * FROM guardrail_rules WHERE id = ?").get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  db.prepare("DELETE FROM guardrail_rules WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
