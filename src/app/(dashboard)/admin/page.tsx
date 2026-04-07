"use client";

import { useEffect, useState } from "react";
import {
  Plus, Trash2, Loader2, Users, ScrollText, Settings2,
  Shield, Download, Upload, Database, Bot,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  getUsers, createUser, deleteUser, getAuditLog, getAgents,
} from "@/lib/api";
import type { UserAccount, AuditLogEntry } from "@/lib/types";
import { toast } from "sonner";

function roleBadgeClass(role: string) {
  switch (role) {
    case "admin": return "bg-red-500/10 text-red-600 border-red-500/30";
    case "operator": return "bg-blue-500/10 text-blue-600 border-blue-500/30";
    case "viewer": return "bg-gray-500/10 text-gray-500 border-gray-500/30";
    default: return "";
  }
}

function actionBadgeClass(action: string) {
  if (action.startsWith("delete") || action.startsWith("remove")) {
    return "bg-red-500/10 text-red-600 border-red-500/30";
  }
  if (action.startsWith("create") || action.startsWith("add")) {
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
  }
  if (action.startsWith("update") || action.startsWith("edit")) {
    return "bg-blue-500/10 text-blue-600 border-blue-500/30";
  }
  return "bg-gray-500/10 text-gray-500 border-gray-500/30";
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [agentCount, setAgentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createUserOpen, setCreateUserOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [u, a, agents] = await Promise.all([
        getUsers(),
        getAuditLog(100),
        getAgents(),
      ]);
      setUsers(u);
      setAuditLog(a);
      setAgentCount(agents.length);
    } catch {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser(id: string) {
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success("User deleted");
    } catch {
      toast.error("Failed to delete user");
    }
  }

  function handleExportConfig() {
    const config = {
      exported_at: new Date().toISOString(),
      users: users.map(({ id, display_name, email, role }) => ({ id, display_name, email, role })),
      agent_count: agentCount,
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agenthub-config-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Config exported");
  }

  // Rough estimates for stats
  const totalMessages = auditLog.filter((e) => e.resource_type === "message").length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage users, view audit logs, and configure system settings
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-1.5" />
              Users
            </TabsTrigger>
            <TabsTrigger value="audit">
              <ScrollText className="h-4 w-4 mr-1.5" />
              Audit Log
            </TabsTrigger>
            <TabsTrigger value="system">
              <Settings2 className="h-4 w-4 mr-1.5" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">User Accounts</h2>
              <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
                <DialogTrigger render={<Button size="sm" />}>
                  <Plus className="h-4 w-4 mr-1" />
                  New User
                </DialogTrigger>
                <CreateUserDialog
                  onCreated={(u) => {
                    setUsers((prev) => [u, ...prev]);
                    setCreateUserOpen(false);
                  }}
                />
              </Dialog>
            </div>

            {users.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-1">No users yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a user account to get started
                  </p>
                  <Button size="sm" onClick={() => setCreateUserOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create User
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600/10">
                        <Shield className="h-5 w-5 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.display_name}</span>
                          <Badge
                            variant="outline"
                            className={roleBadgeClass(user.role)}
                          >
                            {user.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {user.email && <span>{user.email}</span>}
                          {user.last_login_at && (
                            <span>
                              Last login: {new Date(user.last_login_at + "Z").toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">Recent Activity</h2>

            {auditLog.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <ScrollText className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-1">No audit entries yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Activity will appear here as actions are performed
                  </p>
                </CardContent>
              </Card>
            ) : (
              <AuditTable entries={auditLog} />
            )}
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">System Overview</h2>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Bot className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{agentCount}</div>
                    <div className="text-xs text-muted-foreground">Agents</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Users className="h-5 w-5 text-violet-500" />
                  <div>
                    <div className="text-2xl font-bold">{users.length}</div>
                    <div className="text-xs text-muted-foreground">Users</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <ScrollText className="h-5 w-5 text-amber-500" />
                  <div>
                    <div className="text-2xl font-bold">{auditLog.length}</div>
                    <div className="text-xs text-muted-foreground">Audit Entries</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Database className="h-5 w-5 text-emerald-500" />
                  <div>
                    <div className="text-2xl font-bold">SQLite</div>
                    <div className="text-xs text-muted-foreground">Database</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Version Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Application</span>
                  <span className="font-medium">AgentHub</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Framework</span>
                  <span className="font-medium">Next.js 16</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Database</span>
                  <span className="font-medium">SQLite (WAL)</span>
                </div>
              </CardContent>
            </Card>

            <Separator />

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleExportConfig}>
                <Download className="h-4 w-4 mr-1" />
                Export Config
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Import functionality: use the file upload API")}
              >
                <Upload className="h-4 w-4 mr-1" />
                Import Config
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function AuditTable({ entries }: { entries: AuditLogEntry[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => {
        const isExpanded = expandedId === entry.id;
        let details: Record<string, unknown> | null = null;
        try {
          details = JSON.parse(entry.details_json);
        } catch {
          // ignore parse errors
        }

        return (
          <Card key={entry.id} className="overflow-hidden">
            <div
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{entry.actor_id ?? "system"}</span>
                  <Badge
                    variant="outline"
                    className={actionBadgeClass(entry.action)}
                  >
                    {entry.action}
                  </Badge>
                  {entry.resource_type && (
                    <span className="text-muted-foreground text-xs">
                      {entry.resource_type}
                      {entry.resource_id ? ` #${entry.resource_id.slice(0, 8)}` : ""}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(entry.created_at + "Z").toLocaleString()}
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
            {isExpanded && details && (
              <div className="border-t border-border px-3 py-2 bg-muted/30">
                <pre className="text-xs whitespace-pre-wrap break-all font-mono">
                  {JSON.stringify(details, null, 2)}
                </pre>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function CreateUserDialog({
  onCreated,
}: {
  onCreated: (user: UserAccount) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }
    setSaving(true);
    try {
      const result = await createUser({
        display_name: displayName.trim(),
        email: email.trim() || undefined,
        role,
      });
      onCreated({
        id: result.id,
        display_name: displayName.trim(),
        email: email.trim() || null,
        avatar_url: null,
        role: role as UserAccount["role"],
        last_login_at: null,
        created_at: new Date().toISOString(),
      });
      toast.success("User created");
    } catch {
      toast.error("Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Create User</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Display Name</Label>
          <Input
            placeholder="John Doe"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => v && setRole(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="operator">Operator</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave} disabled={saving || !displayName.trim()}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Create User
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
