"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Activity, Loader2, Search, Clock, Zap, AlertCircle,
  ChevronDown, ChevronUp, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { getTraces, getTrace, getAgents, getConversations } from "@/lib/api";
import { cn, getInitials, getAvatarColor, timeAgo } from "@/lib/utils";
import type { Trace, TraceSpan, AgentWithStatus, ConversationWithDetails } from "@/lib/types";
import { toast } from "sonner";

const SPAN_COLORS: Record<string, string> = {
  routing: "bg-blue-500",
  adapter: "bg-violet-500",
  tool_call: "bg-amber-500",
  subagent: "bg-cyan-500",
  response: "bg-emerald-500",
  guardrail: "bg-red-500",
};

const SPAN_LABEL_COLORS: Record<string, string> = {
  routing: "text-blue-600 bg-blue-500/10",
  adapter: "text-violet-600 bg-violet-500/10",
  tool_call: "text-amber-600 bg-amber-500/10",
  subagent: "text-cyan-600 bg-cyan-500/10",
  response: "text-emerald-600 bg-emerald-500/10",
  guardrail: "text-red-600 bg-red-500/10",
};

function durationColor(ms: number): string {
  if (ms < 500) return "text-emerald-500";
  if (ms < 2000) return "text-yellow-500";
  return "text-red-500";
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export default function TracesPage() {
  const { agents, setAgents } = useStore();
  const [traces, setTracesState] = useState<Trace[]>([]);
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Record<string, TraceSpan[]>>({});
  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null);

  // Filters
  const [filterConversation, setFilterConversation] = useState<string>("");
  const [filterAgent, setFilterAgent] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [t, a, c] = await Promise.all([getTraces(), getAgents(), getConversations()]);
      setTracesState(t);
      setAgents(a);
      setConversations(c);
    } catch {
      toast.error("Failed to load traces");
    } finally {
      setLoading(false);
    }
  }

  async function handleExpand(trace: Trace) {
    if (expandedId === trace.id) {
      setExpandedId(null);
      setSelectedSpan(null);
      return;
    }
    setExpandedId(trace.id);
    setSelectedSpan(null);

    // Parse spans from the trace if we haven't already
    if (!expandedSpans[trace.id]) {
      try {
        const fullTrace = await getTrace(trace.id);
        const spans: TraceSpan[] = JSON.parse(fullTrace.spans_json || "[]");
        setExpandedSpans((prev) => ({ ...prev, [trace.id]: spans }));
      } catch {
        // Fallback: try parsing from local data
        try {
          const spans: TraceSpan[] = JSON.parse(trace.spans_json || "[]");
          setExpandedSpans((prev) => ({ ...prev, [trace.id]: spans }));
        } catch {
          toast.error("Failed to load trace spans");
        }
      }
    }
  }

  const filtered = useMemo(() => {
    return traces.filter((t) => {
      if (filterConversation && t.conversation_id !== filterConversation) return false;
      if (filterAgent && t.agent_id !== filterAgent) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      return true;
    });
  }, [traces, filterConversation, filterAgent, filterStatus]);

  const avgDuration = traces.length > 0
    ? Math.round(traces.reduce((sum, t) => sum + t.total_duration_ms, 0) / traces.length)
    : 0;
  const errorCount = traces.filter((t) => t.status === "error").length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Traces</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Inspect request traces, spans, and timing for agent interactions
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Activity className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{traces.length}</div>
              <div className="text-xs text-muted-foreground">Total Traces</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-violet-500" />
            <div>
              <div className={cn("text-2xl font-bold", durationColor(avgDuration))}>
                {formatDuration(avgDuration)}
              </div>
              <div className="text-xs text-muted-foreground">Avg Duration</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <div className="text-2xl font-bold">{errorCount}</div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <Select value={filterConversation} onValueChange={(v) => setFilterConversation(v || "")}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All conversations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All conversations</SelectItem>
              {conversations.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name || c.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={filterAgent} onValueChange={(v) => setFilterAgent(v || "")}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All agents</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v || "")}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="ok">OK</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(filterConversation || filterAgent || filterStatus) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => { setFilterConversation(""); setFilterAgent(""); setFilterStatus(""); }}
          >
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Trace List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No traces found</h3>
            <p className="text-sm text-muted-foreground">
              Traces are recorded when agents process messages
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((trace) => {
            const isExpanded = expandedId === trace.id;
            const agent = agents.find((a) => a.id === trace.agent_id);
            const conversation = conversations.find((c) => c.id === trace.conversation_id);
            const spans = expandedSpans[trace.id] || [];
            const maxEnd = spans.length > 0
              ? Math.max(...spans.map((s) => s.start_ms + s.duration_ms))
              : trace.total_duration_ms || 1;

            return (
              <Card key={trace.id} className="overflow-hidden">
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => handleExpand(trace)}
                >
                  {/* Agent avatar */}
                  {agent ? (
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-medium text-white shrink-0",
                        getAvatarColor(agent.id),
                      )}
                    >
                      {getInitials(agent.name)}
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {conversation && (
                        <span className="text-sm font-medium truncate">
                          {conversation.name || "Conversation"}
                        </span>
                      )}
                      {agent && (
                        <Badge variant="outline" className="text-[10px]">
                          {agent.name}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          trace.status === "error"
                            ? "border-red-500/30 text-red-600"
                            : "border-emerald-500/30 text-emerald-600",
                        )}
                      >
                        {trace.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{timeAgo(trace.created_at)}</span>
                      <span className={durationColor(trace.total_duration_ms)}>
                        {formatDuration(trace.total_duration_ms)}
                      </span>
                      <span>{trace.total_tokens.toLocaleString()} tokens</span>
                      <span>{formatCost(trace.total_cost)}</span>
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>

                {/* Expanded: Span Waterfall */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30">
                    <div className="flex">
                      {/* Waterfall panel */}
                      <div className={cn("flex-1 p-4 space-y-1.5", selectedSpan && "border-r border-border")}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Span Waterfall
                          </span>
                          <div className="flex gap-2 flex-wrap">
                            {Object.entries(SPAN_LABEL_COLORS).map(([type, cls]) => (
                              <span key={type} className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium", cls)}>
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>

                        {spans.length === 0 ? (
                          <div className="text-xs text-muted-foreground text-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                            Loading spans...
                          </div>
                        ) : (
                          spans.map((span) => {
                            const leftPct = maxEnd > 0 ? (span.start_ms / maxEnd) * 100 : 0;
                            const widthPct = maxEnd > 0 ? Math.max((span.duration_ms / maxEnd) * 100, 1) : 1;
                            const isSelected = selectedSpan?.id === span.id;
                            return (
                              <div
                                key={span.id}
                                className={cn(
                                  "flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-colors",
                                  isSelected ? "bg-accent" : "hover:bg-accent/40",
                                )}
                                onClick={() => setSelectedSpan(isSelected ? null : span)}
                              >
                                <span className="text-[10px] text-muted-foreground w-20 truncate shrink-0">
                                  {span.name}
                                </span>
                                <div className="flex-1 h-5 relative bg-muted rounded overflow-hidden">
                                  <div
                                    className={cn(
                                      "absolute top-0.5 bottom-0.5 rounded",
                                      SPAN_COLORS[span.type] || "bg-gray-400",
                                      span.status === "error" && "opacity-60",
                                    )}
                                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground w-14 text-right shrink-0">
                                  {formatDuration(span.duration_ms)}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Detail panel for selected span */}
                      {selectedSpan && (
                        <div className="w-80 p-4 space-y-3 shrink-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">{selectedSpan.name}</h4>
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6"
                              onClick={() => setSelectedSpan(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Type</span>
                              <div>
                                <Badge
                                  variant="outline"
                                  className={cn("text-[10px]", SPAN_LABEL_COLORS[selectedSpan.type])}
                                >
                                  {selectedSpan.type}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status</span>
                              <div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    selectedSpan.status === "error"
                                      ? "border-red-500/30 text-red-600"
                                      : "border-emerald-500/30 text-emerald-600",
                                  )}
                                >
                                  {selectedSpan.status}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Start</span>
                              <div className="font-mono">{selectedSpan.start_ms}ms</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Duration</span>
                              <div className={cn("font-mono", durationColor(selectedSpan.duration_ms))}>
                                {formatDuration(selectedSpan.duration_ms)}
                              </div>
                            </div>
                          </div>
                          {selectedSpan.input && (
                            <div>
                              <Label className="text-[10px]">Input</Label>
                              <pre className="mt-1 text-[10px] bg-background rounded-md p-2 whitespace-pre-wrap border border-border max-h-32 overflow-auto">
                                {selectedSpan.input}
                              </pre>
                            </div>
                          )}
                          {selectedSpan.output && (
                            <div>
                              <Label className="text-[10px]">Output</Label>
                              <pre className="mt-1 text-[10px] bg-background rounded-md p-2 whitespace-pre-wrap border border-border max-h-32 overflow-auto">
                                {selectedSpan.output}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
