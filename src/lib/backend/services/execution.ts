import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import { createAdapter } from "@/lib/adapters";
import { channelBelongsToAgent, getChannelById } from "@/lib/backend/services/channels";
import type {
  Agent,
  AgentChannel,
  AgentMessage,
  AgentResponseChunk,
  Conversation,
  Message,
} from "@/lib/shared/types";

const COMPLETION_PHRASES = [
  "i'm on it", "i am on it", "on it", "i'll handle", "i will handle",
  "i've completed", "i have completed", "task complete", "task completed",
  "done", "finished", "deployed", "deployment complete", "all set",
  "that's all", "that is all", "nothing more", "no further",
  "let me know if", "feel free to", "happy to help",
  "thank you", "thanks", "you're welcome", "you are welcome",
  "acknowledged", "understood", "got it", "roger",
  "i'll let you know", "i will let you know", "i'll keep you posted",
  "standing by", "awaiting further", "ready when you are",
];

type ConversationAgentRow = Agent & {
  response_mode: "discussion" | "parallel" | "targeted";
  agent_role: "leader" | "reviewer" | "executor" | "observer" | "contributor";
};

type ExecutionEvent = Record<string, unknown>;

export interface ExecuteConversationTurnInput {
  conversationId: string;
  content: string;
  targetAgentId?: string;
  onEvent?: (event: ExecutionEvent) => void;
}

export interface ExecuteConversationTurnResult {
  conversationId: string;
  userMessageId: string;
  channelId: string | null;
  agentResults: {
    agentId: string;
    agentName: string;
    messageId: string;
    content: string;
    tokenCount: number;
  }[];
}

export interface ExecuteSingleAgentRequestInput {
  agentId?: string;
  agent?: Agent;
  conversationId?: string | null;
  channelId?: string | null;
  content: string;
  conversationName?: string;
  metadata?: AgentMessage["metadata"];
  onEvent?: (event: ExecutionEvent) => void;
}

export interface ExecuteSingleAgentRequestResult {
  conversationId: string;
  userMessageId: string;
  responseMessageId: string;
  channelId: string | null;
  response: string;
  tokenCount: number;
  agentId: string;
  agentName: string;
}

function detectCompletion(content: string) {
  const lower = content.toLowerCase().trim();
  if (lower.length > 300) return false;
  return COMPLETION_PHRASES.some((phrase) => {
    const idx = lower.indexOf(phrase);
    if (idx === -1) return false;
    const after = lower.slice(idx + phrase.length).trim();
    return after === "" || after.length < 50;
  });
}

function sortAgentsByRole(agents: ConversationAgentRow[]) {
  const roleOrder: Record<string, number> = {
    leader: 0,
    executor: 1,
    reviewer: 2,
    observer: 3,
    contributor: 4,
  };
  return [...agents].sort((a, b) => (roleOrder[a.agent_role] ?? 4) - (roleOrder[b.agent_role] ?? 4));
}

function getConversation(conversationId: string) {
  return db
    .prepare("SELECT * FROM conversations WHERE id = ?")
    .get(conversationId) as Conversation | undefined;
}

function getChannel(channelId: string | null) {
  if (!channelId) return null;
  return getChannelById(channelId) ?? null;
}

function getAgent(agentId: string) {
  return db.prepare("SELECT * FROM agents WHERE id = ? AND is_active = 1").get(agentId) as Agent | undefined;
}

function patchAgentWithChannelDefaults(agent: Agent, channel: AgentChannel | null) {
  if (!channel || (!channel.default_model && !channel.default_system_prompt)) {
    return agent;
  }

  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(agent.connection_config) as Record<string, unknown>;
  } catch {
    config = {};
  }

  if (channel.default_model) {
    config.model = channel.default_model;
  }
  if (channel.default_system_prompt) {
    config.system_prompt = channel.default_system_prompt;
  }

  return {
    ...agent,
    connection_config: JSON.stringify(config),
  };
}

