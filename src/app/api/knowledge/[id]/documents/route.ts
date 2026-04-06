import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "data", "knowledge");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const documents = db
    .prepare("SELECT * FROM documents WHERE knowledge_base_id = ? ORDER BY created_at DESC")
    .all(id);

  return NextResponse.json(documents);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const kb = db.prepare("SELECT * FROM knowledge_bases WHERE id = ?").get(id);
  if (!kb) {
    return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Save file to disk
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const docId = uuid();
  const ext = path.extname(file.name);
  const fileName = `${docId}${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  const bytes = await file.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(bytes));

  // Read text content from file
  const textContent = Buffer.from(bytes).toString("utf-8");
  const preview = textContent.slice(0, 500);

  // Split into chunks: by double-newline paragraphs, falling back to every 1000 chars
  const paragraphs = textContent.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  let chunks: string[];

  if (paragraphs.length > 1) {
    // Paragraph-based chunking
    chunks = paragraphs;
  } else {
    // Fixed-size chunking at 1000 chars
    chunks = [];
    for (let i = 0; i < textContent.length; i += 1000) {
      chunks.push(textContent.slice(i, i + 1000));
    }
  }

  if (chunks.length === 0) {
    chunks = [textContent];
  }

  // Insert document record
  db.prepare(
    `INSERT INTO documents (id, knowledge_base_id, file_name, file_type, file_size, chunk_count, content_preview, file_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(docId, id, file.name, file.type, file.size, chunks.length, preview, filePath);

  // Insert chunks
  const insertChunk = db.prepare(
    `INSERT INTO document_chunks (id, document_id, content, chunk_index, token_count)
     VALUES (?, ?, ?, ?, ?)`,
  );

  for (let i = 0; i < chunks.length; i++) {
    const tokenEstimate = Math.ceil(chunks[i].length / 4);
    insertChunk.run(uuid(), docId, chunks[i], i, tokenEstimate);
  }

  // Update KB counters
  db.prepare(
    "UPDATE knowledge_bases SET document_count = document_count + 1, total_chunks = total_chunks + ? WHERE id = ?",
  ).run(chunks.length, id);

  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(docId);
  return NextResponse.json(doc, { status: 201 });
}
