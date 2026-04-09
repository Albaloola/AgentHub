import type { Agent, AgentMessage, AgentResponseChunk, HealthCheckResponse } from "../types";
import type { GatewayAdapter, AdapterMeta } from "./base";
import { registerAdapter } from "./base";
import { spawn } from "child_process";
import { getChildProcessEnv } from "@/lib/runtime-paths";

/**
 * Hermes Adapter - connects to a local Hermes Agent installation via CLI.
 *
 * Hermes does not expose an HTTP API. Instead, this adapter invokes the
 * Hermes CLI in programmatic mode:
 *   hermes chat -q "message" --quiet --source agenthub
 *
 * Configuration via connection_config JSON:
 *   {
 *     "hermes_path": "~/.hermes/hermes-agent/venv/bin/python",
 *     "timeout_ms": 60000,
 *     "max_turns": 30
 *   }
 */

interface HermesConfig {
  hermes_path?: string;
  timeout_ms?: number;
  max_turns?: number;
}

export class HermesAdapter implements GatewayAdapter {
  private parseConfig(agent: Agent): HermesConfig {
    try {
      return JSON.parse(agent.connection_config) as HermesConfig;
    } catch {
      return {};
    }
  }

  async *sendMessage(
    agent: Agent,
    message: AgentMessage,
    signal?: AbortSignal,
  ): AsyncIterable<AgentResponseChunk> {
    const config = this.parseConfig(agent);
    const pythonPath = config.hermes_path || `${process.env.HOME}/.hermes/hermes-agent/venv/bin/python`;
    const timeout = config.timeout_ms || 60000;

    // Build the query with conversation context
    let query = message.content;
    if (message.history.length > 0) {
      const recentHistory = message.history.slice(-6);
      const contextLines = recentHistory.map((h) =>
        `${h.role === "user" ? "User" : "Assistant"}: ${h.content.slice(0, 500)}`,
      );
      query = `[Previous context]\n${contextLines.join("\n")}\n\n[Current message]\n${message.content}`;
    }

    const args = [
      "-m", "hermes_cli.main",
      "chat",
      "-q", query,
      "--quiet",
      "--source", "agenthub",
    ];

    if (config.max_turns) {
      args.push("--max-turns", config.max_turns.toString());
    }

    try {
      const result = await new Promise<string>((resolve, reject) => {
        let output = "";
        let errorOutput = "";
        let killed = false;

        const proc = spawn(pythonPath, args, {
          cwd: process.env.HOME,
          env: getChildProcessEnv(),
          timeout,
        });

        if (signal) {
          const abortHandler = () => { killed = true; proc.kill("SIGTERM"); };
          signal.addEventListener("abort", abortHandler, { once: true });
        }

        proc.stdout.on("data", (data: Buffer) => { output += data.toString(); });
        proc.stderr.on("data", (data: Buffer) => { errorOutput += data.toString(); });

        proc.on("close", (code) => {
          if (killed) reject(new Error("Aborted"));
          else if (code !== 0 && !output) reject(new Error(`Hermes exited with code ${code}: ${errorOutput.slice(0, 200)}`));
          else resolve(output);
        });

        proc.on("error", (err) => reject(new Error(`Failed to spawn Hermes: ${err.message}`)));
      });

      // Parse: Hermes wraps response in a box, extract the actual content
      const cleaned = extractHermesResponse(result);
      const content = cleaned || result.trim() || "No response from Hermes.";

      // Stream in chunks for natural feel
      const words = content.split(" ");
      const chunkSize = 3;
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join(" ");
        const suffix = i + chunkSize < words.length ? " " : "";
        yield { type: "content", content: chunk + suffix };
        await new Promise((r) => setTimeout(r, 15));
      }

      yield { type: "done" };
    } catch (err) {
      yield { type: "error", error: err instanceof Error ? err.message : "Hermes communication failed" };
      yield { type: "done" };
    }
  }

  async healthCheck(agent: Agent): Promise<HealthCheckResponse> {
    const config = this.parseConfig(agent);
    const pythonPath = config.hermes_path || `${process.env.HOME}/.hermes/hermes-agent/venv/bin/python`;

    try {
      const startTime = Date.now();
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(pythonPath, ["-m", "hermes_cli.main", "status"], {
          cwd: process.env.HOME,
          env: getChildProcessEnv(),
          timeout: 10000,
        });
        let output = "";
        proc.stdout.on("data", (d: Buffer) => { output += d.toString(); });
        proc.on("close", (code) => {
          if (code === 0 || output.includes("running") || output.includes("Gateway")) resolve();
          else reject(new Error("Hermes not running"));
        });
        proc.on("error", reject);
      });
      return { status: "ok", agent_name: agent.name, latency_ms: Date.now() - startTime };
    } catch {
      return { status: "error", agent_name: agent.name };
    }
  }
}

function extractHermesResponse(raw: string): string {
  const lines = raw.split("\n");
  const contentLines: string[] = [];
  let inContent = false;

  for (const line of lines) {
    // Skip Hermes box borders (Unicode box drawing characters)
    if (/^[\u2500-\u257F]/.test(line.trim())) continue;
    // Skip session_id line
    if (line.trim().startsWith("session_id:")) continue;
    // Skip empty lines at start
    if (!inContent && line.trim() === "") continue;

    if (line.trim()) {
      inContent = true;
      contentLines.push(line);
    } else if (inContent) {
      contentLines.push(line);
    }
  }

  return contentLines.join("\n").trim();
}

const hermesMeta: AdapterMeta = {
  type: "hermes",
  displayName: "Hermes Agent",
  description: "Local Hermes Agent via CLI. Uses hermes chat command for programmatic interaction.",
  defaultUrl: "cli://hermes",
  configFields: [
    {
      key: "hermes_path",
      label: "Python Path",
      type: "string",
      required: false,
      placeholder: "~/.hermes/hermes-agent/venv/bin/python",
      description: "Path to the Hermes Python interpreter",
    },
    {
      key: "max_turns",
      label: "Max Turns",
      type: "number",
      required: false,
      placeholder: "30",
      description: "Maximum tool-calling iterations per turn",
    },
    {
      key: "timeout_ms",
      label: "Timeout (ms)",
      type: "number",
      required: false,
      placeholder: "60000",
      description: "Maximum time to wait for a response",
    },
  ],
  capabilities: {
    streaming: false,
    toolCalls: true,
    healthCheck: true,
  },
};

registerAdapter(hermesMeta, () => new HermesAdapter());
