"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, X as XIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Agent, GatewayType } from "@/lib/types";
import { getAdapters } from "@/lib/api";
import type { AdapterMeta } from "@/lib/api";

interface AgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: Agent;
  onSave: (data: {
    name: string;
    gateway_type: GatewayType;
    connection_url: string;
    connection_config: string;
    avatar_url: string;
  }) => void;
}

export function AgentDialog({ open, onOpenChange, agent, onSave }: AgentDialogProps) {
  const [name, setName] = useState("");
  const [gatewayType, setGatewayType] = useState<string>("hermes");
  const [connectionUrl, setConnectionUrl] = useState("");
  const [configValues, setConfigValues] = useState<Record<string, string | number | boolean>>({});
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [adapters, setAdapters] = useState<AdapterMeta[]>([]);

  useEffect(() => {
    getAdapters().then(setAdapters).catch(() => {});
  }, []);

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setGatewayType(agent.gateway_type);
      setConnectionUrl(agent.connection_url);
      setAvatarUrl(agent.avatar_url ?? "");
      try {
        setConfigValues(JSON.parse(agent.connection_config));
      } catch {
        setConfigValues({});
      }
    } else {
      setName("");
      setGatewayType("hermes");
      setConnectionUrl("");
      setConfigValues({});
      setAvatarUrl("");
    }
  }, [agent, open]);

  // When gateway type changes, set default URL and pre-fill defaults
  useEffect(() => {
    const meta = adapters.find((a) => a.type === gatewayType);
    if (meta && !agent) {
      setConnectionUrl(meta.defaultUrl);
      const defaults: Record<string, string | number | boolean> = {};
      for (const field of meta.configFields) {
        if (field.default !== undefined) {
          defaults[field.key] = field.default;
        }
      }
      setConfigValues(defaults);
    }
  }, [gatewayType, adapters, agent]);

  function handleSave() {
    if (!name.trim() || !connectionUrl.trim()) return;
    // Build connection_config from individual fields
    const cleanConfig: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(configValues)) {
      if (value !== "" && value !== undefined) {
        cleanConfig[key] = value;
      }
    }
    onSave({
      name,
      gateway_type: gatewayType,
      connection_url: connectionUrl,
      connection_config: JSON.stringify(cleanConfig),
      avatar_url: avatarUrl,
    });
    onOpenChange(false);
  }

  function updateConfigValue(key: string, value: string | number | boolean) {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  }

  const currentMeta = adapters.find((a) => a.type === gatewayType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{agent ? "Edit Agent" : "Register Agent"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Agent"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gateway_type">Gateway Type</Label>
            <Select value={gatewayType} onValueChange={(v) => { if (v) setGatewayType(v); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {adapters.map((a) => (
                  <SelectItem key={a.type} value={a.type}>
                    {a.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentMeta && (
              <p className="text-[11px] text-muted-foreground">{currentMeta.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="connection_url">Connection URL</Label>
            <Input
              id="connection_url"
              value={connectionUrl}
              onChange={(e) => setConnectionUrl(e.target.value)}
              placeholder={currentMeta?.defaultUrl ?? "http://localhost:8080"}
            />
          </div>

          {/* Dynamic config fields from adapter metadata */}
          {currentMeta && currentMeta.configFields.length > 0 && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <div className="text-xs font-medium text-muted-foreground uppercase">
                {currentMeta.displayName} Configuration
              </div>
              {currentMeta.configFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={`config-${field.key}`} className="text-xs">
                    {field.label}
                    {field.required && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  {field.type === "boolean" ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`config-${field.key}`}
                        checked={Boolean(configValues[field.key] ?? field.default ?? false)}
                        onCheckedChange={(checked) => updateConfigValue(field.key, checked)}
                      />
                      {field.description && (
                        <span className="text-[10px] text-muted-foreground">{field.description}</span>
                      )}
                    </div>
                  ) : field.type === "password" ? (
                    <Input
                      id={`config-${field.key}`}
                      type="password"
                      value={String(configValues[field.key] ?? "")}
                      onChange={(e) => updateConfigValue(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="text-xs"
                    />
                  ) : field.type === "number" ? (
                    <Input
                      id={`config-${field.key}`}
                      type="number"
                      value={String(configValues[field.key] ?? field.default ?? "")}
                      onChange={(e) => updateConfigValue(field.key, Number(e.target.value))}
                      placeholder={field.placeholder}
                      className="text-xs"
                    />
                  ) : (
                    <Input
                      id={`config-${field.key}`}
                      value={String(configValues[field.key] ?? "")}
                      onChange={(e) => updateConfigValue(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="text-xs"
                    />
                  )}
                  {field.description && field.type !== "boolean" && (
                    <p className="text-[10px] text-muted-foreground">{field.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>
              Avatar <span className="text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex items-center gap-3">
              {/* Preview */}
              {avatarUrl ? (
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-12 w-12 rounded-xl object-cover border border-white/[0.1]"
                  />
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-12 w-12 rounded-xl border border-dashed border-white/[0.15] flex items-center justify-center text-muted-foreground/40">
                  <Upload className="h-5 w-5" />
                </div>
              )}
              {/* Upload button */}
              <div className="flex-1">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAvatarUploading(true);
                    try {
                      const formData = new FormData();
                      formData.append("file", file);
                      const res = await fetch("/api/upload", { method: "POST", body: formData });
                      if (!res.ok) throw new Error("Upload failed");
                      const data = await res.json();
                      setAvatarUrl(`/api/uploads/${data.file_name}`);
                    } catch {
                      // fallback: try as data URL
                      const reader = new FileReader();
                      reader.onload = () => setAvatarUrl(reader.result as string);
                      reader.readAsDataURL(file);
                    } finally {
                      setAvatarUploading(false);
                      e.target.value = "";
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {avatarUploading ? "Uploading..." : "Choose Image"}
                </Button>
                <p className="text-xs text-muted-foreground/50 mt-1">PNG, JPG, GIF, WebP, SVG</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || !connectionUrl.trim()}>
            {agent ? "Save Changes" : "Register Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
