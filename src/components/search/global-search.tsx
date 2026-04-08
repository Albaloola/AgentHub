"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { getConversations, getMessages, getAgents } from "@/lib/api";
import type { ConversationWithDetails, MessageWithToolCalls, AgentWithStatus } from "@/lib/types";
import { useRouter } from "next/navigation";

interface SearchResult {
  conversation: ConversationWithDetails;
  messages: { msg: MessageWithToolCalls; highlight: string }[];
  agent?: AgentWithStatus;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAgent, setFilterAgent] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "user" | "agent">("all");
  const [agents, setAgents] = useState<AgentWithStatus[]>([]);
  const router = useRouter();

  useEffect(() => {
    getAgents().then(setAgents).catch(() => {});
  }, []);

  const search = useCallback(async () => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const [convs, allAgents] = await Promise.all([getConversations(), getAgents()]);
      const found: SearchResult[] = [];

      for (const conv of convs) {
        if (filterAgent && !conv.agents.some((a) => a.id === filterAgent)) continue;

        const msgs = await getMessages(conv.id);
        const matches = msgs.filter((m) =>
          m.content.toLowerCase().includes(query.toLowerCase()),
        );

        let filteredMatches = matches;
        if (filterType === "user") {
          filteredMatches = matches.filter((m) => m.sender_agent_id === null);
        } else if (filterType === "agent") {
          filteredMatches = matches.filter((m) => m.sender_agent_id !== null);
        }

        if (filteredMatches.length > 0) {
          const agent = conv.agent_id
            ? allAgents.find((a) => a.id === conv.agent_id)
            : undefined;

          found.push({
            conversation: conv,
            messages: filteredMatches.slice(0, 3).map((m) => ({
              msg: m,
              highlight: highlightText(m.content, query),
            })),
            agent,
          });
        }
      }

      setResults(found);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, filterAgent, filterType]);

  useEffect(() => {
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all conversations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          {query && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQuery("")}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={filterAgent || "__all__"} onValueChange={(v) => setFilterAgent(v === "__all__" ? "" : (v ?? ""))}>
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All agents</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={(v) => v && setFilterType(v as typeof filterType)}>
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All messages</SelectItem>
              <SelectItem value="user">User only</SelectItem>
              <SelectItem value="agent">Agent only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          )}

          {!loading && results.map((result) => (
            <div key={result.conversation.id} className="rounded-lg border border-border bg-card/50">
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 rounded-t-lg"
                onClick={() => router.push(`/chat/${result.conversation.id}`)}
              >
                {result.conversation.agents[0] && (
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-medium text-white",
                      getAvatarColor(result.conversation.agents[0].id),
                    )}
                  >
                    {getInitials(result.conversation.agents[0].name)}
                  </div>
                )}
                <span className="text-sm font-medium">{result.conversation.name}</span>
                <Badge variant="outline" className="text-[0.625rem]">
                  {result.messages.length} matches
                </Badge>
              </button>

              <Separator />

              <div className="p-3 space-y-2">
                {result.messages.map((m) => (
                  <div key={m.msg.id} className="rounded-md bg-muted/50 px-3 py-2 text-xs">
                    <div className="flex items-center gap-1 mb-1">
                      <Badge variant={m.msg.sender_agent_id ? "secondary" : "default"} className="text-[0.625rem]">
                        {m.msg.sender_agent_id ? "Agent" : "You"}
                      </Badge>
                      <span className="text-[0.625rem] text-muted-foreground">
                        {new Date(m.msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div
                      className="text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: m.highlight }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function highlightText(text: string, query: string): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  const before = escapeHtml(text.slice(0, idx));
  const match = escapeHtml(text.slice(idx, idx + query.length));
  const after = escapeHtml(text.slice(idx + query.length));
  return `${before}<mark class="rounded px-0.5" style="background: var(--theme-accent-softer, rgba(59,130,246,0.15)); color: var(--theme-accent-text, var(--foreground))">${match}</mark>${after}`;
}
