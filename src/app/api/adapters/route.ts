import { NextResponse } from "next/server";
import { getAllAdapterMeta } from "@/lib/adapters";

export async function GET() {
  const adapters = getAllAdapterMeta();
  return NextResponse.json(adapters);
}
