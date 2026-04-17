import { v4 as uuid } from "uuid";
import { getAdapterMeta } from "@/lib/adapters";
import { db, toBooleans } from "@/lib/backend/db";
import type {
  Agent,
  AgentCapabilitiesByChannel,
  AgentChannel,
  AgentChannelWithAgent,
  CapabilityCommand,
  CapabilityFlags,
  Conversation,
} from "@/lib/shared/types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "channel";
}

function nextSortOrder(agentId: string) {
  const row = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM agent_channels WHERE agent_id = ?")
    .get(agentId) as { max_sort: number };
  return (row.max_sort ?? -1) + 1;
}

function parseStringArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function getCapabilityDefaults(): CapabilityFlags {
  return {
    streaming: false,
    toolCalls: false,
    healthCheck: false,
    thinking: false,
    subagents: false,
    fileUpload: { enabled: false },
    commands: false,
  };
}

function filterCommands(commands: CapabilityCommand[], channel: AgentChannel | null) {
  if (!channel) {
    return commands;
  }
  const enabled = parseStringArray(channel.enabled_commands_json);
  if (enabled.length === 0) {
    return commands;
  }
  return commands.filter((command) => enabled.includes(command.name));
}

export function ensureUniqueChannelSlug(agentId: string, name: string, requestedSlug?: string) {
  const base = slugify(requestedSlug ?? name);
  let slug = base;
  let counter = 2;

  while (true) {
    const existing = db
      .prepare("SELECT id FROM agent_channels WHERE agent_id = ? AND slug = ?")
      .get(agentId, slug) as { id: string } | undefined;
    if (!existing) {
      return slug;
    }
    slug = `${base}-${counter}`;
    counter += 1;
  }
}

function hydrateChannel(row: Record<string, unknown>) {
  return toBooleans(row) as unknown as AgentChannel;
}

export function listChannels(options?: { agentId?: string; includeArchived?: boolean }) {
  const where: string[] = [];
  const values: unknown[] = [];

  if (options?.agentId) {
    where.push("ac.agent_id = ?");
    values.push(options.agentId);
  }
  if (!options?.includeArchived) {
    where.push("ac.is_archived = 0");
  }

  const sql = `
    SELECT ac.*, COUNT(conv.id) as conversation_count, MAX(conv.updated_at) as last_conversation_at
    FROM agent_channels ac
    LEFT JOIN conversations conv ON conv.channel_id = ac.id
    ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
    GROUP BY ac.id
    ORDER BY ac.is_pinned DESC, ac.sort_order ASC, ac.updated_at DESC
  `;

  const rows = db.prepare(sql).all(...values) as (Record<string, unknown> & {
    conversation_count: number;
    last_conversation_at: string | null;
  })[];

  if (rows.length === 0) {
    return [] as AgentChannelWithAgent[];
  }

  const agentIds = [...new Set(rows.map((row) => String(row.agent_id)))];
  const placeholders = agentIds.map(() => "?").join(",");
  const agents = db.prepare(`SELECT * FROM agents WHERE id IN (${placeholders})`).all(...agentIds) as Agent[];
  const agentMap = new Map(agents.map((agent) => [agent.id, agent]));

  return rows.map((row) => ({
    ...hydrateChannel(row),
    conversation_count: Number(row.conversation_count ?? 0),
    last_conversation_at: row.last_conversation_at,
    agent: agentMap.get(String(row.agent_id)),
  })) as AgentChannelWithAgent[];
}

