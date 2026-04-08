import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; vid: string }> },
) {
  const { id, vid } = await params;
  const body = (await request.json()) as { traffic_pct: number };

  const version = db
    .prepare(
      "SELECT * FROM agent_versions WHERE id = ? AND agent_id = ?",
    )
    .get(vid, id);
  if (!version) {
    return NextResponse.json(
      { error: "Version not found" },
      { status: 404 },
    );
  }

  db.prepare("UPDATE agent_versions SET traffic_pct = ? WHERE id = ?").run(
    body.traffic_pct,
    vid,
  );

  const updated = db
    .prepare("SELECT * FROM agent_versions WHERE id = ?")
    .get(vid);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; vid: string }> },
) {
  const { id, vid } = await params;

  db.prepare(
    "DELETE FROM agent_versions WHERE id = ? AND agent_id = ?",
  ).run(vid, id);
  return NextResponse.json({ ok: true });
}
