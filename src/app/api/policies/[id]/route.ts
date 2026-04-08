import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const rule = db
    .prepare("SELECT * FROM policy_rules WHERE id = ?")
    .get(id);
  if (!rule) {
    return NextResponse.json(
      { error: "Policy rule not found" },
      { status: 404 },
    );
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
    rule_json: string;
    is_active: boolean;
  }>;

  const rule = db
    .prepare("SELECT * FROM policy_rules WHERE id = ?")
    .get(id);
  if (!rule) {
    return NextResponse.json(
      { error: "Policy rule not found" },
      { status: 404 },
    );
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) {
    updates.push("name = ?");
    values.push(body.name);
  }
  if (body.rule_json !== undefined) {
    updates.push("rule_json = ?");
    values.push(body.rule_json);
  }
  if (body.is_active !== undefined) {
    updates.push("is_active = ?");
    values.push(body.is_active ? 1 : 0);
  }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(
      `UPDATE policy_rules SET ${updates.join(", ")} WHERE id = ?`,
    ).run(...values);
  }

  const updated = db
    .prepare("SELECT * FROM policy_rules WHERE id = ?")
    .get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = db.prepare("DELETE FROM policy_rules WHERE id = ?").run(id);
  if (result.changes === 0) return NextResponse.json({ error: "Policy rule not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
