import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 1000);
  const actorId = searchParams.get("actor_id");

  let sql = "SELECT * FROM audit_log";
  const values: unknown[] = [];

  if (actorId) {
    sql += " WHERE actor_id = ?";
    values.push(actorId);
  }

  sql += " ORDER BY created_at DESC LIMIT ?";
  values.push(limit);

  const entries = db.prepare(sql).all(...values);
  return NextResponse.json(entries);
}
