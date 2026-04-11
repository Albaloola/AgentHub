"use client";

import { useState, useMemo } from "react";
import {
  Activity,
  Wrench,
  Network,
  Coins,
  Clock,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { MessageWithToolCalls, Subagent } from "@/lib/types";

interface FloatingStatsProps {
  messages: MessageWithToolCalls[];
  subagents: Subagent[];
  isStreaming: boolean;
  autoApprove: boolean;
  onToggleAutoApprove: () => void;
}

export function FloatingStats({
  messages,
  subagents,
  isStreaming,
  autoApprove,
  onToggleAutoApprove,
}: FloatingStatsProps) {
  const [expanded, setExpanded] = useState(false);

  const stats = useMemo(() => {
    let totalTokens = 0;
    let totalToolCalls = 0;
    const toolCallsList: { name: string; status: string; id: string }[] = [];

    for (const msg of messages) {
      totalTokens += msg.token_count ?? 0;
      totalToolCalls += msg.tool_calls.length;
      for (const tc of msg.tool_calls) {
        toolCallsList.push({
          name: tc.tool_name,
          status: tc.status,
          id: tc.id,
        });
      }
    }

    // Estimate response time from first assistant message to latest
    let responseTime: string | null = null;
    const assistantMsgs = messages.filter((m) => m.sender_agent_id !== null);
    if (assistantMsgs.length >= 1) {
      const first = new Date(assistantMsgs[0].created_at + "Z").getTime();
      const last = new Date(assistantMsgs[assistantMsgs.length - 1].created_at + "Z").getTime();
      const diffMs = last - first;
      if (diffMs > 0) {
        const seconds = Math.round(diffMs / 1000);
        responseTime = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
      }
    }

    return { totalTokens, totalToolCalls, toolCallsList, responseTime };
  }, [messages]);

  const formatTokens = (count: number): string => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return String(count);
  };

  if (messages.length === 0) return null;

  return (
    <div
      className={cn(
        "fixed right-4 top-1/2 -translate-y-1/2 z-50 transition-all duration-300",
        expanded ? "w-72" : "w-auto",
      )}
    >
      {expanded ? (
        /* Expanded panel */
        <div
          className="glass-strong rounded-2xl border border-border/20 shadow-2xl shadow-black/40 animate-fade-in"
          style={{ animationDuration: "200ms" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
            <div className="flex items-center gap-2">
              <Activity
                className={cn(
                  "h-4 w-4",
                  isStreaming ? "text-[var(--accent-blue)] animate-pulse" : "text-muted-foreground",
                )}
              />
              <span className="text-sm font-medium">Live Stats</span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="h-6 w-6 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-muted-foreground hover:bg-foreground/5 transition-colors"
              aria-label="Close stats panel"
              aria-expanded={true}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <ScrollArea className="max-h-[60vh]">
            <div className="p-4 space-y-4">
              {/* Token usage */}
              <StatSection icon={Coins} iconColor="text-[var(--accent-amber)]" label="Tokens">
                <div className="text-lg font-semibold tabular-nums text-foreground">
                  {formatTokens(stats.totalTokens)}
                </div>
                {isStreaming && (
                  <span className="text-[0.625rem] text-[var(--accent-blue)] animate-pulse">streaming...</span>
                )}
              </StatSection>

              {/* Response time */}
              {stats.responseTime && (
                <StatSection icon={Clock} iconColor="text-[var(--accent-cyan)]" label="Response Time">
                  <div className="text-sm font-medium tabular-nums text-foreground">
                    {stats.responseTime}
                  </div>
                </StatSection>
              )}

              {/* Tool calls */}
              <StatSection icon={Wrench} iconColor="text-[var(--accent-violet)]" label={`Tool Calls (${stats.totalToolCalls})`}>
                {stats.toolCallsList.length > 0 ? (
                  <div className="space-y-1 mt-1">
                    {stats.toolCallsList.map((tc) => (
                      <div
                        key={tc.id}
                        className="flex items-center gap-2 text-xs rounded-lg px-2 py-1 bg-foreground/[0.03]"
                      >
                        <ToolStatusIcon status={tc.status} />
                        <span className="font-mono text-foreground/80 truncate flex-1">
                          {tc.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[0.5625rem] px-1 py-0 rounded-md",
                            tc.status === "success"
                              ? "text-[var(--accent-emerald)] border-[var(--status-online)]/20"
                              : tc.status === "error"
                                ? "text-[var(--status-danger)] border-[var(--status-danger)]/20"
                                : "text-[var(--status-warning)] border-[var(--status-warning)]/20",
                          )}
                        >
                          {tc.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/50">No tool calls yet</span>
                )}
              </StatSection>

              {/* Subagents */}
              <StatSection icon={Network} iconColor="text-[var(--accent-emerald)]" label={`Subagents (${subagents.length})`}>
                {subagents.length > 0 ? (
                  <div className="space-y-1 mt-1">
                    {subagents.map((sa) => (
                      <div
                        key={sa.id}
                        className="flex items-center gap-2 text-xs rounded-lg px-2 py-1 bg-foreground/[0.03]"
                      >
                        <SubagentStatusIcon status={sa.status} />
                        <span className="text-foreground/80 truncate flex-1">
                          {sa.goal}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[0.5625rem] px-1 py-0 rounded-md",
                            sa.status === "completed"
                              ? "text-[var(--accent-emerald)] border-[var(--status-online)]/20"
                              : sa.status === "failed"
                                ? "text-[var(--status-danger)] border-[var(--status-danger)]/20"
                                : "text-[var(--status-warning)] border-[var(--status-warning)]/20",
                          )}
                        >
                          {sa.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/50">No subagents spawned</span>
                )}
              </StatSection>

              {/* Auto-approve toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border/20 glass-bubble px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
                  <span className="text-xs font-medium">Auto-approve</span>
                </div>
                <Switch
                  checked={autoApprove}
                  onCheckedChange={onToggleAutoApprove}
                />
              </div>
            </div>
          </ScrollArea>
        </div>
      ) : (
        /* Collapsed pill */
        <button
          onClick={() => setExpanded(true)}
          aria-label="Open stats panel"
          aria-expanded={false}
          className={cn(
            "flex flex-col items-center gap-2 rounded-2xl px-2.5 py-3 transition-all duration-300",
            "glass-strong border border-border/20 hover:border-border/40",
            "shadow-lg shadow-black/30 hover:shadow-xl",
            isStreaming && "shadow-[var(--neon-blue-shadow)]",
          )}
        >
          <Activity
            className={cn(
              "h-4 w-4",
              isStreaming ? "text-[var(--accent-blue)] animate-pulse" : "text-muted-foreground/60",
            )}
          />

          {/* Token count */}
          <div className="flex flex-col items-center">
            <Coins className="h-3 w-3 text-[var(--accent-amber)] opacity-70" />
            <span className="text-[0.625rem] text-muted-foreground/60 tabular-nums mt-0.5">
              {formatTokens(stats.totalTokens)}
            </span>
          </div>

          {/* Tool calls count */}
          <div className="flex flex-col items-center">
            <Wrench className="h-3 w-3 text-[var(--accent-violet)] opacity-70" />
            <span className="text-[0.625rem] text-muted-foreground/60 tabular-nums mt-0.5">
              {stats.totalToolCalls}
            </span>
          </div>

          {/* Subagents count */}
          {subagents.length > 0 && (
            <div className="flex flex-col items-center">
              <Network className="h-3 w-3 text-[var(--accent-emerald)] opacity-70" />
              <span className="text-[0.625rem] text-muted-foreground/60 tabular-nums mt-0.5">
                {subagents.length}
              </span>
            </div>
          )}

          <ChevronLeft className="h-3 w-3 text-muted-foreground/30 mt-1" />
        </button>
      )}
    </div>
  );
}

function StatSection({
  icon: Icon,
  iconColor,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        <span className="text-xs font-medium text-muted-foreground/80">{label}</span>
      </div>
      <div className="pl-5">{children}</div>
    </div>
  );
}

function ToolStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="h-3 w-3 text-[var(--accent-emerald)] shrink-0" />;
    case "error":
      return <XCircle className="h-3 w-3 text-[var(--status-danger)] shrink-0" />;
    default:
      return <Loader2 className="h-3 w-3 text-[var(--status-warning)] animate-spin shrink-0" />;
  }
}

function SubagentStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-3 w-3 text-[var(--accent-emerald)] shrink-0" />;
    case "failed":
      return <XCircle className="h-3 w-3 text-[var(--status-danger)] shrink-0" />;
    default:
      return <Loader2 className="h-3 w-3 text-[var(--status-warning)] animate-spin shrink-0" />;
  }
}
