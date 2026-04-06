import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  let sql = "SELECT * FROM shared_memory WHERE 1=1";
  const params: unknown[] = [];

  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }

  if (search) {
    sql += " AND (key LIKE ? OR value LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += " ORDER BY created_at DESC";

  const entries = db.prepare(sql).all(...params);
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    key: string;
    value: string;
    category?: string;
    source_agent_id?: string;
    confidence?: number;
    expires_at?: string;
  };

  if (!body.key || !body.value) {
    return NextResponse.json(
      { error: "key and value are required" },
      { status: 400 },
    );
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO shared_memory (id, key, value, category, source_agent_id, confidence, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.key,
    body.value,
    body.category ?? "general",
    body.source_agent_id ?? null,
    body.confidence ?? 1.0,
    body.expires_at ?? null,
  );

  const entry = db.prepare("SELECT * FROM shared_memory WHERE id = ?").get(id);
  return NextResponse.json(entry, { status: 201 });
}
