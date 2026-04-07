import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ReplaySnapshot, Message } from "@/lib/types";

/**
 * GET /api/conversations/[id]/replay
 * Returns all replay_snapshots for a conversation, ordered by message_index.
 * If no snapshots exist, synthesizes them from the messages table so the
 * replay panel always has something to show.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Check conversation exists
  const conv = db
    .prepare("SELECT id FROM conversations WHERE id = ?")
    .get(id) as { id: string } | undefined;

  if (!conv) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  // Try real snapshots first
  let snapshots = db
    .prepare(
      "SELECT * FROM replay_snapshots WHERE conversation_id = ? ORDER BY message_index ASC",
    )
    .all(id) as ReplaySnapshot[];

  // If none exist, synthesize from messages so the feature works out of the box
  if (snapshots.length === 0) {
    snapshots = synthesizeFromMessages(id);
  }

  return NextResponse.json(snapshots);
}

/**
 * Build replay snapshots on the fly from the messages table.
 * Each message becomes a snapshot so we can replay the conversation
 * step by step. Agents get their names resolved via a join.
 */
function synthesizeFromMessages(conversationId: string): ReplaySnapshot[] {
  const messages = db
    .prepare(
      `SELECT m.*, a.name as agent_name
       FROM messages m
       LEFT JOIN agents a ON m.sender_agent_id = a.id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
    )
    .all(conversationId) as (Message & { agent_name: string | null })[];

  return messages.map((msg, index) => {
    const isUser = msg.sender_agent_id === null;
    const contentPreview =
      msg.content.length > 120
        ? msg.content.slice(0, 120) + "..."
        : msg.content;

    let event: string = "message_added";
    if (msg.is_handoff) event = "handoff";
    else if (msg.is_edited) event = "message_edited";

    const data = {
      event,
      message_id: msg.id,
      agent_id: msg.sender_agent_id ?? undefined,
      agent_name: isUser ? "You" : (msg.agent_name ?? "Agent"),
      content_preview: contentPreview,
      token_count: msg.token_count || 0,
      response_time_ms: undefined as number | undefined,
      model: undefined as string | undefined,
    };

    // Estimate response time from gap between this and the previous message
    if (index > 0) {
      const prevTime = new Date(messages[index - 1].created_at).getTime();
      const thisTime = new Date(msg.created_at).getTime();
      const delta = thisTime - prevTime;
      if (delta > 0 && delta < 300000) {
        // Only if < 5 minutes (reasonable response time)
        data.response_time_ms = delta;
      }
    }

    return {
      id: `synth-${msg.id}`,
      conversation_id: conversationId,
      message_index: index,
      timestamp_ms: new Date(msg.created_at).getTime(),
      snapshot_data: JSON.stringify(data),
      created_at: msg.created_at,
    } satisfies ReplaySnapshot;
  });
}
