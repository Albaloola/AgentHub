"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Plus, Trash2, Play, Pause, Save, Loader2, GitBranch, Bot, Clock,
  ArrowRight, Zap, Filter, FileOutput, X, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { getWorkflows, createWorkflow, updateWorkflow, deleteWorkflow, getAgents } from "@/lib/api";
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
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import type { Workflow, WorkflowNode, WorkflowEdge, AgentWithStatus } from "@/lib/types";
import { toast } from "sonner";

type ViewMode = "list" | "canvas";

export default function WorkflowsPage() {
  const agents = useStore((s) => s.agents);
  const setAgents = useStore((s) => s.setAgents);
  const [workflows, setWorkflowsState] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingWorkflow, setDeletingWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [w, a] = await Promise.all([getWorkflows(), getAgents()]);
      setWorkflowsState(w as Workflow[]);
      setAgents(a);
    } catch {
      toast.error("Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteWorkflow(id);
      setWorkflowsState((prev) => prev.filter((w) => w.id !== id));
      if (activeWorkflow?.id === id) setActiveWorkflow(null);
      toast.success("Workflow deleted");
    } catch {
      toast.error("Failed to delete workflow");
    }
  }

  async function handleToggleActive(wf: Workflow) {
    try {
      await updateWorkflow(wf.id, { is_active: !wf.is_active });
      setWorkflowsState((prev) =>
        prev.map((w) => (w.id === wf.id ? { ...w, is_active: !w.is_active } : w)),
      );
      toast.success(wf.is_active ? "Workflow paused" : "Workflow activated");
    } catch {
      toast.error("Failed to update workflow");
    }
  }

  function openCanvas(wf: Workflow) {
    setActiveWorkflow(wf);
    setViewMode("canvas");
  }

  if (viewMode === "canvas" && activeWorkflow) {
    return (
      <WorkflowCanvas
        workflow={activeWorkflow}
        agents={agents}
        onBack={() => { setViewMode("list"); setActiveWorkflow(null); }}
        onSave={async (nodes, edges) => {
          await updateWorkflow(activeWorkflow.id, { nodes, edges });
          setWorkflowsState((prev) =>
            prev.map((w) =>
              w.id === activeWorkflow.id
                ? { ...w, nodes: JSON.stringify(nodes), edges: JSON.stringify(edges) }
                : w,
            ),
          );
          toast.success("Workflow saved");
        }}
      />
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build agent pipelines with visual node graphs
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" />
            New Workflow
          </DialogTrigger>
          <CreateWorkflowDialog
            onCreated={(wf) => {
              setWorkflowsState((prev) => [wf, ...prev]);
              setCreateOpen(false);
            }}
          />
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <GitBranch className="h-5 w-5 text-[var(--accent-blue)]" />
            <div>
              <div className="text-2xl font-bold">{workflows.length}</div>
              <div className="text-xs text-muted-foreground">Workflows</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Zap className="h-5 w-5 text-[var(--accent-emerald)]" />
            <div>
              <div className="text-2xl font-bold">
                {workflows.filter((w) => w.is_active).length}
              </div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Bot className="h-5 w-5 text-[var(--accent-violet)]" />
            <div>
              <div className="text-2xl font-bold">
                {workflows.reduce((sum, w) => {
                  try {
                    const nodes = JSON.parse(w.nodes) as WorkflowNode[];
                    return sum + nodes.filter((n) => n.type === "agent").length;
                  } catch { return sum; }
                }, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Agent Nodes</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GitBranch className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No workflows yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create agent pipelines to automate multi-step processes
            </p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => {
            let nodeCount = 0;
            let edgeCount = 0;
            try {
              nodeCount = (JSON.parse(wf.nodes) as WorkflowNode[]).length;
              edgeCount = (JSON.parse(wf.edges) as WorkflowEdge[]).length;
            } catch { /* empty */ }

            return (
              <Card key={wf.id} className="overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    wf.is_active ? "bg-[var(--status-online)]/10" : "bg-muted",
                  )}>
                    <GitBranch className={cn("h-5 w-5", wf.is_active ? "text-[var(--status-online)]" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{wf.name}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[0.625rem]",
                          wf.is_active ? "border-[var(--status-online)]/30 text-[var(--status-online)]" : "",
                        )}
                      >
                        {wf.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {wf.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {wf.description}
                      </p>
                    )}
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{nodeCount} nodes</span>
                      <span>{edgeCount} edges</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => openCanvas(wf)}
                      title="Edit workflow"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => handleToggleActive(wf)}
                      title={wf.is_active ? "Pause" : "Activate"}
                    >
                      {wf.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingWorkflow(wf)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deletingWorkflow} onOpenChange={(open) => { if (!open) setDeletingWorkflow(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingWorkflow?.name}&quot;? This will permanently remove the workflow and all its nodes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deletingWorkflow) {
                  handleDelete(deletingWorkflow.id);
                  setDeletingWorkflow(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// === Create Workflow Dialog ===

function CreateWorkflowDialog({ onCreated }: { onCreated: (wf: Workflow) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const result = await createWorkflow({ name: name.trim(), description: description.trim() || undefined });
      onCreated({
        id: result.id,
        name: name.trim(),
        description: description.trim() || null,
        nodes: "[]",
        edges: "[]",
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      toast.success("Workflow created");
    } catch {
      toast.error("Failed to create workflow");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Workflow</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input placeholder="e.g. Research Pipeline" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea placeholder="What does this workflow do?" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Create
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// === Visual Workflow Canvas ===

const NODE_W = 180;
const NODE_H = 72;
const NODE_TYPES: { value: WorkflowNode["type"]; label: string; icon: typeof Bot }[] = [
  { value: "agent", label: "Agent", icon: Bot },
  { value: "condition", label: "Condition", icon: Filter },
  { value: "delay", label: "Delay", icon: Clock },
  { value: "output", label: "Output", icon: FileOutput },
];

function WorkflowCanvas({
  workflow,
  agents,
  onBack,
  onSave,
}: {
  workflow: Workflow;
  agents: AgentWithStatus[];
  onBack: () => void;
  onSave: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => Promise<void>;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>(() => {
    try { return JSON.parse(workflow.nodes); }
    catch { return []; }
  });
  const [edges, setEdges] = useState<WorkflowEdge[]>(() => {
    try { return JSON.parse(workflow.edges); }
    catch { return []; }
  });
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  function addNode(type: WorkflowNode["type"]) {
    const id = `node_${Date.now()}`;
    const newNode: WorkflowNode = {
      id,
      type,
      label: type === "agent" ? "Agent" : type === "condition" ? "If/Else" : type === "delay" ? "Wait" : "Output",
      position: { x: 100 + nodes.length * 40, y: 100 + nodes.length * 40 },
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(id);
    setAddMenuOpen(false);
  }

  function deleteNode(id: string) {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    if (selectedNode === id) setSelectedNode(null);
  }

  function deleteEdge(id: string) {
    setEdges((prev) => prev.filter((e) => e.id !== id));
  }

  const handleMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDragging({
      id: nodeId,
      offsetX: e.clientX - rect.left - node.position.x,
      offsetY: e.clientY - rect.top - node.position.y,
    });
    setSelectedNode(nodeId);
  }, [nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - dragging.offsetX);
    const y = Math.max(0, e.clientY - rect.top - dragging.offsetY);
    setNodes((prev) =>
      prev.map((n) => (n.id === dragging.id ? { ...n, position: { x, y } } : n)),
    );
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  function startConnect(nodeId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (connecting) {
      if (connecting !== nodeId) {
        const exists = edges.some((e) => e.source === connecting && e.target === nodeId);
        if (!exists) {
          setEdges((prev) => [...prev, { id: `edge_${Date.now()}`, source: connecting, target: nodeId }]);
        }
      }
      setConnecting(null);
    } else {
      setConnecting(nodeId);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(nodes, edges);
    } finally {
      setSaving(false);
    }
  }

  const selectedNodeData = nodes.find((n) => n.id === selectedNode);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowRight className="h-4 w-4 mr-1 rotate-180" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h2 className="font-medium">{workflow.name}</h2>
          <Badge variant="outline" className="text-[0.625rem]">
            {nodes.length} nodes
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              variant="outline" size="sm"
              onClick={() => setAddMenuOpen(!addMenuOpen)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Node
            </Button>
            {addMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-md border border-border bg-card shadow-lg py-1">
                {NODE_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onClick={() => addNode(value)}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative bg-[radial-gradient(circle,hsl(var(--border))_1px,transparent_1px)] bg-[size:24px_24px] overflow-auto cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={() => { setSelectedNode(null); setConnecting(null); setAddMenuOpen(false); }}
        >
          {/* Connection hint */}
          {connecting && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-[var(--accent-blue)] text-white text-xs px-3 py-1 rounded-full">
              Click a target node to connect
            </div>
          )}

          {/* Edges SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 2000, minHeight: 1200 }}>
            {edges.map((edge) => {
              const source = nodes.find((n) => n.id === edge.source);
              const target = nodes.find((n) => n.id === edge.target);
              if (!source || !target) return null;
              const sx = source.position.x + NODE_W;
              const sy = source.position.y + NODE_H / 2;
              const tx = target.position.x;
              const ty = target.position.y + NODE_H / 2;
              const cx = (sx + tx) / 2;
              return (
                <g key={edge.id} className="pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); deleteEdge(edge.id); }}>
                  <path
                    d={`M ${sx} ${sy} C ${cx} ${sy}, ${cx} ${ty}, ${tx} ${ty}`}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth={2}
                    className="hover:stroke-destructive transition-colors"
                  />
                  <circle cx={tx} cy={ty} r={4} fill="hsl(var(--border))" className="hover:fill-destructive transition-colors" />
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => {
            const NodeIcon = NODE_TYPES.find((t) => t.value === node.type)?.icon ?? Bot;
            const isSelected = selectedNode === node.id;
            const isConnecting = connecting === node.id;
            const agent = node.agent_id ? agents.find((a) => a.id === node.agent_id) : null;

            return (
              <div
                key={node.id}
                className={cn(
                  "absolute rounded-lg border-2 bg-card shadow-sm transition-shadow select-none",
                  isSelected ? "border-primary shadow-md" : "border-border",
                  isConnecting ? "border-[var(--accent-blue)] ring-2 ring-[var(--accent-blue)]/20" : "",
                  dragging?.id === node.id ? "cursor-grabbing" : "cursor-grab",
                )}
                style={{
                  left: node.position.x,
                  top: node.position.y,
                  width: NODE_W,
                  height: NODE_H,
                }}
                onMouseDown={(e) => handleMouseDown(node.id, e)}
                onClick={(e) => { e.stopPropagation(); setSelectedNode(node.id); }}
              >
                <div className="flex items-center gap-2 px-3 py-2 h-full">
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                    node.type === "agent" ? "bg-[var(--accent-blue)]/10" :
                    node.type === "condition" ? "bg-[var(--accent-amber)]/10" :
                    node.type === "delay" ? "bg-[var(--accent-violet)]/10" : "bg-[var(--accent-emerald)]/10",
                  )}>
                    {agent ? (
                      <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[0.5625rem] font-medium text-white", getAvatarColor(agent.id))}>
                        {getInitials(agent.name)}
                      </div>
                    ) : (
                      <NodeIcon className={cn("h-4 w-4",
                        node.type === "agent" ? "text-[var(--accent-blue)]" :
                        node.type === "condition" ? "text-[var(--accent-amber)]" :
                        node.type === "delay" ? "text-[var(--accent-violet)]" : "text-[var(--accent-emerald)]",
                      )} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{node.label}</div>
                    <div className="text-[0.625rem] text-muted-foreground capitalize">{node.type}</div>
                  </div>
                </div>

                {/* Connection ports */}
                <button
                  className="absolute -right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-border bg-card hover:bg-primary hover:border-primary transition-colors"
                  onClick={(e) => startConnect(node.id, e)}
                  title="Connect"
                />
                <button
                  className="absolute -left-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-border bg-card hover:bg-primary hover:border-primary transition-colors"
                  onClick={(e) => startConnect(node.id, e)}
                  title="Connect"
                />
              </div>
            );
          })}

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Empty canvas</p>
                <p className="text-xs mt-1">Click &quot;Add Node&quot; to start building your workflow</p>
              </div>
            </div>
          )}
        </div>

        {/* Properties Panel */}
        {selectedNodeData && (
          <div className="w-64 border-l border-border bg-card p-4 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Node Properties</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedNode(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div>
              <Label className="text-xs">Label</Label>
              <Input
                value={selectedNodeData.label}
                onChange={(e) =>
                  setNodes((prev) =>
                    prev.map((n) => (n.id === selectedNode ? { ...n, label: e.target.value } : n)),
                  )
                }
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Type</Label>
              <div className="text-sm text-muted-foreground capitalize mt-1">{selectedNodeData.type}</div>
            </div>

            {selectedNodeData.type === "agent" && (
              <div>
                <Label className="text-xs">Agent</Label>
                <Select
                  value={selectedNodeData.agent_id || ""}
                  onValueChange={(v) =>
                    setNodes((prev) =>
                      prev.map((n) => {
                        if (n.id !== selectedNode) return n;
                        const agent = agents.find((a) => a.id === v);
                        return { ...n, agent_id: v || undefined, label: agent?.name || n.label };
                      }),
                    )
                  }
                  items={Object.fromEntries(agents.filter((a) => a.is_active).map((a) => [a.id, a.name]))}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select agent" /></SelectTrigger>
                  <SelectContent>
                    {agents.filter((a) => a.is_active).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                Connections: {edges.filter((e) => e.source === selectedNode || e.target === selectedNode).length}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => deleteNode(selectedNodeData.id)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete Node
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
