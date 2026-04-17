import { NextResponse } from "next/server";
import { db, toBooleans } from "@/lib/db";
import { v4 as uuid } from "uuid";
import type { Agent, AgentChannel, Conversation, ConversationWithDetails, Message, Tag } from "@/lib/types";
import { ensureServerRuntime } from "@/lib/backend/runtime/server-runtime";
import { createConversationFromChannel, getChannelById } from "@/lib/backend/services/channels";

export async function GET(request: Request) {
  ensureServerRuntime();

  const url = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "200", 10), 1), 500);
  const channelId = url.searchParams.get("channel_id");
  const pinnedOnly = url.searchParams.get("pinned") === "true";

  const filters: string[] = [];
  const values: unknown[] = [];
  if (channelId) {
    filters.push("channel_id = ?");
    values.push(channelId);
  }
  if (pinnedOnly) {
    filters.push("is_pinned = 1");
  }

  const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
  const conversations = db
    .prepare(`SELECT * FROM conversations ${where} ORDER BY is_pinned DESC, updated_at DESC LIMIT ?`)
    .all(...values, limit) as Conversation[];

  if (conversations.length === 0) return NextResponse.json([]);

  const convIds = conversations.map((c) => c.id);
  const placeholders = convIds.map(() => "?").join(",");
  const channelIds = [...new Set(conversations.map((c) => c.channel_id).filter(Boolean))] as string[];

  // Batch: all agents referenced by single conversations
  const singleAgentIds = conversations.filter((c) => c.type === "single" && c.agent_id).map((c) => c.agent_id!);
  const agentMap = new Map<string, Agent>();
  if (singleAgentIds.length > 0) {
    const uniqueIds = [...new Set(singleAgentIds)];
    const ph = uniqueIds.map(() => "?").join(",");
    const agents = db.prepare(`SELECT * FROM agents WHERE id IN (${ph})`).all(...uniqueIds) as Agent[];
    for (const a of agents) agentMap.set(a.id, a);
  }

  // Batch: all group agent assignments
  const groupAgents = db.prepare(
    `SELECT ca.conversation_id, a.* FROM agents a JOIN conversation_agents ca ON ca.agent_id = a.id WHERE ca.conversation_id IN (${placeholders})`,
  ).all(...convIds) as (Agent & { conversation_id: string })[];
  const groupAgentMap = new Map<string, Agent[]>();
  for (const ga of groupAgents) {
    const list = groupAgentMap.get(ga.conversation_id) || [];
    list.push(ga);
    groupAgentMap.set(ga.conversation_id, list);
  }

  // Batch: message counts
  const msgCounts = db.prepare(
    `SELECT conversation_id, COUNT(*) as c FROM messages WHERE conversation_id IN (${placeholders}) GROUP BY conversation_id`,
  ).all(...convIds) as { conversation_id: string; c: number }[];
  const countMap = new Map(msgCounts.map((r) => [r.conversation_id, r.c]));

  // Batch: last messages (using window function)
  const lastMessages = db.prepare(
    `SELECT * FROM messages WHERE id IN (
      SELECT id FROM (
        SELECT id, conversation_id, ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at DESC) as rn
        FROM messages WHERE conversation_id IN (${placeholders})
      ) WHERE rn = 1
    )`,
  ).all(...convIds) as Message[];
  const lastMsgMap = new Map(lastMessages.map((m) => [m.conversation_id, m]));

  // Batch: tags
  const allTags = db.prepare(
    `SELECT ct.conversation_id, t.* FROM tags t JOIN conversation_tags ct ON ct.tag_id = t.id WHERE ct.conversation_id IN (${placeholders})`,
  ).all(...convIds) as (Tag & { conversation_id: string })[];
  const tagMap = new Map<string, Tag[]>();
  for (const t of allTags) {
    const list = tagMap.get(t.conversation_id) || [];
    list.push(t);
    tagMap.set(t.conversation_id, list);
  }

  const channelMap = new Map<string, AgentChannel>();
  if (channelIds.length > 0) {
    const channelPlaceholders = channelIds.map(() => "?").join(",");
    const channels = db
      .prepare(`SELECT * FROM agent_channels WHERE id IN (${channelPlaceholders})`)
      .all(...channelIds) as AgentChannel[];
    for (const channel of channels) {
      channelMap.set(channel.id, toBooleans(channel as unknown as Record<string, unknown>) as unknown as AgentChannel);
    }
  }

  const results: ConversationWithDetails[] = conversations.map((conv) => {
    let agents: Agent[] = [];
    if (conv.type === "single" && conv.agent_id) {
      const agent = agentMap.get(conv.agent_id);
      if (agent) agents = [agent];
    } else if (conv.type === "group") {
      agents = groupAgentMap.get(conv.id) || [];
    }

    return toBooleans({
      ...conv,
      agents,
      channel: conv.channel_id ? channelMap.get(conv.channel_id) ?? null : null,
      last_message: lastMsgMap.get(conv.id),
      message_count: countMap.get(conv.id) ?? 0,
      tags: tagMap.get(conv.id) ?? [],
    });
  });

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  ensureServerRuntime();

  const body = (await request.json()) as {
    channel_id?: string;
    agent_id?: string;
    agent_ids?: string[];
    name?: string;
    type?: "single" | "group";
    response_mode?: string;
  };

  if (body.channel_id) {
    const channel = getChannelById(body.channel_id);
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }
    if (body.agent_id && body.agent_id !== channel.agent_id) {
      return NextResponse.json({ error: "Selected channel does not belong to the requested agent" }, { status: 400 });
    }
    const conversation = createConversationFromChannel({
      channelId: body.channel_id,
      name: body.name,
      type: body.type,
      agentIds: body.agent_ids,
      responseMode: body.response_mode as "discussion" | "parallel" | "targeted" | undefined,
    });
    return NextResponse.json({ id: conversation.id }, { status: 201 });
  }

  const id = uuid();

  if (body.type === "group" && body.agent_ids?.length) {
    const name = body.name ?? "Group Chat";
    db.prepare(
      "INSERT INTO conversations (id, type, name) VALUES (?, ?, ?)",
    ).run(id, "group", name);

    const insertAgent = db.prepare(
      "INSERT INTO conversation_agents (conversation_id, agent_id, response_mode) VALUES (?, ?, ?)",
    );
    for (const agentId of body.agent_ids) {
      insertAgent.run(id, agentId, body.response_mode ?? "discussion");
    }
  } else if (body.agent_id) {
    const agent = db.prepare("SELECT name FROM agents WHERE id = ?").get(body.agent_id) as { name: string } | undefined;
    const name = body.name ?? agent?.name ?? "Chat";
    db.prepare(
      "INSERT INTO conversations (id, type, name, agent_id) VALUES (?, ?, ?, ?)",
    ).run(id, "single", name, body.agent_id);
  } else {
    return NextResponse.json({ error: "agent_id or agent_ids required" }, { status: 400 });
  }

  return NextResponse.json({ id }, { status: 201 });
}
