import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const integration = db
    .prepare("SELECT * FROM integrations WHERE id = ?")
    .get(id);
  if (!integration) {
    return NextResponse.json(
      { error: "Integration not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(integration);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as Partial<{
    name: string;
    config: string;
    is_active: boolean;
  }>;

  const integration = db
    .prepare("SELECT * FROM integrations WHERE id = ?")
    .get(id);
  if (!integration) {
    return NextResponse.json(
      { error: "Integration not found" },
      { status: 404 },
    );
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) {
    updates.push("name = ?");
    values.push(body.name);
  }
  if (body.config !== undefined) {
    updates.push("config = ?");
    values.push(body.config);
  }
  if (body.is_active !== undefined) {
    updates.push("is_active = ?");
    values.push(body.is_active ? 1 : 0);
  }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(
      `UPDATE integrations SET ${updates.join(", ")} WHERE id = ?`,
    ).run(...values);
  }

  const updated = db
    .prepare("SELECT * FROM integrations WHERE id = ?")
    .get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  db.prepare("DELETE FROM integrations WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