function loadConversationAgents(
  conversation: Conversation,
  channel: AgentChannel | null,
  targetAgentId?: string,
): { agents: ConversationAgentRow[]; responseMode: "single" | "discussion" | "parallel" | "targeted" } {
  let agents: ConversationAgentRow[] = [];
  let responseMode: "single" | "discussion" | "parallel" | "targeted" = "single";

  if (conversation.type === "single" && conversation.agent_id) {
    const agent = db
      .prepare("SELECT *, 'discussion' as response_mode, 'contributor' as agent_role FROM agents WHERE id = ?")
      .get(conversation.agent_id) as ConversationAgentRow | undefined;
    if (agent) {
      agents = [patchAgentWithChannelDefaults(agent, channel) as ConversationAgentRow];
    }
  } else if (conversation.type === "group") {
    const rows = db
      .prepare(
        `SELECT a.*, ca.response_mode, ca.agent_role
         FROM agents a
         JOIN conversation_agents ca ON ca.agent_id = a.id
         WHERE ca.conversation_id = ? AND a.is_active = 1 AND a.is_available = 1`,
      )
      .all(conversation.id) as ConversationAgentRow[];

    agents = rows.map((row) => patchAgentWithChannelDefaults(row, channel) as ConversationAgentRow);
    if (targetAgentId) {
      agents = agents.filter((agent) => agent.id === targetAgentId);
    }
    responseMode = agents[0]?.response_mode ?? channel?.default_response_mode ?? "discussion";
    if (responseMode === "discussion") {
      agents = sortAgentsByRole(agents);
    }
  }

  return { agents, responseMode };
}

function loadHistory(conversationId: string) {
  return (
    db
      .prepare("SELECT sender_agent_id, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
      .all(conversationId) as Message[]
  ).map((message) => ({
    role: (message.sender_agent_id ? "assistant" : "user") as "user" | "assistant",
    content: message.content,
    agent_id: message.sender_agent_id ?? undefined,
  }));
}

function emit(onEvent: ((event: ExecutionEvent) => void) | undefined, event: ExecutionEvent) {
  onEvent?.(event);
}

function createSingleConversation(agent: Agent, name: string, channelId: string | null) {
  const conversationId = uuid();
  db.prepare(
    `INSERT INTO conversations (id, type, name, agent_id, channel_id, updated_at)
     VALUES (?, 'single', ?, ?, ?, datetime('now'))`,
  ).run(conversationId, name, agent.id, channelId);
  return getConversation(conversationId)!;
}

export async function executeSingleAgentRequest(
  input: ExecuteSingleAgentRequestInput,
): Promise<ExecuteSingleAgentRequestResult> {
  const agent = input.agent ?? (input.agentId ? getAgent(input.agentId) : undefined);
  if (!agent) {
    throw new Error("Agent not found or inactive");
  }
  if (!channelBelongsToAgent(input.channelId, agent.id)) {
    throw new Error("Channel does not belong to the selected agent");
  }

  let conversation = input.conversationId ? getConversation(input.conversationId) : undefined;
  if (!conversation) {
    conversation = createSingleConversation(
      agent,
      input.conversationName ?? agent.name,
      input.channelId ?? null,
    );
  } else {
    if (conversation.type === "single" && conversation.agent_id && conversation.agent_id !== agent.id) {
      throw new Error("Conversation belongs to a different agent");
    }
    if (input.channelId && conversation.channel_id !== input.channelId) {
      db.prepare("UPDATE conversations SET channel_id = ?, updated_at = datetime('now') WHERE id = ?").run(
        input.channelId,
        conversation.id,
      );
      conversation = getConversation(conversation.id)!;
    } else {
      db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversation.id);
    }
  }

  const userMessageId = uuid();
  db.prepare(
    `INSERT INTO messages (id, conversation_id, sender_agent_id, content, token_count)
     VALUES (?, ?, NULL, ?, ?)`,
  ).run(userMessageId, conversation.id, input.content, Math.ceil(input.content.length / 4));

  const history = loadHistory(conversation.id);
  const channel = getChannel(conversation.channel_id);
  const patchedAgent = patchAgentWithChannelDefaults(agent, channel);
  const result = await streamAgentResponse(
    patchedAgent,
    conversation.id,
    input.content,
    history,
    input.onEvent,
    {
      channel_id: conversation.channel_id,
      ...input.metadata,
    },
  );

  return {
    conversationId: conversation.id,
    userMessageId,
    responseMessageId: result.messageId,
    channelId: conversation.channel_id,
    response: result.content,
    tokenCount: result.tokenCount,
    agentId: result.agentId,
    agentName: result.agentName,
  };
}

