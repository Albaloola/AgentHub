import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface SnapshotRow {
  id: string;
  agent_id: string;
  latency_ms: number | null;
  token_count: number | null;
  error_occurred: number;
  recorded_at: string;
}

interface AvgRow {
  avg_latency: number | null;
  error_rate: number | null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const agent = db.prepare("SELECT id FROM agents WHERE id = ?").get(id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Last 50 snapshots
  const snapshots = db
    .prepare(
      "SELECT * FROM performance_snapshots WHERE agent_id = ? ORDER BY recorded_at DESC LIMIT 50",
    )
    .all(id) as SnapshotRow[];

  // 7-day averages
  const stats7d = db
    .prepare(
      `SELECT
         AVG(latency_ms) as avg_latency,
         AVG(CAST(error_occurred AS REAL)) as error_rate
       FROM performance_snapshots
       WHERE agent_id = ? AND recorded_at >= datetime('now', '-7 days')`,
    )
    .get(id) as AvgRow;

  // 1-day averages
  const stats1d = db
    .prepare(
      `SELECT
         AVG(latency_ms) as avg_latency,
         AVG(CAST(error_occurred AS REAL)) as error_rate
       FROM performance_snapshots
       WHERE agent_id = ? AND recorded_at >= datetime('now', '-1 day')`,
    )
    .get(id) as AvgRow;

  // Compute trend
  let trend: "improving" | "degrading" | "stable" = "stable";
  if (stats7d.avg_latency != null && stats1d.avg_latency != null) {
    const diff = stats1d.avg_latency - stats7d.avg_latency;
    // If 1-day latency is more than 10% lower than 7-day, improving
    // If 1-day latency is more than 10% higher than 7-day, degrading
    const threshold = stats7d.avg_latency * 0.1;
    if (diff < -threshold) {
      trend = "improving";
    } else if (diff > threshold) {
      trend = "degrading";
    }
  }

  return NextResponse.json({
    agent_id: id,
    snapshots,
    stats: {
      avg_latency_7d: stats7d.avg_latency != null ? Math.round(stats7d.avg_latency) : null,
      avg_latency_1d: stats1d.avg_latency != null ? Math.round(stats1d.avg_latency) : null,
      error_rate_7d: stats7d.error_rate != null ? Math.round(stats7d.error_rate * 10000) / 100 : null,
      trend,
    },
  });
}
