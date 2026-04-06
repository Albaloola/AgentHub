import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { is_resolved: boolean };

  const anomaly = db
    .prepare("SELECT * FROM anomaly_events WHERE id = ?")
    .get(id);
  if (!anomaly) {
    return NextResponse.json(
      { error: "Anomaly not found" },
      { status: 404 },
    );
  }

  db.prepare("UPDATE anomaly_events SET is_resolved = ? WHERE id = ?").run(
    body.is_resolved ? 1 : 0,
    id,
  );

  const updated = db
    .prepare("SELECT * FROM anomaly_events WHERE id = ?")
    .get(id);
  return NextResponse.json(updated);
}
