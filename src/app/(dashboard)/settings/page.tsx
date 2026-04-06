"use client";

import { useEffect, useState } from "react";
import { Save, Download, Trash2, Upload, Palette } from "lucide-react";
import { ThemeCustomizer } from "@/components/theme/theme-customizer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { getAgents } from "@/lib/api";
import { toast } from "sonner";

export default function SettingsPage() {
  const { agents, setAgents, conversations } = useStore();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings(data);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  }

  function updateSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function exportAgentConfigs() {
    try {
      const data = await getAgents();
      const exportData = data.map((a) => ({
        name: a.name,
        gateway_type: a.gateway_type,
        connection_url: a.connection_url,
        connection_config: a.connection_config,
        avatar_url: a.avatar_url,
      }));
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "agenthub-agents.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Agent configurations exported");
    } catch {
      toast.error("Failed to export");
    }
  }

  async function importAgentConfigs(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const configs = JSON.parse(text) as {
        name: string;
        gateway_type: string;
        connection_url: string;
        connection_config?: string;
        avatar_url?: string;
      }[];

      for (const config of configs) {
        await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
      }

      const updated = await getAgents();
      setAgents(updated);
      toast.success(`Imported ${configs.length} agent(s)`);
    } catch {
      toast.error("Failed to import — check file format");
    }

    e.target.value = "";
  }

  async function exportConversations() {
    try {
      const allData = [];
      for (const conv of conversations) {
        const res = await fetch(`/api/messages?conversation_id=${conv.id}`);
        const messages = await res.json();
        allData.push({ conversation: conv, messages });
      }
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "agenthub-conversations.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Conversations exported");
    } catch {
      toast.error("Failed to export conversations");
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage connection configurations and data
        </p>
      </div>

      {/* Default Connection Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default Connection Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Timeout (ms)</Label>
            <Input
              type="number"
              value={settings.default_timeout ?? "5000"}
              onChange={(e) => updateSetting("default_timeout", e.target.value)}
              placeholder="5000"
            />
          </div>
          <div className="space-y-2">
            <Label>Default Retry Attempts</Label>
            <Input
              type="number"
              value={settings.default_retries ?? "3"}
              onChange={(e) => updateSetting("default_retries", e.target.value)}
              placeholder="3"
            />
          </div>
          <Button onClick={saveSettings}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={exportAgentConfigs}>
              <Download className="h-4 w-4 mr-2" />
              Export Agent Configs
            </Button>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-transparent px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
              <Upload className="h-4 w-4" />
              Import Agent Configs
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={importAgentConfigs}
              />
            </label>
          </div>

          <Separator />

          <Button variant="outline" onClick={exportConversations}>
            <Download className="h-4 w-4 mr-2" />
            Export Conversation History
          </Button>
        </CardContent>
      </Card>

      {/* Theme Customization */}
      <ThemeCustomizer />

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p><strong>AgentHub</strong> v0.1.0</p>
          <p>
            A multi-agent dashboard for connecting to, chatting with, and orchestrating
            autonomous AI agents through their independent gateways.
          </p>
          <p className="text-xs">
            AgentHub is a pure presentation and routing layer. It does not run models,
            manage API keys, or handle inference directly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
