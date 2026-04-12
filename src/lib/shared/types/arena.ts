/**
 * Arena — head-to-head evaluation rounds where a prompt is sent to multiple
 * agents simultaneously and users vote on the winner.
 */

export interface ArenaRound {
  id: string;
  prompt: string;
  category: string | null;
  agents: string;     // JSON string — string[] of agent IDs
  results: string;    // JSON string — Record<agent_id, response>
  winner_agent_id: string | null;
  status: string;
  created_at: string;
}
