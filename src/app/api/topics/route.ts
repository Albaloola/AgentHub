import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const topics = db
    .prepare(
      "SELECT * FROM topic_clusters ORDER BY conversation_count DESC",
    )
    .all();
  return NextResponse.json(topics);
}
