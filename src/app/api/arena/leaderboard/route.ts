import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface ArenaRow {
  agents: string;
  winner_agent_id: string | null;
}

export async function GET() {
  const rounds = db
    .prepare("SELECT agents, winner_agent_id FROM arena_rounds WHERE status = 'completed'")
    .all() as ArenaRow[];

  const stats: Record<string, { wins: number; total_rounds: number }> = {};

  for (const round of rounds) {
    const agentIds: string[] = JSON.parse(round.agents);
    for (const agentId of agentIds) {
      if (!stats[agentId]) {
        stats[agentId] = { wins: 0, total_rounds: 0 };
      }
      stats[agentId].total_rounds++;
      if (round.winner_agent_id === agentId) {
        stats[agentId].wins++;
      }
    }
  }

  // Look up agent names
  const agentIds = Object.keys(stats);
  const leaderboard = agentIds.map((agentId) => {
    const agent = db.prepare("SELECT name FROM agents WHERE id = ?").get(agentId) as
      | { name: string }
      | undefined;
    const s = stats[agentId];
    return {
      agent_id: agentId,
      agent_name: agent?.name ?? "Unknown",
      wins: s.wins,
      total_rounds: s.total_rounds,
      win_rate: s.total_rounds > 0 ? s.wins / s.total_rounds : 0,
    };
  });

  leaderboard.sort((a, b) => b.wins - a.wins);

  return NextResponse.json(leaderboard);
}
