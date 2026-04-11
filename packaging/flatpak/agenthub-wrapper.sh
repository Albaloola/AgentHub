#!/bin/sh
# Wrapper script for Flatpak — starts the Next.js server and opens the Electron window
export DATABASE_PATH="${XDG_DATA_HOME:-$HOME/.local/share}/agenthub/agenthub.db"
mkdir -p "$(dirname "$DATABASE_PATH")"
cd /app/lib/agenthub
exec node server.js
