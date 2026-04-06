import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { vote_type } = await request.json();

  const existing = db.prepare(
    "SELECT id FROM response_votes WHERE message_id = ? AND vote_type = ?",
  ).get(id, vote_type) as { id: string } | undefined;

  if (existing) {
    db.prepare("DELETE FROM response_votes WHERE id = ?").run(existing.id);
  } else {
    db.prepare("DELETE FROM response_votes WHERE message_id = ?").run(id);
    db.prepare(
      "INSERT INTO response_votes (id, message_id, vote_type) VALUES (?, ?, ?)",
    ).run(uuid(), id, vote_type);
  }

  const votes = db.prepare(
    "SELECT vote_type, COUNT(*) as count FROM response_votes WHERE message_id = ? GROUP BY vote_type",
  ).all(id) as { vote_type: string; count: number }[];

  return NextResponse.json({
    up: votes.find(v => v.vote_type === "up")?.count ?? 0,
    down: votes.find(v => v.vote_type === "down")?.count ?? 0,
  });
}
