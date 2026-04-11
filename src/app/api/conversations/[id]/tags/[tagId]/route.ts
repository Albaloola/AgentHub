import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> },
) {
  const { id, tagId } = await params;

  try {
    // Verify conversation and tag exist
    const conv = db.prepare("SELECT id FROM conversations WHERE id = ?").get(id);
    if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const tag = db.prepare("SELECT id FROM tags WHERE id = ?").get(tagId);
    if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });

    db.prepare("INSERT OR IGNORE INTO conversation_tags (conversation_id, tag_id) VALUES (?, ?)").run(id, tagId);
    return NextResponse.json({ conversation_id: id, tag_id: tagId });
  } catch {
    return NextResponse.json({ error: "Failed to add tag" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> },
) {
  const { id, tagId } = await params;

  try {
    db.prepare("DELETE FROM conversation_tags WHERE conversation_id = ? AND tag_id = ?").run(id, tagId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to remove tag" }, { status: 500 });
  }
}
