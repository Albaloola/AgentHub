/**
 * Knowledge — knowledge bases (RAG document stores), shared memory entries,
 * personas (reusable system-prompt + behaviour bundles), and prompt versions.
 */

"use client";

import { fetchJSON } from "./client";
import type {
  KnowledgeBase,
  KBDocument,
  SharedMemoryEntry,
  Persona,
  PromptVersion,
} from "@/lib/shared/types";

// --- Knowledge bases & documents ------------------------------------------

export function getKnowledgeBases(): Promise<KnowledgeBase[]> {
  return fetchJSON("/api/knowledge");
}

export function createKnowledgeBase(name: string, description?: string): Promise<{ id: string }> {
  return fetchJSON("/api/knowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
}

export function deleteKnowledgeBase(id: string): Promise<unknown> {
  return fetchJSON(`/api/knowledge/${id}`, { method: "DELETE" });
}

export function getDocuments(knowledgeBaseId: string): Promise<KBDocument[]> {
  return fetchJSON(`/api/knowledge/${knowledgeBaseId}/documents`);
}

/** Uploads via multipart form — do NOT serialise body to JSON here. */
export function uploadDocument(
  knowledgeBaseId: string,
  file: File,
): Promise<{ id: string; chunk_count: number }> {
  const formData = new FormData();
  formData.append("file", file);
  return fetchJSON(`/api/knowledge/${knowledgeBaseId}/documents`, {
    method: "POST",
    body: formData,
  });
}

export function deleteDocument(knowledgeBaseId: string, documentId: string): Promise<unknown> {
  return fetchJSON(`/api/knowledge/${knowledgeBaseId}/documents/${documentId}`, { method: "DELETE" });
}

// --- Shared memory (cross-agent key/value store) --------------------------

export function getSharedMemory(category?: string, search?: string): Promise<SharedMemoryEntry[]> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (search) params.set("search", search);
  const qs = params.toString();
  return fetchJSON(`/api/memory${qs ? `?${qs}` : ""}`);
}

export function createMemoryEntry(body: {
  key: string;
  value: string;
  category?: string;
  source_agent_id?: string;
  confidence?: number;
  expires_at?: string;
}): Promise<{ id: string }> {
  return fetchJSON("/api/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function updateMemoryEntry(
  id: string,
  body: Partial<{ value: string; category: string; confidence: number; expires_at: string }>,
): Promise<unknown> {
  return fetchJSON(`/api/memory/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteMemoryEntry(id: string): Promise<unknown> {
  return fetchJSON(`/api/memory/${id}`, { method: "DELETE" });
}

// --- Personas --------------------------------------------------------------

export function getPersonas(): Promise<Persona[]> {
  return fetchJSON("/api/personas");
}

export function createPersona(body: {
  name: string;
  category?: string;
  description?: string;
  system_prompt: string;
  behavior_mode?: string;
  capability_weights?: Record<string, number>;
}): Promise<{ id: string }> {
  return fetchJSON("/api/personas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deletePersona(id: string): Promise<unknown> {
  return fetchJSON(`/api/personas/${id}`, { method: "DELETE" });
}

// --- Prompt version history -----------------------------------------------

export function getPromptVersions(agentId?: string): Promise<PromptVersion[]> {
  const qs = agentId ? `?agent_id=${agentId}` : "";
  return fetchJSON(`/api/prompts${qs}`);
}

export function createPromptVersion(body: {
  agent_id: string;
  name?: string;
  content: string;
  variables?: string[];
  model_params?: Record<string, unknown>;
  environment?: string;
}): Promise<{ id: string }> {
  return fetchJSON("/api/prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function activatePromptVersion(id: string): Promise<unknown> {
  return fetchJSON(`/api/prompts/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "activate" }),
  });
}

export function deletePromptVersion(id: string): Promise<unknown> {
  return fetchJSON(`/api/prompts/${id}`, { method: "DELETE" });
}

export function testPrompt(agentId: string, content: string, promptContent: string): Promise<{ response: string }> {
  return fetchJSON("/api/prompts/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_id: agentId, content, prompt_content: promptContent }),
  });
}
