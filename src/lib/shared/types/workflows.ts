/**
 * Workflow builder types — the visual drag-and-drop pipeline that chains
 * agents, conditions, delays, and outputs.
 */

/** A saved workflow definition. `nodes` / `edges` are JSON strings. */
export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  nodes: string;
  edges: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** One execution of a workflow. */
export interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: "running" | "completed" | "failed" | "cancelled";
  current_node: string | null;
  result: string | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

/** A single node in the visual workflow canvas. */
export interface WorkflowNode {
  id: string;
  type: "agent" | "condition" | "delay" | "output";
  agent_id?: string;
  label: string;
  position: { x: number; y: number };
  data?: Record<string, unknown>;
}

/** A connection between two workflow nodes. */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}
