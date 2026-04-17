/**
 * Barrel for the frontend API client.
 *
 *   import { getAgents, streamChat, getConversations } from "@/lib/frontend/api";
 *
 * Files in this folder (all `"use client"` — never import from server code):
 *
 *   client.ts         — fetchJSON helper; every other file uses it.
 *   meta.ts           — adapter metadata + per-agent capability discovery.
 *   agents.ts         — agents CRUD, health, behaviour, routing, versions, persona, analytics.
 *   channels.ts       — agent-owned channels / workspaces.
 *   conversations.ts  — conversations + checkpoints + replay + whiteboard + sharing.
 *   messages.ts       — message CRUD (pin/vote/edit) + thread replies.
 *   chat.ts           — streamChat (SSE) + regenerateMessage.
 *   organization.ts   — folders, tags, templates.
 *   workflows.ts      — workflow builder CRUD.
 *   automation.ts     — webhooks, scheduled tasks, external API keys, notifications.
 *   knowledge.ts      — knowledge bases, documents, shared memory, personas, prompts.
 *   governance.ts     — guardrails, policies, users, audit, A2A cards.
 *   observability.ts  — traces, anomalies, feedback, topics, cache, arena.
 *   integrations.ts   — third-party integrations CRUD.
 *   preferences.ts    — theme, settings, onboarding, single-file upload.
 */

export * from "./client";
export * from "./meta";
export * from "./agents";
export * from "./channels";
export * from "./conversations";
export * from "./messages";
export * from "./chat";
export * from "./organization";
export * from "./workflows";
export * from "./automation";
export * from "./knowledge";
export * from "./governance";
export * from "./observability";
export * from "./integrations";
export * from "./preferences";
