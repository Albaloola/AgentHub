import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ConversationPermissionWithUser } from "@/lib/types";

// GET: List all permissions for a conversation (with user details)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const conv = db
    .prepare("SELECT id FROM conversations WHERE id = ?")
    .get(id);
  if (!conv) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  const permissions = db
    .prepare(
      `SELECT cp.conversation_id, cp.user_id, cp.permission, cp.created_at,
              u.display_name, u.email, u.avatar_url
       FROM conversation_permissions cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.conversation_id = ?
       ORDER BY cp.created_at ASC`,
    )
    .all(id) as ConversationPermissionWithUser[];

  return NextResponse.json(permissions);
}

// POST: Add or update a permission
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    user_id: string;
    permission?: string;
  };

  if (!body.user_id) {
    return NextResponse.json(
      { error: "user_id is required" },
      { status: 400 },
    );
  }

  const permission = body.permission ?? "viewer";
  const validLevels = ["viewer", "editor", "admin"];
  if (!validLevels.includes(permission)) {
    return NextResponse.json(
      { error: `permission must be one of: ${validLevels.join(", ")}` },
      { status: 400 },
    );
  }

  const conv = db
    .prepare("SELECT id FROM conversations WHERE id = ?")
    .get(id);
  if (!conv) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(body.user_id);
  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 },
    );
  }

  // Upsert: INSERT OR REPLACE since (conversation_id, user_id) is the PK
  db.prepare(
    `INSERT INTO conversation_permissions (conversation_id, user_id, permission)
     VALUES (?, ?, ?)
     ON CONFLICT(conversation_id, user_id) DO UPDATE SET permission = excluded.permission`,
  ).run(id, body.user_id, permission);

  const result = db
    .prepare(
      `SELECT cp.conversation_id, cp.user_id, cp.permission, cp.created_at,
              u.display_name, u.email, u.avatar_url
       FROM conversation_permissions cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.conversation_id = ? AND cp.user_id = ?`,
    )
    .get(id, body.user_id) as ConversationPermissionWithUser;

  return NextResponse.json(result, { status: 201 });
}

// DELETE: Remove a permission
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json(
      { error: "user_id query parameter is required" },
      { status: 400 },
    );
  }

  const result = db
    .prepare(
      "DELETE FROM conversation_permissions WHERE conversation_id = ? AND user_id = ?",
    )
    .run(id, userId);

  if (result.changes === 0) {
    return NextResponse.json(
      { error: "Permission not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ message: "Permission removed" });
}
