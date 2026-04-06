import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const workflows = db.prepare("SELECT * FROM workflows ORDER BY updated_at DESC").all();
  return NextResponse.json(workflows);
}

export async function POST(request: Request) {
  const { name, description, nodes, edges } = await request.json();
  const id = uuid();
  db.prepare(
    "INSERT INTO workflows (id, name, description, nodes, edges) VALUES (?, ?, ?, ?, ?)",
  ).run(id, name, description || null, JSON.stringify(nodes || []), JSON.stringify(edges || []));
  return NextResponse.json({ id, message: "Workflow created" });
}
