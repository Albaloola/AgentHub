import { NextResponse } from "next/server";
import { getUploadsDir } from "@/lib/runtime-paths";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = getUploadsDir();

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".bmp": "image/bmp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  // Sanitize filename to prevent path traversal
  const safe = path.basename(filename);
  const filePath = path.join(UPLOAD_DIR, safe);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const ext = path.extname(safe).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const data = fs.readFileSync(filePath);

  return new Response(data, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
