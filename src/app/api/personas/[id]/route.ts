import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const persona = db.prepare("SELECT * FROM personas WHERE id = ?").get(id);

  if (!persona) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  return NextResponse.json(persona);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const persona = db.prepare("SELECT * FROM personas WHERE id = ?").get(id);

  if (!persona) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM personas WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
