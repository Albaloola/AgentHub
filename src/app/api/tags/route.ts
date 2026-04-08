import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import type { Tag } from "@/lib/types";

export async function GET() {
  const tags = db.prepare("SELECT * FROM tags ORDER BY name").all() as Tag[];
  return NextResponse.json(tags);
}

export async function POST(request: Request) {
  const { name, color } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const id = uuid();
  db.prepare("INSERT INTO tags (id, name, color) VALUES (?, ?, ?)").run(id, name.trim(), color || "#6366f1");
  return NextResponse.json({ id, name: name.trim(), color: color || "#6366f1" });
}
