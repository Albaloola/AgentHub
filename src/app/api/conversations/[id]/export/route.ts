import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Message, ConversationWithDetails, Tag } from "@/lib/types";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(_request.url);
  const format = url.searchParams.get("format") || "markdown";

  const conversation = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as ConversationWithDetails | undefined;
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const messages = db.prepare(
    "SELECT m.*, a.name as agent_name FROM messages m LEFT JOIN agents a ON a.id = m.sender_agent_id WHERE m.conversation_id = ? ORDER BY m.created_at ASC",
  ).all(id) as (Message & { agent_name: string | null })[];

  const tags = db.prepare(
    "SELECT t.* FROM tags t JOIN conversation_tags ct ON ct.tag_id = t.id WHERE ct.conversation_id = ?",
  ).all(id) as Tag[];

  if (format === "json") {
    return NextResponse.json({ conversation, messages, tags });
  }

  if (format === "html") {
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(conversation.name)}</title><style>body{font-family:system-ui;max-width:800px;margin:0 auto;padding:20px}.msg{margin:10px 0;padding:10px;border-radius:8px}.user{background:#f0f0f0}.agent{background:#e8f5e9}.meta{font-size:12px;color:#666}</style></head><body>`;
    html += `<h1>${escapeHtml(conversation.name)}</h1>`;
    html += `<p class="meta">${conversation.type} • ${new Date(conversation.created_at).toLocaleString()}</p>`;
    if (tags.length > 0) html += `<p>${tags.map(t => `<span style="background:${t.color};color:white;padding:2px 6px;border-radius:4px;font-size:12px">${escapeHtml(t.name)}</span>`).join(" ")}</p>`;
    html += "<hr/>";
    for (const msg of messages) {
      const cls = msg.sender_agent_id ? "agent" : "user";
      const sender = msg.sender_agent_id ? msg.agent_name || "Agent" : "You";
      html += `<div class="msg ${cls}"><strong>${escapeHtml(sender)}</strong> <span class="meta">${new Date(msg.created_at).toLocaleString()}</span><pre>${escapeHtml(msg.content)}</pre></div>`;
    }
    html += "</body></html>";
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }

  let md = `# ${conversation.name}\n\n`;
  md += `**Type:** ${conversation.type} | **Created:** ${new Date(conversation.created_at).toLocaleString()}\n\n`;
  if (tags.length > 0) md += `**Tags:** ${tags.map(t => t.name).join(", ")}\n\n`;
  md += "---\n\n";

  for (const msg of messages) {
    const sender = msg.sender_agent_id ? `**${msg.agent_name || "Agent"}**` : "**You**";
    md += `### ${sender} — ${new Date(msg.created_at).toLocaleString()}\n\n${msg.content}\n\n---\n\n`;
  }

  return new Response(md, { headers: { "Content-Type": "text/markdown" } });
}
