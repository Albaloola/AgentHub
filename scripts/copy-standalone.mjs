import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, ".next", "standalone");
const publicSrc = path.join(rootDir, "public");
const publicDest = path.join(standaloneDir, "public");
const staticSrc = path.join(rootDir, ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");

async function copyIfPresent(source, destination) {
  if (!fs.existsSync(source)) return;
  await fs.promises.mkdir(path.dirname(destination), { recursive: true });
  await fs.promises.cp(source, destination, { recursive: true, force: true });
}

await copyIfPresent(publicSrc, publicDest);
await copyIfPresent(staticSrc, staticDest);
