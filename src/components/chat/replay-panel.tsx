"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronFirst,
  ChevronLast,
  Clock,
  Hash,
  Cpu,
  User,
  Bot,
  MessageSquare,
  Pencil,
  ArrowRight,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { getReplaySnapshots } from "@/lib/api";
import type { ReplaySnapshot, ReplaySnapshotData } from "@/lib/types";

interface ReplayPanelProps {
  conversationId: string;
  onClose: () => void;
}

const PLAYBACK_SPEEDS = [1, 2, 4, 8];

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getEventIcon(event: string) {
  switch (event) {
    case "message_added":
      return <MessageSquare className="h-3 w-3" />;
    case "message_edited":
      return <Pencil className="h-3 w-3" />;
    case "handoff":
      return <ArrowRight className="h-3 w-3" />;
    case "tool_call":
      return <Cpu className="h-3 w-3" />;
    case "agent_start":
      return <Bot className="h-3 w-3" />;
    default:
      return <MessageSquare className="h-3 w-3" />;
  }
}

function getEventLabel(event: string): string {
  switch (event) {
    case "message_added":
      return "Message";
    case "message_edited":
      return "Edited";
    case "message_deleted":
      return "Deleted";
    case "handoff":
      return "Handoff";
    case "tool_call":
      return "Tool Call";
    case "agent_start":
      return "Agent Start";
    case "checkpoint":
      return "Checkpoint";
    default:
      return "Event";
  }
}

