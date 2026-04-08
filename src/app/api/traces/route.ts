import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversation_id");
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  let sql = `
    SELECT t.*, a.name as agent_name
    FROM traces t
    LEFT JOIN agents a ON a.id = t.agent_id
    WHERE 1=1`;
  const params: unknown[] = [];

  if (conversationId) {
    sql += " AND t.conversation_id = ?";
    params.push(conversationId);
  }

  sql += " ORDER BY t.created_at DESC LIMIT ?";
  params.push(limit);

  const traces = db.prepare(sql).all(...params);
  return NextResponse.json(traces);
}
