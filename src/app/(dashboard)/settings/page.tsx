"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { getSettings, updateSettings } from "@/lib/api";
import { toast } from "sonner";

interface SettingsForm {
  default_model: string;
  max_tokens: string;
  rate_limit: string;
  maintenance_mode: string;
  api_base_url: string;
}

const DEFAULTS: SettingsForm = {
  default_model: "",
  max_tokens: "",
  rate_limit: "",
  maintenance_mode: "false",
  api_base_url: "",
};

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const data = await getSettings();
      setForm({
        default_model: data.default_model ?? "",
        max_tokens: data.max_tokens ?? "",
        rate_limit: data.rate_limit ?? "",
        maintenance_mode: data.maintenance_mode ?? "false",
        api_base_url: data.api_base_url ?? "",
      });
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateSettings({ ...form });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function updateField(key: keyof SettingsForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System-wide configuration for AgentHub
        </p>
      </div>

      <div className="space-y-4">
        {/* Model & Tokens */}
        <Card>
          <CardHeader>
            <CardTitle>Model Configuration</CardTitle>
            <CardDescription>Default model and token limits for agent conversations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Default Model</label>
              <input
                type="text"
                value={form.default_model}
                onChange={(e) => updateField("default_model", e.target.value)}
                placeholder="e.g. gpt-4o, claude-sonnet-4-20250514"
                className="w-full rounded-md border border-border bg-foreground/[0.05] px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Max Tokens</label>
              <input
                type="number"
                value={form.max_tokens}
                onChange={(e) => updateField("max_tokens", e.target.value)}
                placeholder="e.g. 4096"
                className="w-full rounded-md border border-border bg-foreground/[0.05] px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">Maximum tokens per response</p>
            </div>
          </CardContent>
        </Card>

        {/* Rate Limit & API */}
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>Rate limiting and API endpoint settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rate Limit</label>
              <input
                type="number"
                value={form.rate_limit}
                onChange={(e) => updateField("rate_limit", e.target.value)}
                placeholder="e.g. 60"
                className="w-full rounded-md border border-border bg-foreground/[0.05] px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">Requests per minute</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">API Base URL</label>
              <input
                type="text"
                value={form.api_base_url}
                onChange={(e) => updateField("api_base_url", e.target.value)}
                placeholder="e.g. https://api.openai.com/v1"
                className="w-full rounded-md border border-border bg-foreground/[0.05] px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Mode */}
        <Card>
          <CardHeader>
            <CardTitle>System</CardTitle>
            <CardDescription>Operational controls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Maintenance Mode</div>
                <p className="text-xs text-muted-foreground">
                  Disable all agent responses while performing maintenance
                </p>
              </div>
              <Switch
                checked={form.maintenance_mode === "true"}
                onCheckedChange={(checked) =>
                  updateField("maintenance_mode", checked ? "true" : "false")
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