export function createChannel(input: {
  agentId: string;
  name: string;
  slug?: string;
  description?: string | null;
  icon?: string;
  color?: string;
  isPinned?: boolean;
  defaultModel?: string | null;
  defaultSystemPrompt?: string | null;
  defaultResponseMode?: AgentChannel["default_response_mode"];
  enabledCommands?: string[];
  notificationPrefs?: Record<string, boolean>;
}) {
  const id = uuid();
  const slug = ensureUniqueChannelSlug(input.agentId, input.name, input.slug);
  db.prepare(
    `INSERT INTO agent_channels (
      id, agent_id, name, slug, description, icon, color, is_pinned, sort_order,
      default_model, default_system_prompt, default_response_mode,
      enabled_commands_json, notification_prefs_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.agentId,
    input.name,
    slug,
    input.description ?? null,
    input.icon ?? "hash",
    input.color ?? "#5b6bff",
    input.isPinned ? 1 : 0,
    nextSortOrder(input.agentId),
    input.defaultModel ?? null,
    input.defaultSystemPrompt ?? null,
    input.defaultResponseMode ?? "discussion",
    JSON.stringify(input.enabledCommands ?? []),
    JSON.stringify(input.notificationPrefs ?? {}),
  );

  return getChannelById(id);
}

export function getChannelById(channelId: string) {
  const row = db.prepare("SELECT * FROM agent_channels WHERE id = ?").get(channelId) as Record<string, unknown> | undefined;
  return row ? hydrateChannel(row) : undefined;
}

export function updateChannel(
  channelId: string,
  input: Partial<{
    name: string;
    slug: string;
    description: string | null;
    icon: string;
    color: string;
    is_pinned: boolean;
    sort_order: number;
    default_model: string | null;
    default_system_prompt: string | null;
    default_response_mode: AgentChannel["default_response_mode"];
    enabled_commands: string[];
    notification_prefs: Record<string, boolean>;
    is_archived: boolean;
  }>,
) {
  const existing = getChannelById(channelId);
  if (!existing) {
    return undefined;
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    values.push(input.name);
  }
  if (input.slug !== undefined) {
    updates.push("slug = ?");
    values.push(ensureUniqueChannelSlug(existing.agent_id, input.name ?? existing.name, input.slug));
  }
  if (input.description !== undefined) {
    updates.push("description = ?");
    values.push(input.description);
  }
  if (input.icon !== undefined) {
    updates.push("icon = ?");
    values.push(input.icon);
  }
  if (input.color !== undefined) {
    updates.push("color = ?");
    values.push(input.color);
  }
  if (input.is_pinned !== undefined) {
    updates.push("is_pinned = ?");
    values.push(input.is_pinned ? 1 : 0);
  }
  if (input.sort_order !== undefined) {
    updates.push("sort_order = ?");
    values.push(input.sort_order);
  }
  if (input.default_model !== undefined) {
    updates.push("default_model = ?");
    values.push(input.default_model);
  }
  if (input.default_system_prompt !== undefined) {
    updates.push("default_system_prompt = ?");
    values.push(input.default_system_prompt);
  }
  if (input.default_response_mode !== undefined) {
    updates.push("default_response_mode = ?");
    values.push(input.default_response_mode);
  }
  if (input.enabled_commands !== undefined) {
    updates.push("enabled_commands_json = ?");
    values.push(JSON.stringify(input.enabled_commands));
  }
  if (input.notification_prefs !== undefined) {
    updates.push("notification_prefs_json = ?");
    values.push(JSON.stringify(input.notification_prefs));
  }
  if (input.is_archived !== undefined) {
    updates.push("is_archived = ?");
    values.push(input.is_archived ? 1 : 0);
  }

  if (updates.length === 0) {
    return existing;
  }

  values.push(channelId);
  db.prepare(`UPDATE agent_channels SET ${updates.join(", ")}, updated_at = datetime('now') WHERE id = ?`).run(...values);
  return getChannelById(channelId);
}

export function archiveChannel(channelId: string) {
  return updateChannel(channelId, { is_archived: true });
}

export function createConversationFromChannel(input: {
  channelId: string;
  name?: string;
  type?: Conversation["type"];
  agentIds?: string[];
  responseMode?: "discussion" | "parallel" | "targeted";
}) {
  const channel = getChannelById(input.channelId);
  if (!channel) {
    throw new Error("Channel not found");
  }

  const conversationId = uuid();
  const type = input.type ?? "single";
  const name = input.name ?? channel.name;

  if (type === "group") {
    db.prepare(
      `INSERT INTO conversations (id, type, name, agent_id, channel_id)
       VALUES (?, 'group', ?, ?, ?)`,
    ).run(conversationId, name, channel.agent_id, channel.id);

    const insertAgent = db.prepare(
      "INSERT INTO conversation_agents (conversation_id, agent_id, response_mode) VALUES (?, ?, ?)",
    );
    for (const agentId of new Set([channel.agent_id, ...(input.agentIds ?? [])])) {
      insertAgent.run(conversationId, agentId, input.responseMode ?? channel.default_response_mode);
    }
  } else {
    db.prepare(
      `INSERT INTO conversations (id, type, name, agent_id, channel_id)
       VALUES (?, 'single', ?, ?, ?)`,
    ).run(conversationId, name, channel.agent_id, channel.id);
  }

  return db.prepare("SELECT * FROM conversations WHERE id = ?").get(conversationId) as Conversation;
}

export function channelBelongsToAgent(channelId: string | null | undefined, agentId: string) {
  if (!channelId) {
    return true;
  }
  const channel = getChannelById(channelId);
  return !!channel && channel.agent_id === agentId && !channel.is_archived;
}

export function buildAgentCapabilitiesByChannel(agent: Agent, requestedChannelId?: string | null) {
  const meta = getAdapterMeta(agent.gateway_type);
  const baseCapabilities = meta?.capabilities ?? getCapabilityDefaults();
  const baseCommands = (meta?.commands ?? []) as CapabilityCommand[];
  const channels = listChannels({ agentId: agent.id }).map((channel) => ({
    channel,
    capabilities: {
      ...baseCapabilities,
      commands: filterCommands(baseCommands, channel).length > 0,
    },
    commands: filterCommands(baseCommands, channel),
  }));

  const requestedChannel = requestedChannelId
    ? channels.find((entry) => entry.channel.id === requestedChannelId)?.channel ?? null
    : null;

  const isSupportedOnChannel = requestedChannelId ? !!requestedChannel : true;
  const effectiveCommands = requestedChannel ? filterCommands(baseCommands, requestedChannel) : baseCommands;
  const effectiveCapabilities = isSupportedOnChannel
    ? {
        ...baseCapabilities,
        commands: effectiveCommands.length > 0,
      }
    : getCapabilityDefaults();

  return {
    agent_id: agent.id,
    agent_name: agent.name,
    gateway_type: agent.gateway_type,
    requested_channel_id: requestedChannelId ?? null,
    is_supported_on_channel: isSupportedOnChannel,
    channel: requestedChannel,
    capabilities: effectiveCapabilities,
    commands: isSupportedOnChannel ? effectiveCommands : [],
    maxContextTokens: meta?.maxContextTokens,
    contextReset: meta?.contextReset ?? false,
    fileUpload: effectiveCapabilities.fileUpload ?? { enabled: false },
    thinking: isSupportedOnChannel ? effectiveCapabilities.thinking ?? false : false,
    subagents: isSupportedOnChannel ? effectiveCapabilities.subagents ?? false : false,
    channels,
  } satisfies AgentCapabilitiesByChannel;
}
