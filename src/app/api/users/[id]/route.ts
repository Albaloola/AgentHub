import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    display_name?: string;
    role?: string;
  };

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.display_name !== undefined) {
    updates.push("display_name = ?");
    values.push(body.display_name);
  }
  if (body.role !== undefined) {
    const validRoles = ["admin", "operator", "viewer"];
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({ error: `role must be one of: ${validRoles.join(", ")}` }, { status: 400 });
    }
    updates.push("role = ?");
    values.push(body.role);
  }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(
      ...values,
    );
  }

  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
