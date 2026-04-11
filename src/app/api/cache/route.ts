import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface CacheRow {
  id: string;
  agent_id: string;
  prompt_hash: string;
  response: string;
  token_count: number;
  hit_count: number;
  created_at: string;
  expires_at: string | null;
}

export async function GET() {
  try {
    // Get cache stats
    const totalEntries = (
      db.prepare("SELECT COUNT(*) as count FROM response_cache").get() as { count: number }
    ).count;

    const totalHits = (
      db.prepare("SELECT COALESCE(SUM(hit_count), 0) as total FROM response_cache").get() as { total: number }
    ).total;

    const totalTokens = (
      db.prepare("SELECT COALESCE(SUM(token_count), 0) as total FROM response_cache").get() as { total: number }
    ).total;

    // Estimate size (rough: response text length in bytes)
    const totalSize = (
      db.prepare("SELECT COALESCE(SUM(LENGTH(response)), 0) as total FROM response_cache").get() as { total: number }
    ).total;

    // Get recent cache entries (last 20)
    const entries = db
      .prepare(
        `SELECT rc.*, a.name as agent_name
         FROM response_cache rc
         LEFT JOIN agents a ON a.id = rc.agent_id
         ORDER BY rc.created_at DESC
         LIMIT 20`
      )
      .all() as (CacheRow & { agent_name: string | null })[];

    // Expired count
    const expiredCount = (
      db.prepare(
        "SELECT COUNT(*) as count FROM response_cache WHERE expires_at IS NOT NULL AND expires_at < datetime('now')"
      ).get() as { count: number }
    ).count;

    return NextResponse.json({
      stats: {
        total_entries: totalEntries,
        total_hits: totalHits,
        total_tokens: totalTokens,
        total_size_bytes: totalSize,
        expired_count: expiredCount,
        hit_rate: totalEntries > 0 ? totalHits / Math.max(totalEntries, 1) : 0,
      },
      entries: entries.map((e) => ({
        id: e.id,
        agent_id: e.agent_id,
        agent_name: e.agent_name,
        prompt_hash: e.prompt_hash,
        token_count: e.token_count,
        hit_count: e.hit_count,
        response_preview: e.response.slice(0, 120),
        created_at: e.created_at,
        expires_at: e.expires_at,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch cache stats" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const result = db.prepare("DELETE FROM response_cache").run();
    return NextResponse.json({
      message: "Cache cleared",
      deleted_count: result.changes,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}
