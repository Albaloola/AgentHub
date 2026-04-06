import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const fileId = uuid();
  const ext = path.extname(file.name);
  const fileName = `${fileId}${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  const bytes = await file.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(bytes));

  return NextResponse.json({
    id: fileId,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    file_path: filePath,
  });
}

export async function DELETE() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const attachments = db
    .prepare("SELECT id, file_path FROM attachments WHERE created_at < ? AND message_id IS NULL")
    .all(cutoff) as { id: string; file_path: string }[];

  for (const att of attachments) {
    try {
      fs.unlinkSync(att.file_path);
    } catch { /* already deleted */ }
    db.prepare("DELETE FROM attachments WHERE id = ?").run(att.id);
  }

  return NextResponse.json({ cleaned: attachments.length });
}
