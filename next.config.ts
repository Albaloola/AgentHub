import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Force Next.js to use this directory as the tracing root regardless of
  // where lockfiles live in parent directories. Without this, running from a
  // git worktree (or any nested checkout under another Node project) causes
  // Next to bury the standalone server under a nested path mirroring the
  // relative location, which breaks both `desktop:build-next` and the
  // Electron backend spawn path resolution.
  outputFileTracingRoot: path.resolve(__dirname),
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
