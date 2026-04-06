import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import type { Message, Conversation, Checkpoint } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; cid: string }> },
) {
  const { id, cid } = await params;

  const checkpoint = db
    .prepare(
      "SELECT * FROM checkpoints WHERE id = ? AND conversation_id = ?",
    )
    .get(cid, id) as Checkpoint | undefined;

  if (!checkpoint) {
    return NextResponse.json(
      { error: "Checkpoint not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(checkpoint);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; cid: string }> },
) {
  const { id, cid } = await params;
  const { action } = (await request.json()) as {
    action: "revert" | "fork";
  };

  const checkpoint = db
    .prepare(
      "SELECT * FROM checkpoints WHERE id = ? AND conversation_id = ?",
    )
    .get(cid, id) as Checkpoint | undefined;

  if (!checkpoint) {
    return NextResponse.json(
      { error: "Checkpoint not found" },
      { status: 404 },
    );
  }

  const snapshot = JSON.parse(checkpoint.snapshot_json) as {
    messages: Message[];
    conversation: Conversation;
  };

  if (action === "revert") {
    // Delete all current messages for this conversation
    db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);

    // Re-insert messages from the snapshot
    const insertMsg = db.prepare(
      "INSERT INTO messages (id, conversation_id, sender_agent_id, content, thinking_content, token_count, parent_message_id, branch_point, is_pinned, is_summary, is_handoff, handoff_from_agent_id, handoff_to_agent_id, handoff_context, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );

    for (const msg of snapshot.messages) {
      insertMsg.run(
        msg.id,
        id,
        msg.sender_agent_id ?? null,
        msg.content,
        msg.thinking_content ?? "",
        msg.token_count ?? 0,
        msg.parent_message_id ?? null,
        msg.branch_point ?? null,
        msg.is_pinned ? 1 : 0,
        msg.is_summary ? 1 : 0,
        msg.is_handoff ? 1 : 0,
        msg.handoff_from_agent_id ?? null,
        msg.handoff_to_agent_id ?? null,
        msg.handoff_context ?? null,
        msg.created_at,
      );
    }

    db.prepare(
      "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?",
    ).run(id);

    return NextResponse.json({
      message: "Conversation reverted to checkpoint",
      message_count: snapshot.messages.length,
    });
  }

  if (action === "fork") {
    const newConvId = uuid();
    const conv = snapshot.conversation;

    db.prepare(
      "INSERT INTO conversations (id, type, name, agent_id, parent_conversation_id) VALUES (?, ?, ?, ?, ?)",
    ).run(
      newConvId,
      conv.type,
      `${conv.name} (Fork)`,
      conv.agent_id ?? null,
      id,
    );

    const insertMsg = db.prepare(
      "INSERT INTO messages (id, conversation_id, sender_agent_id, content, thinking_content, token_count, parent_message_id, branch_point, is_pinned, is_summary, is_handoff, handoff_from_agent_id, handoff_to_agent_id, handoff_context, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );

    for (const msg of snapshot.messages) {
      const newMsgId = uuid();
      insertMsg.run(
        newMsgId,
        newConvId,
        msg.sender_agent_id ?? null,
        msg.content,
        msg.thinking_content ?? "",
        msg.token_count ?? 0,
        null,
        null,
        msg.is_pinned ? 1 : 0,
        msg.is_summary ? 1 : 0,
        msg.is_handoff ? 1 : 0,
        msg.handoff_from_agent_id ?? null,
        msg.handoff_to_agent_id ?? null,
        msg.handoff_context ?? null,
        msg.created_at,
      );
    }

    return NextResponse.json(
      { id: newConvId, message: "Conversation forked from checkpoint" },
      { status: 201 },
    );
  }

  return NextResponse.json(
    { error: "Invalid action. Use 'revert' or 'fork'" },
    { status: 400 },
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; cid: string }> },
) {
  const { id, cid } = await params;

  const checkpoint = db
    .prepare(
      "SELECT id FROM checkpoints WHERE id = ? AND conversation_id = ?",
    )
    .get(cid, id) as { id: string } | undefined;

  if (!checkpoint) {
    return NextResponse.json(
      { error: "Checkpoint not found" },
      { status: 404 },
    );
  }

  db.prepare("DELETE FROM checkpoints WHERE id = ?").run(cid);

  return NextResponse.json({ ok: true });
}
