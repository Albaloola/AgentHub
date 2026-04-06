import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const trace = db
    .prepare(
      `SELECT t.*, a.name as agent_name
       FROM traces t
       LEFT JOIN agents a ON a.id = t.agent_id
       WHERE t.id = ?`,
    )
    .get(id) as Record<string, unknown> | undefined;

  if (!trace) {
    return NextResponse.json({ error: "Trace not found" }, { status: 404 });
  }

  // Parse spans_json for the client
  try {
    trace.spans = JSON.parse(trace.spans_json as string);
  } catch {
    trace.spans = [];
  }

  return NextResponse.json(trace);
}
