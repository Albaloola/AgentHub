import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Record<string, string>;

  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );

  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(body)) {
      upsert.run(key, value);
    }
  });
  tx();

  return NextResponse.json({ ok: true });
}