export function ReplayPanel({ conversationId, onClose }: ReplayPanelProps) {
  const [snapshots, setSnapshots] = useState<ReplaySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const speed = PLAYBACK_SPEEDS[speedIndex];

  // Load snapshots
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getReplaySnapshots(conversationId)
      .then((data) => {
        if (cancelled) return;
        setSnapshots(data);
        setCurrentIndex(0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load replay data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [conversationId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Auto-play logic
  useEffect(() => {
    if (isPlaying && snapshots.length > 0) {
      const interval = Math.max(400, 2000 / speed);
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= snapshots.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [isPlaying, speed, snapshots.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(snapshots.length - 1, i + 1));
  }, [snapshots.length]);

  const handleFirst = useCallback(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  const handleLast = useCallback(() => {
    setCurrentIndex(Math.max(0, snapshots.length - 1));
    setIsPlaying(false);
  }, [snapshots.length]);

  const togglePlay = useCallback(() => {
    if (currentIndex >= snapshots.length - 1) {
      // Restart from beginning
      setCurrentIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((p) => !p);
    }
  }, [currentIndex, snapshots.length]);

  const cycleSpeed = useCallback(() => {
    setSpeedIndex((i) => (i + 1) % PLAYBACK_SPEEDS.length);
  }, []);

  // Keyboard controls
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handlePrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNext();
          break;
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "Home":
          e.preventDefault();
          handleFirst();
          break;
        case "End":
          e.preventDefault();
          handleLast();
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext, togglePlay, handleFirst, handleLast, onClose]);

  // Parse current snapshot data
  const current = snapshots[currentIndex];
  const currentData: ReplaySnapshotData | null = current
    ? (() => {
        try {
          return JSON.parse(current.snapshot_data);
        } catch {
          return null;
        }
      })()
    : null;

  if (loading) {
    return (
      <div className="glass rounded-xl p-4 animate-fade-in">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Conversation Replay</span>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading replay data...
        </div>
      </div>
    );
  }

  if (error || snapshots.length === 0) {
    return (
      <div className="glass rounded-xl p-4 animate-fade-in">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Conversation Replay</span>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="text-center py-6 text-muted-foreground text-sm">
          {error || "No replay data available for this conversation."}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4 animate-fade-in space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Conversation Replay</span>
          <Badge variant="outline" className="text-[0.5625rem] px-1.5 py-0 tabular-nums">
            {currentIndex + 1} / {snapshots.length}
          </Badge>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={onClose} title="Close replay (Esc)">
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Timeline scrubber */}
      <div className="space-y-1">
        <Slider
          min={0}
          max={snapshots.length - 1}
          step={1}
          value={[currentIndex]}
          onValueChange={([val]) => {
            setCurrentIndex(val);
            setIsPlaying(false);
          }}
        />
        <div className="flex items-center justify-between text-[0.5625rem] text-muted-foreground tabular-nums px-0.5">
          <span>{formatTimestamp(snapshots[0].timestamp_ms)}</span>
          <span>{formatTimestamp(snapshots[snapshots.length - 1].timestamp_ms)}</span>
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-1">
        <Button variant="ghost" size="icon-xs" onClick={handleFirst} title="First (Home)" disabled={currentIndex === 0}>
          <ChevronFirst className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={handlePrev} title="Previous (Left arrow)" disabled={currentIndex === 0}>
          <SkipBack className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 rounded-full"
          onClick={togglePlay}
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={handleNext} title="Next (Right arrow)" disabled={currentIndex >= snapshots.length - 1}>
          <SkipForward className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={handleLast} title="Last (End)" disabled={currentIndex >= snapshots.length - 1}>
          <ChevronLast className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-4 bg-foreground/10 mx-1" />
        <Button
          variant="ghost"
          size="xs"
          className="tabular-nums text-[0.5625rem] px-1.5"
          onClick={cycleSpeed}
          title="Playback speed"
        >
          {speed}x
        </Button>
      </div>

      {/* Snapshot viewer */}
      {currentData && (
        <div className="rounded-lg bg-foreground/[0.05] p-3 space-y-2">
          {/* Event type + agent */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center justify-center h-5 w-5 rounded-md",
              currentData.agent_id ? "bg-[var(--accent-emerald)]/20 text-[var(--accent-emerald)]" : "bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]",
            )}>
              {currentData.agent_id ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
            </div>
            <span className="text-sm font-medium text-foreground">
              {currentData.agent_name || "Unknown"}
            </span>
            <Badge variant="outline" className="text-[0.5625rem] px-1.5 py-0 gap-1">
              {getEventIcon(currentData.event)}
              {getEventLabel(currentData.event)}
            </Badge>
            <span className="text-[0.5625rem] text-muted-foreground ml-auto tabular-nums">
              {formatTimestamp(current.timestamp_ms)}
            </span>
          </div>

          {/* Content preview */}
          {currentData.content_preview && (
            <div className="text-xs text-muted-foreground leading-relaxed line-clamp-3 pl-7">
              {currentData.content_preview}
            </div>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-3 pl-7 flex-wrap">
            {currentData.response_time_ms != null && currentData.response_time_ms > 0 && (
              <div className="flex items-center gap-1 text-[0.5625rem] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                {formatDuration(currentData.response_time_ms)}
              </div>
            )}
            {currentData.token_count != null && currentData.token_count > 0 && (
              <div className="flex items-center gap-1 text-[0.5625rem] text-muted-foreground">
                <Hash className="h-2.5 w-2.5" />
                {currentData.token_count.toLocaleString()} tokens
              </div>
            )}
            {currentData.model && (
              <div className="flex items-center gap-1 text-[0.5625rem] text-muted-foreground">
                <Cpu className="h-2.5 w-2.5" />
                {currentData.model}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mini-timeline: dots showing all events, highlighting current */}
      {snapshots.length <= 60 && (
        <div className="flex items-center gap-px px-0.5 overflow-hidden">
          {snapshots.map((snap, i) => {
            const data: ReplaySnapshotData | null = (() => {
              try { return JSON.parse(snap.snapshot_data); } catch { return null; }
            })();
            const isUser = !data?.agent_id;
            const isCurrent = i === currentIndex;
            return (
              <button
                key={snap.id}
                className={cn(
                  "shrink-0 rounded-full transition-all duration-150 hover:opacity-100",
                  isCurrent
                    ? "h-2.5 w-2.5 ring-1 ring-white/50 opacity-100"
                    : "h-1.5 w-1.5 opacity-40 hover:scale-150",
                  isUser ? "bg-[var(--accent-blue)]" : "bg-[var(--accent-emerald)]",
                  i < currentIndex && "opacity-70",
                )}
                onClick={() => {
                  setCurrentIndex(i);
                  setIsPlaying(false);
                }}
                title={`Step ${i + 1}: ${data?.agent_name || "Unknown"} - ${getEventLabel(data?.event || "message_added")}`}
              />
            );
          })}
        </div>
      )}

      {/* Keyboard hints */}
      <div className="flex items-center justify-center gap-3 text-[0.5rem] text-muted-foreground/50">
        <span>Space: play/pause</span>
        <span>Arrows: step</span>
        <span>Esc: close</span>
      </div>
    </div>
  );
}
