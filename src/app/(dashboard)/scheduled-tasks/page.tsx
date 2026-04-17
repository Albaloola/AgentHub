"use client";

import { useEffect, useState } from "react";
import {
  Plus, Clock, Trash2, Play, Loader2, ChevronDown, ChevronUp,
  Calendar, Activity, AlertTriangle, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageIntro } from "@/components/layout/page-intro";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStore } from "@/lib/store";
import {
  getScheduledTasks, createScheduledTask, updateScheduledTask,
  runScheduledTask, deleteScheduledTask, getAgents,
} from "@/lib/api";
import { formatUiDateTime } from "@/lib/frontend/date-format";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import type { ScheduledTask, AgentWithStatus } from "@/lib/types";
import { toast } from "sonner";

export default function ScheduledTasksPage() {
  const agents = useStore((s) => s.agents);
  const setAgents = useStore((s) => s.setAgents);
  const dateFormat = useStore((s) => s.uiPrefs.dateFormat);
  const [tasks, setTasks] = useState<(ScheduledTask & { agent_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<(ScheduledTask & { agent_name?: string }) | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [t, a] = await Promise.all([getScheduledTasks(), getAgents()]);
      setTasks(t);
      setAgents(a);
    } catch {
      toast.error("Failed to load scheduled tasks");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(task: ScheduledTask & { agent_name?: string }) {
    try {
      await updateScheduledTask(task.id, { is_active: !task.is_active });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_active: !t.is_active } : t)),
      );
      toast.success(task.is_active ? "Task paused" : "Task activated");
    } catch {
      toast.error("Failed to update task");
    }
  }

  async function handleRunNow(id: string) {
    setRunningId(id);
    try {
      await runScheduledTask(id);
      toast.success("Task triggered");
      // Reload to get updated run info
      const updated = await getScheduledTasks();
      setTasks(updated);
    } catch {
      toast.error("Failed to run task");
    } finally {
      setRunningId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteScheduledTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  }

  function getAgentForTask(task: ScheduledTask & { agent_name?: string }) {
    return agents.find((a) => a.id === task.agent_id);
  }

  function formatCron(cron: string | null): string {
    if (!cron) return "Manual only";
    const parts = cron.split(" ");
    if (parts.length !== 5) return cron;
    const [min, hour, dom, mon, dow] = parts;
    if (min === "0" && hour !== "*" && dom === "*" && mon === "*" && dow === "*") return `Daily at ${hour}:00`;
    if (min === "0" && hour !== "*" && dom === "*" && mon === "*" && dow === "1-5") return `Weekdays at ${hour}:00`;
    if (min.startsWith("*/")) return `Every ${min.slice(2)} min`;
    if (min === "0" && hour === "*") return "Every hour";
    return cron;
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Never";
    return formatUiDateTime(new Date(`${dateStr}Z`), dateFormat);
  }

  const activeTasks = tasks.filter((t) => t.is_active);
  const totalRuns = tasks.reduce((sum, t) => sum + t.run_count, 0);
  const manualTasks = tasks.filter((t) => !t.cron_expression).length;
  const tasksNeedingAttention = tasks.filter((t) => t.last_status === "error").length;
  const pausedTasks = tasks.filter((t) => !t.is_active).length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="workspace-page workspace-stack max-w-6xl">
        <PageIntro
          eyebrow="Automation"
          title="Scheduled Tasks"
          description="Automate recurring prompts and operational checks without leaving the shell. Keep schedules, state, and run history in one consistent surface."
          actions={
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <Plus className="mr-1 h-4 w-4" />
                New Task
              </DialogTrigger>
              <CreateTaskDialog
                agents={agents}
                onCreated={(t) => {
                  setTasks((prev) => [t, ...prev]);
                  setCreateOpen(false);
                }}
              />
            </Dialog>
          }
          aside={
            <div className="workspace-metric-grid">
              <div className="workspace-metric">
                <p className="workspace-metric__label">Tasks</p>
                <p className="workspace-metric__value">{tasks.length}</p>
                <p className="workspace-metric__hint">Total automations</p>
              </div>
              <div className="workspace-metric">
                <p className="workspace-metric__label">Active</p>
                <p className="workspace-metric__value">{activeTasks.length}</p>
                <p className="workspace-metric__hint">Currently scheduled</p>
              </div>
              <div className="workspace-metric">
                <p className="workspace-metric__label">Runs</p>
                <p className="workspace-metric__value">{totalRuns}</p>
                <p className="workspace-metric__hint">Historical executions</p>
              </div>
            </div>
          }
        />

      <div className="workspace-panel-grid grid-cols-1 md:grid-cols-3">
        <Card className="workspace-panel">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-[var(--accent-blue)]" />
            <div>
              <div className="text-2xl font-bold">{manualTasks}</div>
              <div className="text-xs text-muted-foreground">Manual-only tasks</div>
            </div>
          </CardContent>
        </Card>
        <Card className="workspace-panel">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-[var(--accent-amber)]" />
            <div>
              <div className="text-2xl font-bold">{tasksNeedingAttention}</div>
              <div className="text-xs text-muted-foreground">Need attention</div>
            </div>
          </CardContent>
        </Card>
        <Card className="workspace-panel">
          <CardContent className="flex items-center gap-3 p-4">
            <Timer className="h-5 w-5 text-[var(--accent-amber)]" />
            <div>
              <div className="text-2xl font-bold">{pausedTasks}</div>
              <div className="text-xs text-muted-foreground">Paused schedules</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <Card className="workspace-panel">
          <CardContent>
            <EmptyState
              icon={Clock}
              eyebrow="Automation"
              title="No scheduled tasks yet"
              description="Create a task to run agent prompts on a schedule or keep it manual for one-click operational runs."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Task
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isExpanded = expandedId === task.id;
            const agent = getAgentForTask(task);
            const agentName = agent?.name ?? task.agent_name ?? "Unknown";
            const isRunning = runningId === task.id;

            return (
              <Card key={task.id} className="workspace-panel overflow-hidden">
                <div
                  className="workspace-list-row flex items-center gap-3 px-4 py-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : task.id)}
                >
                  {/* Agent avatar */}
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-label)] font-medium text-white shrink-0",
                      getAvatarColor(task.agent_id),
                    )}
                  >
                    {getInitials(agentName)}
                  </div>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{task.name}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[var(--text-label)]",
                          task.is_active
                            ? "border-[var(--status-online)]/30 text-[var(--status-online)]"
                            : "border-muted-foreground/30 text-muted-foreground",
                        )}
                      >
                        {task.is_active ? "active" : "paused"}
                      </Badge>
                      {task.last_status === "error" && (
                        <Badge variant="outline" className="text-[var(--text-label)] border-[var(--status-danger)]/30 text-[var(--status-danger)]">
                          error
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{agentName}</span>
                      <span>{formatCron(task.cron_expression)}</span>
                      <span>{task.run_count} runs</span>
                    </div>
                  </div>

                  {/* Last/Next run */}
                  <div className="hidden md:flex flex-col items-end text-xs text-muted-foreground shrink-0">
                    <span>Last: {formatDate(task.last_run_at)}</span>
                    <span>Next: {formatDate(task.next_run_at)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={task.is_active}
                      onCheckedChange={() => handleToggleActive(task)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isRunning}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunNow(task.id);
                      }}
                      title="Run now"
                    >
                      {isRunning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingTask(task);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[var(--panel-border)] bg-[color-mix(in_srgb,var(--surface-subtle)_92%,transparent)] px-4 py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Agent:</span>{" "}
                        <span className="font-medium">{agentName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Schedule:</span>{" "}
                        <span className="font-medium font-mono text-xs">
                          {task.cron_expression || "None (manual)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Runs:</span>{" "}
                        <span className="font-medium">{task.run_count}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Status:</span>{" "}
                        <span className="font-medium">{task.last_status ?? "N/A"}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground">Prompt:</span>
                      <pre className="mt-2 rounded-[var(--workspace-radius-md)] border border-[var(--panel-border)] bg-[var(--code-surface)] p-3 text-xs whitespace-pre-wrap">
                        {task.prompt}
                      </pre>
                    </div>

                    {task.last_error && (
                      <div>
                        <div className="mb-2 flex items-center gap-1.5 text-xs text-[var(--status-danger)]">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span className="font-medium">Last Error</span>
                        </div>
                        <pre className="rounded-[var(--workspace-radius-md)] border border-[var(--status-danger)]/20 bg-[var(--status-danger)]/5 p-3 text-xs whitespace-pre-wrap text-[var(--status-danger)]">
                          {task.last_error}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <AlertDialog open={!!deletingTask} onOpenChange={(open) => { if (!open) setDeletingTask(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingTask?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deletingTask) {
                  handleDelete(deletingTask.id);
                  setDeletingTask(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}

function CreateTaskDialog({
  agents,
  onCreated,
}: {
  agents: AgentWithStatus[];
  onCreated: (task: ScheduledTask & { agent_name?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [agentId, setAgentId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [cronExpression, setCronExpression] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Task name is required");
      return;
    }
    if (!agentId) {
      toast.error("Please select an agent");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Prompt is required");
      return;
    }
    setSaving(true);
    try {
      const result = await createScheduledTask({
        name: name.trim(),
        agent_id: agentId,
        prompt: prompt.trim(),
        cron_expression: cronExpression.trim() || undefined,
      });
      const agent = agents.find((a) => a.id === agentId);
      onCreated({
        id: result.id,
        name: name.trim(),
        agent_id: agentId,
        agent_name: agent?.name,
        prompt: prompt.trim(),
        cron_expression: cronExpression.trim() || null,
        conversation_id: null,
        is_active: true,
        last_run_at: null,
        next_run_at: null,
        run_count: 0,
        last_status: null,
        last_error: null,
        created_at: new Date().toISOString(),
      });
      toast.success("Task created");
    } catch {
      toast.error("Failed to create task");
    } finally {
      setSaving(false);
    }
  }

  return (
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Scheduled Task</DialogTitle>
        </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input
            placeholder="e.g. Daily status report"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <Label>Agent</Label>
          <Select value={agentId} onValueChange={(v) => v && setAgentId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select an agent..." />
            </SelectTrigger>
            <SelectContent>
              {agents
                .filter((a) => a.is_active)
                .map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Prompt</Label>
          <Textarea
            placeholder="Instructions for the agent to execute on each run..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
          />
        </div>

        <Separator />

        <div>
          <Label>Cron Expression</Label>
          <Input
            placeholder="e.g. 0 9 * * *"
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            className="font-mono"
          />
          <div className="mt-3 rounded-[var(--workspace-radius-md)] border border-[var(--panel-border)] bg-[var(--surface-subtle)] p-3 space-y-1">
            <p className="text-[var(--text-label)] text-muted-foreground font-medium">Common patterns:</p>
            <div className="grid grid-cols-1 gap-0.5 text-[var(--text-label)] text-muted-foreground">
              <span>
                <code className="rounded bg-background px-1 font-mono">0 9 * * *</code> — Daily at 9:00 AM
              </span>
              <span>
                <code className="rounded bg-background px-1 font-mono">*/30 * * * *</code> — Every 30 minutes
              </span>
              <span>
                <code className="rounded bg-background px-1 font-mono">0 9 * * 1-5</code> — Weekdays at 9:00 AM
              </span>
              <span>
                <code className="rounded bg-background px-1 font-mono">0 */2 * * *</code> — Every 2 hours
              </span>
              <span>
                <code className="rounded bg-background px-1 font-mono">0 0 * * 0</code> — Weekly on Sunday midnight
              </span>
            </div>
          </div>
          <p className="text-[var(--text-label)] text-muted-foreground mt-1">
            Leave empty for manual-only tasks (triggered via Run Now).
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave} disabled={saving || !name.trim() || !agentId || !prompt.trim()}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Create Task
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
