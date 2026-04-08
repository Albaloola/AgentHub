import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import type { Message, Conversation, Checkpoint } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const checkpoints = db
    .prepare(
      "SELECT * FROM checkpoints WHERE conversation_id = ? ORDER BY created_at DESC",
    )
    .all(id) as Checkpoint[];

  return NextResponse.json(checkpoints);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { name, description } = (await request.json()) as {
    name?: string;
    description?: string;
  };

  const conversation = db
    .prepare("SELECT * FROM conversations WHERE id = ?")
    .get(id) as Conversation | undefined;

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

  const snapshotJson = JSON.stringify({
    messages,
    conversation,
  });

  const checkpointId = uuid();

  db.prepare(
    "INSERT INTO checkpoints (id, conversation_id, name, description, snapshot_json, message_count) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    checkpointId,
    id,
    name ?? null,
    description ?? null,
    snapshotJson,
    messages.length,
  );

  const checkpoint = db
    .prepare("SELECT * FROM checkpoints WHERE id = ?")
    .get(checkpointId) as Checkpoint;

  return NextResponse.json(checkpoint, { status: 201 });
}
