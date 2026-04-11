#!/bin/bash
# Capture screenshots of AgentHub pages using Playwright CLI (headless)
set -e

BASE="${1:-http://localhost:3000}"
OUT="docs/screenshots"
mkdir -p "$OUT"

take_shot() {
  local path="$1" name="$2"
  echo "  Capturing $name ($path)..."
  npx playwright screenshot \
    "--viewport-size=1440,900" \
    "--wait-for-timeout=2000" \
    "${BASE}${path}" \
    "${OUT}/${name}.png" > /dev/null 2>&1
  echo "    done: ${OUT}/${name}.png"
}

echo "Taking AgentHub screenshots (headless)..."
echo ""

take_shot "/"            "dashboard"
take_shot "/agents"      "agents"
take_shot "/settings"    "settings"
take_shot "/workflows"   "workflows"
take_shot "/arena"       "arena"
take_shot "/traces"      "traces"
take_shot "/analytics"   "analytics"
take_shot "/knowledge"   "knowledge"
take_shot "/personas"    "personas"
take_shot "/fleet"       "fleet"
take_shot "/playground"  "playground"
take_shot "/guardrails"  "guardrails"

echo ""
echo "All screenshots saved to $OUT/"
