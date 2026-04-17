/**
 * Barrel export for all shared types.
 *
 * Imports look like `import type { Agent, Message } from "@/lib/shared/types";`
 *
 * The original `@/lib/types` path still works via a shim (see `src/lib/types.ts`)
 * so existing code doesn't have to change. New code should use this path.
 *
 * Files are grouped by domain:
 *   core              — Agent, Conversation, Message, ToolCall, Tag
 *   channels          — first-class agent channels + channel-aware capabilities
 *   chat              — templates, threads, checkpoints, votes, folders, subagents
 *   workflows         — visual pipeline builder
 *   adapter-protocol  — the contract adapters implement
 *   automation        — webhooks, scheduled tasks, integrations, API keys, notifications
 *   knowledge         — knowledge bases, shared memory, personas, prompt versions
 *   observability     — traces, performance, anomalies, routing, topics, feedback
 *   governance        — guardrails, policies, users, RBAC, audit, permissions, A2A
 *   arena             — head-to-head evaluation rounds
 *   ui                — theme preferences, onboarding state
 */

export * from "./core";
export * from "./channels";
export * from "./chat";
export * from "./workflows";
export * from "./adapter-protocol";
export * from "./automation";
export * from "./knowledge";
export * from "./observability";
export * from "./governance";
export * from "./arena";
export * from "./ui";
