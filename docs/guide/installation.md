# AgentHub — Installation Guide for Agents

This guide is written **for an LLM coding agent running on the user's machine** (Claude Code, Codex, Cursor, Aider, OpenCode, Continue, etc.). It is not the human-friendly guide — that lives in the [README](../../README.md).

If you are an agent: read this whole document before running anything. Pick the right path for the user's OS, run the commands, and verify the install at the end. If anything fails, do **not** retry blindly — surface the failing command and ask the user.

---

## What you're installing

**AgentHub** is a desktop app that wraps a Next.js standalone backend in an Electron shell so the user has a single multi-agent dashboard that talks to Hermes, OpenClaw, OpenAI-compatible endpoints, WebSocket gateways, and a Mock adapter. The Electron main process spawns the Next.js server as a child via `ELECTRON_RUN_AS_NODE`, picks a free local port, healthchecks it, and loads it in a `BrowserWindow`. Data lives in the OS app-data directory by default; the path is configurable via `AGENTHUB_DATA_DIR`.

There are two upstream sources of truth:

- **GitHub release tarball** — `https://github.com/Albaloola/AgentHub/releases/latest/download/agenthub-<version>-linux-x86_64.tar.gz`
- **Git source** — `https://github.com/Albaloola/AgentHub.git` (default branch `main`)

Two AUR packages exist:

- `agenthub-bin` — installs the prebuilt tarball
- `agenthub-git` — builds from `main` each install

---

## Step 1 — Detect the OS and pick a path

Run this and parse the output:

```bash
uname -s
test -f /etc/os-release && cat /etc/os-release | grep -E '^(ID|ID_LIKE|NAME|PRETTY_NAME)='
```

| OS detection                                         | Path to follow                          |
| :--------------------------------------------------- | :-------------------------------------- |
| `ID=arch` or `ID_LIKE=arch` (Arch, EndeavourOS, etc.) | **Path A — AUR**                       |
| `ID=ubuntu`, `ID=debian`, `ID=fedora`, etc.           | **Path B — Generic Linux tarball**     |
| `Darwin`                                              | **Path C — macOS** (not yet supported) |
| `MINGW*`, `MSYS*`, `CYGWIN*`, or `Windows_NT`         | **Path D — Windows** (not yet supported)|

Do not assume; check.

---

## Path A — Arch / EndeavourOS / Manjaro / CachyOS (AUR)

### A.1 Confirm the user has an AUR helper

```bash
command -v yay || command -v paru || echo "no aur helper"
```

If `no aur helper`, install one (prefer `yay`):

```bash
# Only run with explicit user consent for sudo
sudo pacman -S --needed --noconfirm git base-devel
git clone https://aur.archlinux.org/yay.git /tmp/yay-build
cd /tmp/yay-build && makepkg -si --noconfirm
```

### A.2 Install the prebuilt package

```bash
yay -S --needed --noconfirm agenthub-bin
```

This is the fast path. Pulls the prebuilt Linux x86_64 tarball, installs to `/opt/agenthub`, registers a `.desktop` entry at `/usr/share/applications/agenthub.desktop`, drops a launcher at `/usr/bin/agenthub`, and sets the `chrome-sandbox` setuid bit.

If the user explicitly wants the bleeding edge from `main` and is OK waiting for an `npm install` + `electron-builder` build (5–15 minutes, ~2 GB of disk, 1+ GB of RAM):

```bash
yay -S --needed --noconfirm agenthub-git
```

### A.3 Verify

```bash
which agenthub
agenthub --version 2>/dev/null || true
ls /opt/agenthub/agenthub
ls /usr/share/applications/agenthub.desktop
```

If all four print without errors, you're done. Tell the user they can launch from their app launcher or run `agenthub` from a terminal.

---

## Path B — Generic Linux (no AUR)

### B.1 Resolve the latest release URL

