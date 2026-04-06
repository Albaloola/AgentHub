"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Play, Loader2, Plus, Trash2, Check, Copy,
  FlaskConical, GitCompare, RotateCcw, Sparkles,
  FileText, Rocket, Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import {
  getPromptVersions, createPromptVersion, activatePromptVersion, deletePromptVersion,
  getAgents, streamChat, createConversation,
} from "@/lib/api";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import type { PromptVersion, AgentWithStatus, BehaviorMode } from "@/lib/types";
import { BEHAVIOR_MODES } from "@/lib/types";
import { toast } from "sonner";

const ENV_COLORS: Record<string, string> = {
  dev: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  staging: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  production: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
};

const ENV_ICONS: Record<string, typeof Code2> = {
  dev: Code2,
  staging: Rocket,
  production: Sparkles,
};

export default function PlaygroundPage() {
  const { agents, setAgents } = useStore();
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);

  // Playground state
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedVersionId, setSelectedVersionId] = useState<string>("custom");
  const [behaviorMode, setBehaviorMode] = useState<BehaviorMode>("default");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [testInput, setTestInput] = useState("");
  const [response, setResponse] = useState("");
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Version management
  const [createVersionOpen, setCreateVersionOpen] = useState(false);
  const [diffMode, setDiffMode] = useState(false);
  const [diffVersionA, setDiffVersionA] = useState<string>("");
  const [diffVersionB, setDiffVersionB] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [a, v] = await Promise.all([getAgents(), getPromptVersions()]);
      setAgents(a);
      setVersions(v);
      if (a.length > 0 && !selectedAgentId) {
        setSelectedAgentId(a[0].id);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  // When agent changes, load its versions
  useEffect(() => {
    if (selectedAgentId) {
      getPromptVersions(selectedAgentId)
        .then((v) => setVersions(v))
        .catch(() => {});
    }
  }, [selectedAgentId]);

  // When version selection changes, update system prompt
  useEffect(() => {
    if (selectedVersionId !== "custom") {
      const version = versions.find((v) => v.id === selectedVersionId);
      if (version) {
        setSystemPrompt(version.content);
      }
    }
  }, [selectedVersionId, versions]);

  const agentVersions = useMemo(
    () => versions.filter((v) => v.agent_id === selectedAgentId),
    [versions, selectedAgentId],
  );

  const activeVersions = useMemo(
    () => versions.filter((v) => v.is_active),
    [versions],
  );

  async function handleRun() {
    if (!selectedAgentId) {
      toast.error("Select an agent first");
      return;
    }
    if (!testInput.trim()) {
      toast.error("Enter a test message");
      return;
    }

    setRunning(true);
    setResponse("");
    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      // Create a temporary conversation for this test
      const { id: convId } = await createConversation({
        agent_id: selectedAgentId,
        name: `Playground test ${new Date().toLocaleTimeString()}`,
        type: "single",
      });

      streamChat(convId, testInput, {
        onContent: (content) => {
          setResponse((prev) => prev + content);
        },
        onToolCall: () => {},
        onToolResult: () => {},
        onError: (error) => {
          toast.error(`Error: ${error}`);
          setRunning(false);
        },
        onDone: () => {
          setRunning(false);
        },
      }, { signal: abortController.signal });
    } catch {
      toast.error("Failed to start test run");
      setRunning(false);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setRunning(false);
  }

  async function handleActivateVersion(id: string) {
    try {
      await activatePromptVersion(id);
      setVersions((prev) =>
        prev.map((v) =>
          v.agent_id === (prev.find((p) => p.id === id)?.agent_id)
            ? { ...v, is_active: v.id === id }
            : v,
        ),
      );
      toast.success("Version activated");
    } catch {
      toast.error("Failed to activate version");
    }
  }

  async function handleDeleteVersion(id: string) {
    try {
      await deletePromptVersion(id);
      setVersions((prev) => prev.filter((v) => v.id !== id));
      if (selectedVersionId === id) {
        setSelectedVersionId("custom");
      }
      toast.success("Version deleted");
    } catch {
      toast.error("Failed to delete version");
    }
  }

  // Diff computation
  const diffResult = useMemo(() => {
    if (!diffVersionA || !diffVersionB) return null;
    const vA = versions.find((v) => v.id === diffVersionA);
    const vB = versions.find((v) => v.id === diffVersionB);
    if (!vA || !vB) return null;

    const linesA = vA.content.split("\n");
    const linesB = vB.content.split("\n");
    const maxLen = Math.max(linesA.length, linesB.length);
    const lines: { lineA: string; lineB: string; status: "same" | "changed" | "added" | "removed" }[] = [];

    for (let i = 0; i < maxLen; i++) {
      const a = i < linesA.length ? linesA[i] : undefined;
      const b = i < linesB.length ? linesB[i] : undefined;
      if (a === b) {
        lines.push({ lineA: a ?? "", lineB: b ?? "", status: "same" });
      } else if (a !== undefined && b !== undefined) {
        lines.push({ lineA: a, lineB: b, status: "changed" });
      } else if (a === undefined) {
        lines.push({ lineA: "", lineB: b ?? "", status: "added" });
      } else {
        lines.push({ lineA: a ?? "", lineB: "", status: "removed" });
      }
    }
    return { vA, vB, lines };
  }, [diffVersionA, diffVersionB, versions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">Playground</h1>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Test prompts, manage versions, and experiment with agent behavior
        </p>
      </div>

      {/* Top Bar: Selectors */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-52">
          <Label className="text-xs">Agent</Label>
          <Select value={selectedAgentId} onValueChange={(v) => v && setSelectedAgentId(v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select agent..." />
            </SelectTrigger>
            <SelectContent>
              {agents.filter((a) => a.is_active).map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-medium text-white",
                        getAvatarColor(agent.id),
                      )}
                    >
                      {getInitials(agent.name)}
                    </div>
                    {agent.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Label className="text-xs">Prompt Version</Label>
          <Select value={selectedVersionId} onValueChange={(v) => v && setSelectedVersionId(v)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom</SelectItem>
              {agentVersions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  v{v.version} ({v.environment})
                  {v.is_active ? " *" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-44">
          <Label className="text-xs">Behavior Mode</Label>
          <Select value={behaviorMode} onValueChange={(v) => v && setBehaviorMode(v as BehaviorMode)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BEHAVIOR_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Split Pane: Prompt Editor + Response Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Pane: Prompt Editor */}
        <div className="space-y-3">
          <Card className="transition-all duration-300 hover:shadow-[0_0_20px_oklch(0.55_0.24_264/0.06)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">System Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter system prompt..."
                value={systemPrompt}
                onChange={(e) => {
                  setSystemPrompt(e.target.value);
                  setSelectedVersionId("custom");
                }}
                rows={10}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-[0_0_20px_oklch(0.55_0.24_264/0.06)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Test Input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Enter a test message to send to the agent..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                {running ? (
                  <Button variant="destructive" size="sm" onClick={handleStop} className="transition-all duration-200">
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleRun} disabled={!selectedAgentId || !testInput.trim()} className="transition-all duration-200 hover:shadow-[0_0_16px_oklch(0.55_0.24_264/0.2)]">
                    <Play className="h-4 w-4 mr-1" />
                    Run
                  </Button>
                )}
                <Button
                  variant="outline" size="sm"
                  onClick={() => { setResponse(""); setTestInput(""); }}
                  className="transition-all duration-200"
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Pane: Response Viewer */}
        <Card className="flex flex-col transition-all duration-300 hover:shadow-[0_0_20px_oklch(0.55_0.24_264/0.06)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              Response
              {running && <Loader2 className="h-3 w-3 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            {response ? (
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeStr = String(children).replace(/\n$/, "");
                      if (match) {
                        return (
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-md text-xs"
                          >
                            {codeStr}
                          </SyntaxHighlighter>
                        );
                      }
                      return (
                        <code className={cn("bg-muted px-1 py-0.5 rounded text-xs", className)} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {response}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60">
                <FlaskConical className="h-10 w-10 mb-3 animate-[float-gentle_4s_ease-in-out_infinite]" />
                <p className="text-sm">
                  {running ? "Waiting for response..." : "Run a test to see the response here"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Prompt Version Management */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Prompt Versions</h2>
            <p className="text-xs text-muted-foreground">
              {agentVersions.length} versions, {agentVersions.filter((v) => v.is_active).length} active
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={diffMode ? "default" : "outline"}
              size="sm"
              onClick={() => setDiffMode(!diffMode)}
            >
              <GitCompare className="h-4 w-4 mr-1" />
              Diff
            </Button>
            <Dialog open={createVersionOpen} onOpenChange={setCreateVersionOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <Plus className="h-4 w-4 mr-1" />
                Save Version
              </DialogTrigger>
              <CreateVersionDialog
                agentId={selectedAgentId}
                content={systemPrompt}
                onCreated={(v) => {
                  setVersions((prev) => [v, ...prev]);
                  setCreateVersionOpen(false);
                }}
              />
            </Dialog>
          </div>
        </div>

        {/* Diff Mode */}
        {diffMode && (
          <Card className="mb-4">
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-xs">Version A</Label>
                  <Select value={diffVersionA} onValueChange={(v) => v && setDiffVersionA(v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select version..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agentVersions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          v{v.version} ({v.environment})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Version B</Label>
                  <Select value={diffVersionB} onValueChange={(v) => v && setDiffVersionB(v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select version..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agentVersions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          v{v.version} ({v.environment})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {diffResult && (
                <div className="rounded-md border border-border overflow-auto max-h-64">
                  <table className="w-full text-[11px] font-mono">
                    <tbody>
                      {diffResult.lines.map((line, i) => (
                        <tr
                          key={i}
                          className={cn(
                            line.status === "same" && "",
                            line.status === "changed" && "bg-yellow-500/10",
                            line.status === "added" && "bg-emerald-500/10",
                            line.status === "removed" && "bg-red-500/10",
                          )}
                        >
                          <td className="px-2 py-0.5 text-muted-foreground w-8 text-right select-none border-r border-border">
                            {i + 1}
                          </td>
                          <td className="px-2 py-0.5 w-1 select-none text-center">
                            {line.status === "changed" && <span className="text-yellow-600">~</span>}
                            {line.status === "added" && <span className="text-emerald-600">+</span>}
                            {line.status === "removed" && <span className="text-red-600">-</span>}
                          </td>
                          <td className="px-2 py-0.5 whitespace-pre-wrap">
                            {line.status === "removed" ? line.lineA : line.lineB}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!diffResult && diffVersionA && diffVersionB && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Select two versions to compare
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Version list */}
        {agentVersions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No versions yet for this agent. Save the current prompt as a version.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {agentVersions
              .sort((a, b) => b.version - a.version)
              .map((version) => {
                const EnvIcon = ENV_ICONS[version.environment] || Code2;
                return (
                  <Card key={version.id} className="overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <EnvIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            v{version.version}
                          </span>
                          {version.name && (
                            <span className="text-sm text-muted-foreground">
                              {version.name}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={cn("text-[10px]", ENV_COLORS[version.environment])}
                          >
                            {version.environment}
                          </Badge>
                          {version.is_active && (
                            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">
                              active
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {version.content.slice(0, 80)}
                          {version.content.length > 80 ? "..." : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost" size="sm" className="h-7 text-xs"
                          onClick={() => {
                            setSystemPrompt(version.content);
                            setSelectedVersionId(version.id);
                          }}
                        >
                          Load
                        </Button>
                        {!version.is_active && (
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => handleActivateVersion(version.id)}
                          >
                            <Check className="h-3 w-3 mr-0.5" />
                            Activate
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteVersion(version.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateVersionDialog({
  agentId,
  content,
  onCreated,
}: {
  agentId: string;
  content: string;
  onCreated: (version: PromptVersion) => void;
}) {
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<string>("dev");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!agentId) {
      toast.error("Select an agent first");
      return;
    }
    if (!content.trim()) {
      toast.error("System prompt is empty");
      return;
    }
    setSaving(true);
    try {
      const result = await createPromptVersion({
        agent_id: agentId,
        name: name.trim() || undefined,
        content: content.trim(),
        environment,
      });
      onCreated({
        id: result.id,
        agent_id: agentId,
        name: name.trim(),
        version: 0, // Will be set by server
        content: content.trim(),
        variables: "[]",
        model_params: "{}",
        is_active: false,
        environment: environment as PromptVersion["environment"],
        created_at: new Date().toISOString(),
      });
      toast.success("Version saved");
    } catch {
      toast.error("Failed to save version");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Save Prompt Version</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Version Name</Label>
          <Input
            placeholder="Optional label (e.g. improved-tone)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <Label>Environment</Label>
          <Select value={environment} onValueChange={(v) => v && setEnvironment(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dev">Development</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Content Preview</Label>
          <pre className="mt-1 text-[11px] bg-muted rounded-md p-3 whitespace-pre-wrap border border-border max-h-32 overflow-auto">
            {content.slice(0, 300)}{content.length > 300 ? "..." : ""}
          </pre>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave} disabled={saving || !content.trim() || !agentId}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Save Version
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