export async function executeConversationTurn(
  input: ExecuteConversationTurnInput,
): Promise<ExecuteConversationTurnResult> {
  const conversation = getConversation(input.conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const channel = getChannel(conversation.channel_id);
  const userMessageId = uuid();

  db.prepare(
    `INSERT INTO messages (id, conversation_id, sender_agent_id, content, token_count)
     VALUES (?, ?, NULL, ?, ?)`,
  ).run(userMessageId, conversation.id, input.content, Math.ceil(input.content.length / 4));
  db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversation.id);

  const { agents, responseMode } = loadConversationAgents(conversation, channel, input.targetAgentId);
  if (agents.length === 0) {
    throw new Error("No active agents found");
  }

  const history = loadHistory(conversation.id);
  const maxResponses = conversation.max_responses_per_turn || 0;
  const stopOnCompletion = conversation.stop_on_completion ?? false;
  const agentResults: ExecuteConversationTurnResult["agentResults"] = [];

  if (responseMode === "parallel" && agents.length > 1) {
    const results = await Promise.all(
      agents.map((agent) =>
        streamAgentResponse(agent, conversation.id, input.content, history, input.onEvent, {
          channel_id: conversation.channel_id,
        }),
      ),
    );
    for (const result of results) {
      agentResults.push(result);
    }
  } else {
    let responseCount = 0;
    let taskCompleted = false;

    for (const agent of agents) {
      if (taskCompleted && stopOnCompletion) {
        emit(input.onEvent, {
          type: "agent_skipped",
          agent_id: agent.id,
          agent_name: agent.name,
          reason: "task_already_completed",
        });
        continue;
      }
      if (maxResponses > 0 && responseCount >= maxResponses) {
        emit(input.onEvent, {
          type: "agent_skipped",
          agent_id: agent.id,
          agent_name: agent.name,
          reason: "max_responses_reached",
        });
        continue;
      }

      const result = await streamAgentResponse(
        agent,
        conversation.id,
        input.content,
        history,
        input.onEvent,
        { channel_id: conversation.channel_id },
      );
      agentResults.push(result);

      if (result.content) {
        responseCount += 1;
        if (stopOnCompletion && detectCompletion(result.content)) {
          taskCompleted = true;
          emit(input.onEvent, {
            type: "task_completed",
            agent_id: agent.id,
            agent_name: agent.name,
          });
        }
      }

      if (responseMode === "discussion" && agents.length > 1 && result.content) {
        history.push({
          role: "assistant",
          content: result.content,
          agent_id: agent.id,
        });
      }
    }
  }

  return {
    conversationId: conversation.id,
    userMessageId,
    channelId: conversation.channel_id,
    agentResults,
  };
}