```bash
LATEST=$(curl -fsSL https://api.github.com/repos/Albaloola/AgentHub/releases/latest | \
  grep -oE '"browser_download_url": *"[^"]*linux-x86_64\.tar\.gz"' | \
  head -1 | sed 's/.*"browser_download_url": *"\([^"]*\)".*/\1/')
echo "$LATEST"
```

Bail if `LATEST` is empty — that means there is no Linux x86_64 release asset and you should fall back to **Path E — From source**.

### B.2 Download and install

Pick an install prefix (`/opt/agenthub` if root, `~/.local/agenthub` otherwise):

```bash
if [ "$(id -u)" = "0" ]; then
  PREFIX=/opt/agenthub
else
  PREFIX=$HOME/.local/agenthub
fi

mkdir -p "$PREFIX"
curl -fsSL "$LATEST" | tar -xz -C "$(dirname "$PREFIX")"
mv "$(dirname "$PREFIX")/linux-unpacked" "$PREFIX"
```

### B.3 Set the chrome-sandbox setuid bit (system install only)

The Electron sandbox needs setuid root to spawn renderers. Skip this if the user is installing under their home directory and is OK passing `--no-sandbox`.

```bash
sudo chown root:root "$PREFIX/chrome-sandbox"
sudo chmod 4755 "$PREFIX/chrome-sandbox"
```

### B.4 Add a launcher and desktop entry

```bash
mkdir -p "$HOME/.local/bin" "$HOME/.local/share/applications"
ln -sf "$PREFIX/agenthub" "$HOME/.local/bin/agenthub"

cat > "$HOME/.local/share/applications/agenthub.desktop" <<EOF
[Desktop Entry]
Name=AgentHub
GenericName=Multi-agent conversation hub
Comment=Chat with multiple AI agents side by side
Exec=$HOME/.local/bin/agenthub %U
Icon=$PREFIX/resources/app/public/globe.svg
Terminal=false
Type=Application
Categories=Development;Utility;Network;Chat;
StartupWMClass=AgentHub
EOF

update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
```

### B.5 Verify

```bash
test -x "$PREFIX/agenthub" && echo "binary OK"
test -f "$PREFIX/resources/app/server.js" && echo "backend OK"
test -f "$PREFIX/resources/app/node_modules/better-sqlite3/build/Release/better_sqlite3.node" && echo "sqlite OK"
"$PREFIX/agenthub" --version 2>/dev/null || true
```

If all three checks print, you're done. The user can launch via their app launcher or `agenthub` if `~/.local/bin` is on `$PATH`.

---

## Path C — macOS

Not yet supported. The packaging config is scaffolded in `electron-builder.yml` (`mac.category`, `mac.hardenedRuntime: true`) but no signed `.dmg` is published. Tell the user:

> AgentHub doesn't ship a macOS build yet. You can build it from source (`Path E`), but it will be unsigned and Gatekeeper will require you to right-click → Open the first launch.

If the user insists on a build, follow **Path E** with `electron-builder --mac --dir` and warn them about Gatekeeper.

---

## Path D — Windows

Not yet supported. `electron-builder.yml` declares `win.target: nsis` but no signed installer is published. Tell the user the same as macOS — point them at **Path E**.

---

## Path E — From source (any OS, any architecture)

Use this only when none of the prebuilt paths apply.

### E.1 Prerequisites

```bash
node --version  # require >= 20
npm --version
git --version
```

If Node is older than 20, instruct the user to install a current version via their package manager (`pacman`, `apt`, `dnf`, `brew`, `nvm`, etc.). Do not silently install Node yourself.

### E.2 Clone and install

```bash
git clone https://github.com/Albaloola/AgentHub.git
cd AgentHub
npm install
```

The `postinstall` hook runs `electron-rebuild` against `better-sqlite3`. If this step fails (offline, missing build tools), tell the user — do not retry.

### E.3 Build the standalone backend and the Electron main process

```bash
npm run desktop:build
```

