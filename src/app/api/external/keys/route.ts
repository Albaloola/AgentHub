import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { createHash } from "crypto";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function maskHash(hash: string): string {
  return hash.slice(0, 8) + "..." + hash.slice(-4);
}

export async function GET() {
  const keys = db
    .prepare("SELECT * FROM api_keys ORDER BY created_at DESC")
    .all() as Array<Record<string, unknown>>;

  // Mask the key_hash so the full hash is never exposed
  const masked = keys.map((k) => ({
    ...k,
    key_hash: maskHash(k.key_hash as string),
  }));

  return NextResponse.json(masked);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    permissions?: string[];
    rate_limit_rpm?: number;
  };

  if (!body.name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 },
    );
  }

  const id = uuid();
  const rawKey = `ah_${uuid().replace(/-/g, "")}`;
  const keyHash = hashKey(rawKey);

  db.prepare(
    `INSERT INTO api_keys (id, name, key_hash, permissions, rate_limit_rpm)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.name,
    keyHash,
    JSON.stringify(body.permissions ?? ["agent:read", "agent:write"]),
    body.rate_limit_rpm ?? 60,
  );

  const created = db.prepare("SELECT * FROM api_keys WHERE id = ?").get(id) as Record<string, unknown>;

  // Return the raw key ONCE at creation time - it cannot be retrieved again
  return NextResponse.json(
    { ...created, key_hash: maskHash(created.key_hash as string), raw_key: rawKey },
    { status: 201 },
  );
}
