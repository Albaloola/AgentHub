import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const users = db
    .prepare("SELECT * FROM users ORDER BY created_at DESC")
    .all();

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    display_name: string;
    email?: string;
    role?: string;
  };

  if (!body.display_name) {
    return NextResponse.json(
      { error: "display_name is required" },
      { status: 400 },
    );
  }

  const id = uuid();

  db.prepare(
    `INSERT INTO users (id, display_name, email, role)
     VALUES (?, ?, ?, ?)`,
  ).run(id, body.display_name, body.email ?? null, body.role ?? "operator");

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  return NextResponse.json(user, { status: 201 });
}
