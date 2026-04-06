import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const unread = searchParams.get("unread");
  const limit = searchParams.get("limit");

  let sql = "SELECT * FROM notifications";
  const params: unknown[] = [];

  if (unread === "true") {
    sql += " WHERE is_read = 0";
  }

  sql += " ORDER BY created_at DESC";

  if (limit) {
    sql += " LIMIT ?";
    params.push(parseInt(limit, 10));
  }

  const notifications = db.prepare(sql).all(...params);
  return NextResponse.json(notifications);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    type: string;
    title: string;
    body?: string;
    source_id?: string;
  };

  if (!body.type || !body.title) {
    return NextResponse.json(
      { error: "type and title are required" },
      { status: 400 },
    );
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO notifications (id, type, title, body, source_id)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, body.type, body.title, body.body ?? null, body.source_id ?? null);

  const notification = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
  return NextResponse.json(notification, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { action: string };

  if (body.action !== "mark_all_read") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const result = db.prepare("UPDATE notifications SET is_read = 1 WHERE is_read = 0").run();
  return NextResponse.json({ ok: true, updated: result.changes });
}