async function streamAgentResponse(
  agent: Agent,
  conversationId: string,
  content: string,
  history: { role: "user" | "assistant"; content: string; agent_id?: string }[],
  onEvent?: (event: ExecutionEvent) => void,
  metadata?: AgentMessage["metadata"],
) {
  const adapter = createAdapter(agent.gateway_type);
  const agentMessageId = uuid();
  let fullContent = "";
  let fullThinking = "";
  let tokenCount = 0;
  const startTime = Date.now();

  db.prepare(
    `INSERT INTO messages (id, conversation_id, sender_agent_id, content, thinking_content, token_count)
     VALUES (?, ?, ?, '', '', 0)`,
  ).run(agentMessageId, conversationId, agent.id);

  emit(onEvent, {
    type: "agent_start",
    agent_id: agent.id,
    agent_name: agent.name,
    message_id: agentMessageId,
  });

  const message: AgentMessage = {
    conversation_id: conversationId,
    content,
    history,
    metadata: {
      group_mode: history.some((item) => item.agent_id !== undefined),
      ...metadata,
    },
  };

  try {
    for await (const chunk of adapter.sendMessage(agent, message)) {
      handleAgentChunk({
        agent,
        chunk,
        conversationId,
        agentMessageId,
        onEvent,
        onContent: (value) => {
          fullContent += value;
        },
        onThinking: (value) => {
          fullThinking += value;
        },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Agent communication failed";
    if (!fullContent) {
      fullContent = `*Error: ${errorMessage}*`;
    }
    emit(onEvent, { type: "error", error: errorMessage, agent_id: agent.id });
  }

  tokenCount = Math.max(Math.ceil(fullContent.length / 4), 1);
  const responseTime = Date.now() - startTime;
  const hasError = fullContent.startsWith("*Error:");

  db.prepare(
    "UPDATE messages SET content = ?, thinking_content = ?, token_count = ? WHERE id = ?",
  ).run(fullContent, fullThinking, tokenCount, agentMessageId);
  db.prepare(
    `UPDATE agents
     SET last_seen = datetime('now'),
         total_messages = total_messages + 1,
         total_tokens = total_tokens + ?,
         avg_response_time_ms = CASE
           WHEN total_messages = 0 THEN ?
           ELSE ((avg_response_time_ms * total_messages) + ?) / (total_messages + 1)
         END
     WHERE id = ?`,
  ).run(tokenCount, responseTime, responseTime, agent.id);
  db.prepare(
    `INSERT INTO performance_snapshots (id, agent_id, latency_ms, token_count, error_occurred)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(uuid(), agent.id, responseTime, tokenCount, hasError ? 1 : 0);
  db.prepare(
    `UPDATE conversations
     SET estimated_token_count = estimated_token_count + ?,
         total_cost = total_cost + ?
     WHERE id = ?`,
  ).run(
    tokenCount,
    tokenCount * (agent.cost_per_token ?? 0) + (agent.cost_per_request ?? 0),
    conversationId,
  );

  emit(onEvent, {
    type: "done",
    message_id: agentMessageId,
    agent_id: agent.id,
    token_count: tokenCount,
  });

  return {
    agentId: agent.id,
    agentName: agent.name,
    messageId: agentMessageId,
    content: fullContent,
    tokenCount,
  };
}

function handleAgentChunk(input: {
  agent: Agent;
  chunk: AgentResponseChunk;
  conversationId: string;
  agentMessageId: string;
  onEvent?: (event: ExecutionEvent) => void;
  onContent: (value: string) => void;
  onThinking: (value: string) => void;
}) {
  const { agent, chunk, conversationId, agentMessageId, onEvent } = input;

  switch (chunk.type) {
    case "content":
      if (chunk.content) {
        input.onContent(chunk.content);
        emit(onEvent, { type: "content", content: chunk.content, agent_id: agent.id });
      }
      break;
    case "tool_call": {
      const toolCallId = uuid();
      db.prepare(
        `INSERT INTO tool_calls (id, message_id, agent_id, tool_name, input, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
      ).run(toolCallId, agentMessageId, agent.id, chunk.tool_name ?? "", JSON.stringify(chunk.tool_input ?? {}));
      emit(onEvent, {
        type: "tool_call",
        tool_call_id: chunk.tool_call_id ?? toolCallId,
        db_tool_call_id: toolCallId,
        tool_name: chunk.tool_name,
        tool_input: chunk.tool_input,
        agent_id: agent.id,
      });
      break;
    }
    case "tool_result": {
      const matchingToolCall = db
        .prepare(
          "SELECT id FROM tool_calls WHERE message_id = ? AND tool_name = ? ORDER BY timestamp DESC LIMIT 1",
        )
        .get(agentMessageId, chunk.tool_name ?? "") as { id: string } | undefined;
      if (matchingToolCall) {
        db.prepare("UPDATE tool_calls SET output = ?, status = 'success' WHERE id = ?").run(
          JSON.stringify(chunk.tool_output ?? {}),
          matchingToolCall.id,
        );
      }
      emit(onEvent, {
        type: "tool_result",
        tool_call_id: chunk.tool_call_id,
        tool_name: chunk.tool_name,
        tool_output: chunk.tool_output,
        agent_id: agent.id,
      });
      break;
    }
    case "error":
      emit(onEvent, { type: "error", error: chunk.error, agent_id: agent.id });
      db.prepare(
        "UPDATE tool_calls SET status = 'error' WHERE message_id = ? AND status = 'pending'",
      ).run(agentMessageId);
      db.prepare("UPDATE agents SET error_count = error_count + 1 WHERE id = ?").run(agent.id);
      break;
    case "thinking":
    case "thinking_chunk":
      if (chunk.thinking) {
        input.onThinking(chunk.thinking);
        emit(onEvent, { type: "thinking", thinking: chunk.thinking, agent_id: agent.id });
      }
      break;
    case "thinking_end":
      emit(onEvent, { type: "thinking_end", agent_id: agent.id });
      break;
    case "subagent_spawned":
      if (chunk.subagent_id && chunk.subagent_goal) {
        db.prepare(
          "INSERT INTO subagents (id, parent_agent_id, conversation_id, goal, status) VALUES (?, ?, ?, ?, 'running')",
        ).run(chunk.subagent_id, agent.id, conversationId, chunk.subagent_goal);
        emit(onEvent, {
          type: "subagent_spawned",
          subagent_id: chunk.subagent_id,
          subagent_goal: chunk.subagent_goal,
          agent_id: agent.id,
        });
      }
      break;
    case "subagent_progress":
      if (chunk.subagent_id) {
        emit(onEvent, { type: "subagent_progress", subagent_id: chunk.subagent_id, agent_id: agent.id });
      }
      break;
    case "subagent_completed":
      if (chunk.subagent_id) {
        db.prepare(
          "UPDATE subagents SET status = 'completed', result = ?, completed_at = datetime('now') WHERE id = ?",
        ).run(chunk.subagent_result ?? "", chunk.subagent_id);
        emit(onEvent, {
          type: "subagent_completed",
          subagent_id: chunk.subagent_id,
          subagent_result: chunk.subagent_result ?? "",
          agent_id: agent.id,
        });
      }
      break;
    case "subagent_failed":
      if (chunk.subagent_id) {
        db.prepare(
          "UPDATE subagents SET status = 'failed', error = ?, completed_at = datetime('now') WHERE id = ?",
        ).run(chunk.subagent_error ?? "", chunk.subagent_id);
        emit(onEvent, {
          type: "subagent_failed",
          subagent_id: chunk.subagent_id,
          subagent_error: chunk.subagent_error ?? "",
          agent_id: agent.id,
        });
      }
      break;
    case "handoff":
      if (chunk.agent_id) {
        db.prepare(
          `INSERT INTO messages (
            id, conversation_id, sender_agent_id, content, is_handoff,
            handoff_from_agent_id, handoff_to_agent_id, handoff_context
          ) VALUES (?, ?, NULL, ?, 1, ?, ?, ?)`,
        ).run(
          uuid(),
          conversationId,
          chunk.content ?? `Handoff to ${chunk.agent_name ?? "another agent"}`,
          agent.id,
          chunk.agent_id,
          chunk.content ?? "",
        );
        emit(onEvent, {
          type: "handoff",
          from_agent_id: agent.id,
          from_agent_name: agent.name,
          to_agent_id: chunk.agent_id,
          to_agent_name: chunk.agent_name,
          context: chunk.content,
        });
      }
      break;
    case "done":
      break;
  }
}
