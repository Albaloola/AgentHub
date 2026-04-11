import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    db.prepare("SELECT 1").get();
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "ok",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
