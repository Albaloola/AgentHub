#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// --- Parse arguments ---
const args = process.argv.slice(2);
let port = 3000;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error(`Error: Invalid port "${args[i + 1]}". Must be between 1 and 65535.`);
      process.exit(1);
    }
    i++;
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log(`
  AgentHub - AI Agent Orchestration Hub

  Usage: agenthub [options]

  Options:
    --port <number>   Port to listen on (default: 3000)
    --help, -h        Show this help message

  Examples:
    agenthub
    agenthub --port 8080
    npx agenthub --port 4000
`);
    process.exit(0);
  }
}

// --- Locate the standalone server ---
const standalonePath = resolve(ROOT, ".next", "standalone", "server.js");
const hasStandalone = existsSync(standalonePath);

console.log("");
console.log("  AgentHub");
console.log("  ────────────────────────────");
console.log(`  Starting on http://localhost:${port}`);
console.log("");

if (hasStandalone) {
  // Use the pre-built standalone Next.js output
  const child = spawn(process.execPath, [standalonePath], {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "0.0.0.0",
    },
  });

  child.on("error", (err) => {
    console.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
} else {
  // Fallback: use npx next start
  console.log("  (standalone build not found, falling back to next start)");
  console.log("");

  const child = spawn("npx", ["next", "start", "--port", String(port)], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      PORT: String(port),
    },
  });

  child.on("error", (err) => {
    console.error(`Failed to start server: ${err.message}`);
    console.error("Make sure 'next' is installed: npm install next");
    process.exit(1);
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}
