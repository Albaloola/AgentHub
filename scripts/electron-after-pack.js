"use strict";

const fs = require("fs");
const path = require("path");

/**
 * electron-builder afterPack hook.
 *
 * Problem: extraResources copies `.next/standalone` into `resources/app` but
 * strips the nested `node_modules/` subdirectory because electron-builder
 * applies its own node_modules filtering regardless of the glob filter.
 * Without those modules the packaged standalone server cannot resolve
 * `require("next")` and the backend fails to start.
 *
 * Fix: after electron-builder has placed the rest of the standalone, we
 * copy the standalone's `node_modules/` tree into place ourselves. Also
 * copy `.next/` explicitly as a belt-and-braces guard, since the same
 * filtering can strip parts of it on some versions.
 */
module.exports = async function afterPack(context) {
  const appOutDir = context.appOutDir;
  const resourcesDir = path.join(appOutDir, "resources");
  const destAppDir = path.join(resourcesDir, "app");
  const standaloneRoot = path.resolve(context.packager.info.projectDir, ".next", "standalone");

  if (!fs.existsSync(standaloneRoot)) {
    throw new Error(
      `[after-pack] .next/standalone does not exist at ${standaloneRoot}; did desktop:build-next run?`,
    );
  }

  const entriesToCopy = ["node_modules", ".next", "public", "server.js", "package.json"];

  for (const entry of entriesToCopy) {
    const src = path.join(standaloneRoot, entry);
    const dst = path.join(destAppDir, entry);
    if (!fs.existsSync(src)) continue;
    await fs.promises.rm(dst, { recursive: true, force: true });
    await fs.promises.cp(src, dst, { recursive: true, force: true, dereference: true });
  }

  // eslint-disable-next-line no-console
  console.log(`[after-pack] copied standalone tree into ${destAppDir}`);
};
