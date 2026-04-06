import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { createAdapter } from "@/lib/adapters";
import type { Agent, AgentMessage, Conversation, Message } from "@/lib/types";

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

function detectCompletion(content: string): boolean {
  const lower = content.toLowerCase().trim();
  if (lower.length > 300) return false;
  return COMPLETION_PHRASES.some((phrase) => {
    const idx = lower.indexOf(phrase);
    if (idx === -1) return false;
    const after = lower.slice(idx + phrase.length).trim();
    return after === "" || after.length < 50;
  });
}

function sortAgentsByRole(agents: (Agent & { response_mode: string; agent_role: string })[]) {
  const roleOrder: Record<string, number> = { leader: 0, executor: 1, reviewer: 2, observer: 3, contributor: 4 };
  return [...agents].sort((a, b) => (roleOrder[a.agent_role] ?? 4) - (roleOrder[b.agent_role] ?? 4));
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    conversation_id: string;
    content: string;
    target_agent_id?: string;
  };

  const conversation = db
    .prepare("SELECT * FROM conversations WHERE id = ?")
    .get(body.conversation_id) as Conversation | undefined;

  if (!conversation) {
    return new Response(JSON.stringify({ error: "Conversation not found" }), { status: 404 });
  }

  const userMsgId = uuid();
  db.prepare(
    "INSERT INTO messages (id, conversation_id, sender_agent_id, content, token_count) VALUES (?, ?, ?, ?, ?)",
  ).run(userMsgId, body.conversation_id, null, body.content, body.content.length / 4);

  db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(
    body.conversation_id,
  );

  let agents: (Agent & { response_mode: string; agent_role: string })[] = [];
  let responseMode = "single";

  if (conversation.type === "single" && conversation.agent_id) {
    const agent = db.prepare("SELECT *, 'contributor' as agent_role FROM agents WHERE id = ?").get(conversation.agent_id) as (Agent & { response_mode: string; agent_role: string }) | undefined;
    if (agent) { agents = [agent]; responseMode = "single"; }
  } else if (conversation.type === "group") {
    if (body.target_agent_id) {
      const agent = db.prepare("SELECT *, 'contributor' as agent_role FROM agents WHERE id = ?").get(body.target_agent_id) as (Agent & { response_mode: string; agent_role: string }) | undefined;
      if (agent) agents = [agent];
    } else {
      const rows = db
        .prepare(
          `SELECT a.*, ca.response_mode, ca.agent_role FROM agents a
           JOIN conversation_agents ca ON ca.agent_id = a.id
           WHERE ca.conversation_id = ? AND a.is_active = 1 AND a.is_available = 1`,
        )
        .all(body.conversation_id) as (Agent & { response_mode: string; agent_role: string })[];

      agents = rows;
      responseMode = rows[0]?.response_mode ?? "discussion";

      if (responseMode === "discussion") {
        agents = sortAgentsByRole(agents);
      }
    }
  }

  if (agents.length === 0) {
    return new Response(JSON.stringify({ error: "No active agents found" }), { status: 400 });
  }

  const maxResponses = conversation.max_responses_per_turn || 0;
  const stopOnCompletion = conversation.stop_on_completion ?? false;

  const history = (
    db
      .prepare(
        "SELECT sender_agent_id, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      )
      .all(body.conversation_id) as Message[]
  ).map((m) => ({
    role: (m.sender_agent_id ? "assistant" : "user") as "user" | "assistant",
    content: m.content,
    agent_id: m.sender_agent_id ?? undefined,
  }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        if (responseMode === "parallel" && agents.length > 1) {
          await Promise.all(
            agents.map((agent) =>
              streamAgentResponse(agent, body, history, send, conversation.id),
            ),
          );
        } else {
          let responseCount = 0;
          let taskCompleted = false;

          for (const agent of agents) {
            if (taskCompleted && stopOnCompletion) {
              send({ type: "agent_skipped", agent_id: agent.id, agent_name: agent.name, reason: "task_already_completed" });
              continue;
            }
            if (maxResponses > 0 && responseCount >= maxResponses) {
              send({ type: "agent_skipped", agent_id: agent.id, agent_name: agent.name, reason: "max_responses_reached" });
              continue;
            }

            const result = await streamAgentResponse(agent, body, history, send, conversation.id);

            if (result.content) {
              responseCount++;

              if (stopOnCompletion && detectCompletion(result.content)) {
                taskCompleted = true;
                send({ type: "task_completed", agent_id: agent.id, agent_name: agent.name });
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
      } catch (err) {
        send({
          type: "error",
          error: err instanceof Error ? err.message : "Stream error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function streamAgentResponse(
  agent: Agent,
  body: { conversation_id: string; content: string },
  history: { role: "user" | "assistant"; content: string; agent_id?: string }[],
  send: (data: Record<string, unknown>) => void,
  conversationId: string,
): Promise<{ content: string; tokenCount: number }> {
  const adapter = createAdapter(agent.gateway_type);
  const agentMsgId = uuid();
  let fullContent = "";
  let fullThinking = "";
  let tokenCount = 0;

  const startTime = Date.now();

  db.prepare(
    "INSERT INTO messages (id, conversation_id, sender_agent_id, content, thinking_content, token_count) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(agentMsgId, body.conversation_id, agent.id, "", "", 0);

  send({ type: "agent_start", agent_id: agent.id, agent_name: agent.name, message_id: agentMsgId });

  const message: AgentMessage = {
    conversation_id: body.conversation_id,
    content: body.content,
    history,
    metadata: {
      group_mode: history.some((h) => h.agent_id !== undefined),
    },
  };

  try {
    for await (const chunk of adapter.sendMessage(agent, message)) {
      switch (chunk.type) {
        case "content":
          if (chunk.content) {
            fullContent += chunk.content;
            send({ type: "content", content: chunk.content, agent_id: agent.id });
          }
          break;

        case "tool_call": {
          const tcId = uuid();
          db.prepare(
            `INSERT INTO tool_calls (id, message_id, agent_id, tool_name, input, status)
             VALUES (?, ?, ?, ?, ?, 'pending')`,
          ).run(tcId, agentMsgId, agent.id, chunk.tool_name ?? "", JSON.stringify(chunk.tool_input ?? {}));

          send({
            type: "tool_call",
            tool_call_id: chunk.tool_call_id ?? tcId,
            db_tool_call_id: tcId,
            tool_name: chunk.tool_name,
            tool_input: chunk.tool_input,
            agent_id: agent.id,
          });
          break;
        }

        case "tool_result": {
          const matchingTc = db
            .prepare(
              "SELECT id FROM tool_calls WHERE message_id = ? AND tool_name = ? ORDER BY timestamp DESC LIMIT 1",
            )
            .get(agentMsgId, chunk.tool_name ?? "") as { id: string } | undefined;

          if (matchingTc) {
            db.prepare(
              "UPDATE tool_calls SET output = ?, status = 'success' WHERE id = ?",
            ).run(JSON.stringify(chunk.tool_output ?? {}), matchingTc.id);
          }

          send({
            type: "tool_result",
            tool_call_id: chunk.tool_call_id,
            tool_name: chunk.tool_name,
            tool_output: chunk.tool_output,
            agent_id: agent.id,
          });
          break;
        }

        case "error":
          send({ type: "error", error: chunk.error, agent_id: agent.id });
          db.prepare(
            "UPDATE tool_calls SET status = 'error' WHERE message_id = ? AND status = 'pending'",
          ).run(agentMsgId);
          db.prepare("UPDATE agents SET error_count = error_count + 1 WHERE id = ?").run(agent.id);
          break;

        case "thinking":
        case "thinking_chunk":
          if (chunk.thinking) {
            fullThinking += chunk.thinking;
            send({ type: "thinking", thinking: chunk.thinking, agent_id: agent.id });
          }
          break;

        case "thinking_end":
          send({ type: "thinking_end", agent_id: agent.id });
          break;

        case "subagent_spawned":
          if (chunk.subagent_id && chunk.subagent_goal) {
            db.prepare(
              "INSERT INTO subagents (id, parent_agent_id, conversation_id, goal, status) VALUES (?, ?, ?, ?, 'running')",
            ).run(chunk.subagent_id, agent.id, body.conversation_id, chunk.subagent_goal);
            send({ type: "subagent_spawned", subagent_id: chunk.subagent_id, subagent_goal: chunk.subagent_goal, agent_id: agent.id });
          }
          break;

        case "subagent_progress":
          if (chunk.subagent_id) {
            send({ type: "subagent_progress", subagent_id: chunk.subagent_id, agent_id: agent.id });
          }
          break;

        case "subagent_completed":
          if (chunk.subagent_id) {
            db.prepare(
              "UPDATE subagents SET status = 'completed', result = ?, completed_at = datetime('now') WHERE id = ?",
            ).run(chunk.subagent_result ?? "", chunk.subagent_id);
            send({ type: "subagent_completed", subagent_id: chunk.subagent_id, subagent_result: chunk.subagent_result ?? "", agent_id: agent.id });
          }
          break;

        case "subagent_failed":
          if (chunk.subagent_id) {
            db.prepare(
              "UPDATE subagents SET status = 'failed', error = ?, completed_at = datetime('now') WHERE id = ?",
            ).run(chunk.subagent_error ?? "", chunk.subagent_id);
            send({ type: "subagent_failed", subagent_id: chunk.subagent_id, subagent_error: chunk.subagent_error ?? "", agent_id: agent.id });
          }
          break;

        case "handoff":
          if (chunk.agent_id) {
            db.prepare(
              `INSERT INTO messages (id, conversation_id, sender_agent_id, content, is_handoff, handoff_from_agent_id, handoff_to_agent_id, handoff_context)
               VALUES (?, ?, NULL, ?, 1, ?, ?, ?)`,
            ).run(uuid(), body.conversation_id, chunk.content ?? `Handoff to ${chunk.agent_name ?? "another agent"}`, agent.id, chunk.agent_id, chunk.content ?? "");
            send({ type: "handoff", from_agent_id: agent.id, from_agent_name: agent.name, to_agent_id: chunk.agent_id, to_agent_name: chunk.agent_name, context: chunk.content });
          }
          break;

        case "done":
          break;
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Agent communication failed";
    if (!fullContent) {
      fullContent = `*Error: ${errorMsg}*`;
    }
    send({ type: "error", error: errorMsg, agent_id: agent.id });
  }

  tokenCount = Math.max(fullContent.length / 4, 1);
  const responseTime = Date.now() - startTime;

  const hasError = fullContent.startsWith("*Error:");
  db.prepare("UPDATE messages SET content = ?, thinking_content = ?, token_count = ? WHERE id = ?").run(fullContent, fullThinking, tokenCount, agentMsgId);
  db.prepare("UPDATE agents SET last_seen = datetime('now'), total_messages = total_messages + 1, total_tokens = total_tokens + ?, avg_response_time_ms = ? WHERE id = ?").run(tokenCount, responseTime, agent.id);
  // Performance snapshot for degradation monitoring
  db.prepare("INSERT INTO performance_snapshots (id, agent_id, latency_ms, token_count, error_occurred) VALUES (?, ?, ?, ?, ?)").run(uuid(), agent.id, responseTime, tokenCount, hasError ? 1 : 0);
  // Update conversation estimated token count and cost
  db.prepare("UPDATE conversations SET estimated_token_count = estimated_token_count + ?, total_cost = total_cost + ? WHERE id = ?").run(tokenCount, tokenCount * (agent.cost_per_token ?? 0) + (agent.cost_per_request ?? 0), conversationId);

  send({ type: "done", message_id: agentMsgId, agent_id: agent.id, token_count: tokenCount });

  return { content: fullContent, tokenCount };
}

