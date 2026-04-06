import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = db.prepare("SELECT is_available FROM agents WHERE id = ?").get(id) as { is_available: number } | undefined;
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  db.prepare("UPDATE agents SET is_available = ? WHERE id = ?").run(agent.is_available ? 0 : 1, id);
  return NextResponse.json({ is_available: !agent.is_available });
}
