import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agent_id");
  const resolved = searchParams.get("resolved");

  let sql = `SELECT ae.*, a.name AS agent_name
             FROM anomaly_events ae
             JOIN agents a ON a.id = ae.agent_id
             WHERE 1=1`;
  const params: unknown[] = [];

  if (agentId) {
    sql += " AND ae.agent_id = ?";
    params.push(agentId);
  }

  if (resolved !== null) {
    sql += " AND ae.is_resolved = ?";
    params.push(resolved === "true" ? 1 : 0);
  }

  sql += " ORDER BY ae.created_at DESC";

  const anomalies = db.prepare(sql).all(...params);
  return NextResponse.json(anomalies);
}
