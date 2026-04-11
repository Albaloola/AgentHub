"use client";

import { useEffect, useState } from "react";
import {
  Plus, Key, Trash2, Copy, Loader2, Shield,
  CheckCircle2, Eye, EyeOff, AlertTriangle, Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { getApiKeys, createApiKey, deleteApiKey } from "@/lib/api";
import { toast } from "sonner";

interface ApiKeyRow {
  id: string;
  name: string;
  key_preview: string;
  permissions: string;
  rate_limit_rpm: number;
  last_used_at: string | null;
  created_at: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const k = await getApiKeys();
      setKeys(k);
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("API key revoked");
    } catch {
      toast.error("Failed to revoke key");
    }
  }

  const activeCount = keys.length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage keys for external access to your agents via the REST API
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" />
            New API Key
          </DialogTrigger>
          <CreateApiKeyDialog
            onCreated={(row) => {
              setKeys((prev) => [row, ...prev]);
              setCreateOpen(false);
            }}
          />
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Key className="h-5 w-5 text-[var(--accent-blue)]" />
            <div>
              <div className="text-2xl font-bold">{keys.length}</div>
              <div className="text-xs text-muted-foreground">Total Keys</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Shield className="h-5 w-5 text-[var(--accent-emerald)]" />
            <div>
              <div className="text-2xl font-bold">{activeCount}</div>
              <div className="text-xs text-muted-foreground">Active Keys</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : keys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Key className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No API keys yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create an API key to access your agents from external applications
            </p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((apiKey) => {
            const perms = parsePermissions(apiKey.permissions);
            return (
              <Card key={apiKey.id} className="overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-blue)]/10">
                    <Key className="h-5 w-5 text-[var(--accent-blue)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{apiKey.name}</span>
                      {perms.map((p) => (
                        <Badge key={p} variant="outline" className="text-[0.625rem]">
                          {p}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      <code className="text-xs">{apiKey.key_preview}</code>
                      {" "}&middot;{" "}
                      {apiKey.rate_limit_rpm} req/min
                      {apiKey.last_used_at && (
                        <> &middot; Last used: {new Date(apiKey.last_used_at).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(apiKey.id)}
                      title="Revoke key"
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

      <Separator />

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Terminal className="h-5 w-5" />
            API Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Send Message to Agent</h4>
            <p className="text-xs text-muted-foreground mb-2">
              POST to an agent endpoint with your API key to send a message and receive a response.
            </p>
          </div>

          <div>
            <span className="text-xs text-muted-foreground">Endpoint</span>
            <code className="mt-1 block text-xs bg-muted rounded-md px-3 py-1.5 border border-border">
              POST /api/external/agents/{"{id}"}/message
            </code>
          </div>

          <div>
            <span className="text-xs text-muted-foreground">Authentication</span>
            <code className="mt-1 block text-xs bg-muted rounded-md px-3 py-1.5 border border-border">
              X-API-Key: your-api-key-here
            </code>
          </div>

          <div>
            <span className="text-xs text-muted-foreground">Example (curl)</span>
            <pre className="mt-1 text-xs bg-muted rounded-md p-3 whitespace-pre-wrap border border-border overflow-x-auto">
{`curl -X POST ${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/external/agents/AGENT_ID/message \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ah_your_key_here" \\
  -d '{"content": "Hello, agent!"}'`}
            </pre>
            <Button
              variant="outline" size="sm" className="mt-2"
              onClick={() => {
                const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
                navigator.clipboard.writeText(
                  `curl -X POST ${origin}/api/external/agents/AGENT_ID/message \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: ah_your_key_here" \\\n  -d '{"content": "Hello, agent!"}'`,
                );
                toast.success("Curl command copied");
              }}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy curl command
            </Button>
          </div>

          <div>
            <span className="text-xs text-muted-foreground">Response</span>
            <pre className="mt-1 text-xs bg-muted rounded-md p-3 whitespace-pre-wrap border border-border">
{`{
  "message_id": "msg_abc123",
  "content": "Agent response here...",
  "agent_id": "AGENT_ID",
  "token_count": 150
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function parsePermissions(perms: string): string[] {
  try {
    const parsed = JSON.parse(perms);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }
  if (perms && perms !== "null") return perms.split(",").map((s) => s.trim()).filter(Boolean);
  return ["all"];
}

function CreateApiKeyDialog({
  onCreated,
}: {
  onCreated: (row: ApiKeyRow) => void;
}) {
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    "agent:read": true,
    "agent:write": false,
    "webhook:create": false,
  });
  const [saving, setSaving] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(true);

  function togglePermission(perm: string) {
    setPermissions((prev) => ({ ...prev, [perm]: !prev[perm] }));
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Key name is required");
      return;
    }
    const selectedPerms = Object.entries(permissions)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (selectedPerms.length === 0) {
      toast.error("Select at least one permission");
      return;
    }
    setSaving(true);
    try {
      const result = await createApiKey(name.trim(), selectedPerms);
      setRawKey(result.raw_key);
      onCreated({
        id: result.id,
        name: name.trim(),
        key_preview: result.raw_key.slice(0, 8) + "..." + result.raw_key.slice(-4),
        permissions: JSON.stringify(selectedPerms),
        rate_limit_rpm: 60,
        last_used_at: null,
        created_at: new Date().toISOString(),
      });
      toast.success("API key created");
    } catch {
      toast.error("Failed to create API key");
    } finally {
      setSaving(false);
    }
  }

  function handleCopyKey() {
    if (rawKey) {
      navigator.clipboard.writeText(rawKey);
      toast.success("Key copied to clipboard");
    }
  }

  // After creation, show the raw key
  if (rawKey) {
    return (
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>API Key Created</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-[var(--status-warning)]/30 bg-[var(--status-warning)]/5 p-3">
            <AlertTriangle className="h-5 w-5 text-[var(--status-warning)] shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-[var(--status-warning)]">Save this key now</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This key will not be shown again. Copy it and store it securely.
              </p>
            </div>
          </div>

          <div>
            <Label>Your API Key</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 relative">
                <Input
                  readOnly
                  value={showKey ? rawKey : rawKey.replace(/./g, "*")}
                  className="font-mono text-xs pr-10"
                />
                <Button
                  variant="ghost" size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyKey}>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCopyKey}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Copy &amp; Close
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create API Key</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Name</Label>
          <Input
            placeholder="e.g. Production Backend"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <Label className="mb-2 block">Permissions</Label>
          <div className="space-y-2">
            {Object.entries(permissions).map(([perm, enabled]) => (
              <div
                key={perm}
                className="flex items-center justify-between rounded-md border border-border p-2 cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => togglePermission(perm)}
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-mono">{perm}</span>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={() => togglePermission(perm)}
                />
              </div>
            ))}
          </div>
          <p className="text-[0.625rem] text-muted-foreground mt-1">
            agent:read - list and query agents &middot; agent:write - send messages &middot; webhook:create - manage webhooks
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Create Key
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
