import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import type { Message } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { keep_last?: number };
  const keepLast = body.keep_last ?? 10;

  const conversation = db
    .prepare("SELECT id FROM conversations WHERE id = ?")
    .get(id) as { id: string } | undefined;

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  const messages = db
    .prepare(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
    )
    .all(id) as Message[];

  if (messages.length <= keepLast + 1) {
    return NextResponse.json({
      message: "Conversation too short to compact",
      message_count: messages.length,
    });
  }

  // Keep: first message, pinned messages, last N messages
  const firstMessage = messages[0];
  const lastMessages = messages.slice(-keepLast);
  const lastMessageIds = new Set(lastMessages.map((m) => m.id));

  // Middle messages to trim (excluding first, pinned, and last N)
  const middleMessages = messages.slice(1).filter(
    (m) => !lastMessageIds.has(m.id) && !m.is_pinned,
  );

  if (middleMessages.length === 0) {
    return NextResponse.json({
      message: "No messages to compact",
      message_count: messages.length,
    });
  }

  // Build summary content from trimmed messages
  const abbreviated = middleMessages.map((m) => {
    const role = m.sender_agent_id ? "assistant" : "user";
    const preview =
      m.content.length > 120 ? m.content.slice(0, 120) + "..." : m.content;
    return `[${role}] ${preview}`;
  });

  const summaryContent = `[Compacted context]\n${abbreviated.join("\n")}`;

  // Calculate token estimate for the summary
  const summaryTokenEstimate = Math.ceil(summaryContent.length / 4);

  // Delete the trimmed middle messages
  const idsToDelete = middleMessages.map((m) => m.id);
  const placeholders = idsToDelete.map(() => "?").join(",");
  db.prepare(
    `DELETE FROM messages WHERE id IN (${placeholders})`,
  ).run(...idsToDelete);

  // Insert summary message right after the first message
  const summaryId = uuid();
  db.prepare(
    "INSERT INTO messages (id, conversation_id, sender_agent_id, content, token_count, is_summary, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
  ).run(
    summaryId,
    id,
    null,
    summaryContent,
    summaryTokenEstimate,
    firstMessage.created_at,
  );

  // Recalculate estimated_token_count for the conversation
  const remaining = db
    .prepare(
      "SELECT COALESCE(SUM(token_count), 0) as total FROM messages WHERE conversation_id = ?",
    )
    .get(id) as { total: number };

  db.prepare(
    "UPDATE conversations SET estimated_token_count = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(remaining.total, id);

  const finalCount = db
    .prepare(
      "SELECT COUNT(*) as c FROM messages WHERE conversation_id = ?",
    )
    .get(id) as { c: number };

  return NextResponse.json({
    message: "Conversation compacted",
    removed_count: middleMessages.length,
    message_count: finalCount.c,
    estimated_token_count: remaining.total,
  });
}
