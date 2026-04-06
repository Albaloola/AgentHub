import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agent_id");

  let sql = `SELECT fi.*, a.name AS agent_name
             FROM feedback_insights fi
             JOIN agents a ON a.id = fi.agent_id
             WHERE 1=1`;
  const params: unknown[] = [];

  if (agentId) {
    sql += " AND fi.agent_id = ?";
    params.push(agentId);
  }

  sql += " ORDER BY fi.created_at DESC";

  const insights = db.prepare(sql).all(...params);
  return NextResponse.json(insights);
}
