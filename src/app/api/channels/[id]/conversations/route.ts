import { NextResponse } from "next/server";
import { ensureServerRuntime } from "@/lib/backend/runtime/server-runtime";
import { createConversationFromChannel } from "@/lib/backend/services/channels";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureServerRuntime();
  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    type?: "single" | "group";
    agent_ids?: string[];
    response_mode?: "discussion" | "parallel" | "targeted";
  };

  try {
    const conversation = createConversationFromChannel({
      channelId: id,
      name: body.name,
      type: body.type,
      agentIds: body.agent_ids,
      responseMode: body.response_mode,
    });
    return NextResponse.json({ id: conversation.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create conversation" },
      { status: 400 },
    );
  }
}
