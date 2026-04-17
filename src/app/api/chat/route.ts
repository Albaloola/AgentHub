import { db } from "@/lib/db";
import { ensureServerRuntime } from "@/lib/backend/runtime/server-runtime";
import { executeConversationTurn } from "@/lib/backend/services/execution";

export async function POST(request: Request) {
  ensureServerRuntime();

  const body = (await request.json()) as {
    conversation_id?: string;
    content?: string;
    target_agent_id?: string;
    attachment_ids?: string[];
  };

  if (!body.conversation_id || !body.content?.trim()) {
    return new Response(JSON.stringify({ error: "conversation_id and content are required" }), { status: 400 });
  }

  const conversation = db
    .prepare("SELECT id FROM conversations WHERE id = ?")
    .get(body.conversation_id) as { id: string } | undefined;
  if (!conversation) {
    return new Response(JSON.stringify({ error: "Conversation not found" }), { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await executeConversationTurn({
          conversationId: body.conversation_id!,
          content: body.content!,
          targetAgentId: body.target_agent_id,
          attachmentIds: Array.isArray(body.attachment_ids) ? body.attachment_ids : [],
          onEvent: send,
        });
      } catch (error) {
        send({
          type: "error",
          error: error instanceof Error ? error.message : "Stream error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