This is the slowest step — typically 2–5 minutes on a modern laptop. It runs `next build --webpack`, copies `public/` and `.next/static/` into `.next/standalone/`, then compiles the Electron main process TypeScript to `dist/desktop/`.

### E.4 Package or run unpackaged

To produce a packaged tree under `release/linux-unpacked/`:

```bash
npx electron-builder --linux --dir
```

To run without packaging (faster smoke test):

```bash
npm run desktop:start
```

### E.5 Verify

Whichever path you took:

```bash
# Packaged
test -x ./release/linux-unpacked/agenthub && \
  test -f ./release/linux-unpacked/resources/app/server.js && \
  echo "OK"

# Unpackaged dev start
# (already verified by desktop:start opening a window — if it didn't, surface the error)
```

---

## Troubleshooting

### "GPU process isn't usable"

Hyprland / Wayland with proprietary NVIDIA: try

```bash
agenthub --disable-gpu
```

If that works, suggest the user add `--disable-gpu` to their `.desktop` file's `Exec=` line.

### "chrome-sandbox is not setuid root"

Either run with `--no-sandbox` (less secure):

```bash
agenthub --no-sandbox
```

Or fix the bit:

```bash
sudo chown root:root /opt/agenthub/chrome-sandbox
sudo chmod 4755 /opt/agenthub/chrome-sandbox
```

### "Cannot find module 'electron-log/main'"

You hit an outdated build. `electron-log` lives in `dependencies` (not `devDependencies`) starting from PR #2 — `npm install` and rebuild.

### "Module did not self-register" / "NODE_MODULE_VERSION mismatch"

`better-sqlite3` is compiled against the wrong runtime. Inside the source tree:

```bash
npx electron-rebuild -w better-sqlite3
```

If you're running web/dev mode and it fails the other way (Electron-built `.node` under system Node):

```bash
npm rebuild better-sqlite3
```

You can only have one binding active at a time — pick the mode you're in.

### Backend never becomes ready

Look at the log. On Linux it's at `~/.config/agenthub/logs/main.log`. Tail it and surface the last 30 lines to the user; the most common causes are port collisions and the GPU process bailout.

```bash
tail -n 30 ~/.config/agenthub/logs/main.log 2>/dev/null
```

---

## Uninstall

### Path A — AUR

```bash
yay -Rns agenthub-bin   # or agenthub-git
```

### Path B — Manual install under `/opt`

```bash
sudo rm -rf /opt/agenthub
sudo rm -f /usr/bin/agenthub /usr/share/applications/agenthub.desktop
```

### Path B — Manual install under `~/.local`

```bash
rm -rf ~/.local/agenthub
rm -f ~/.local/bin/agenthub ~/.local/share/applications/agenthub.desktop
```

### Wiping user data

Data lives in `~/.config/agenthub/` on Linux (XDG_CONFIG_HOME) by default, or wherever the user pointed `AGENTHUB_DATA_DIR`. Confirm with the user before touching it — this includes their conversation history, custom agents, personas, and prompt versions.

```bash
# Only after explicit confirmation
rm -rf ~/.config/agenthub
```

---

## Verification checklist (run after every install)

Tick each one. If any fails, do not declare the install successful.

- [ ] `agenthub` is on the user's `$PATH`
- [ ] `agenthub --version` exits 0 (or at least does not crash)
- [ ] The `.desktop` file is in either `/usr/share/applications/` or `~/.local/share/applications/`
- [ ] First launch produces `~/.config/agenthub/agenthub.db`, `agenthub.db-shm`, `agenthub.db-wal` (this is the SQLite database being created)
- [ ] First launch creates `~/.config/agenthub/logs/main.log` and writes to it
- [ ] `curl -sS http://127.0.0.1:<discovered-port>/` returns 200 once the window is open (port is logged in `main.log`)

If any verification step fails, tell the user **what** failed (with the command output) and ask before doing anything else. Don't loop.
